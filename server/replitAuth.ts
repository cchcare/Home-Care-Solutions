import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

// Allowed email domains for new Google sign-ups
const ALLOWED_SIGNUP_DOMAINS = ["carechc.com", "rgshomecare.com"];

function isEmailDomainAllowed(email: string): boolean {
  if (!email) return false;
  const domain = email.toLowerCase().split("@")[1];
  return ALLOWED_SIGNUP_DOMAINS.includes(domain);
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
  dbUser?: any
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
  // Store database user info in session for local auth compatibility
  if (dbUser) {
    user.id = dbUser.id;
    user.role = dbUser.role;
    user.primaryOfficeId = dbUser.primaryOfficeId;
    user.organizationId = dbUser.organizationId;
  }
}

async function handleGoogleSignIn(claims: any): Promise<{ user: any; error?: string }> {
  const email = claims["email"];
  const googleId = claims["sub"];
  const emailVerified = claims["email_verified"];
  
  if (!email) {
    return { user: null, error: "No email provided by Google" };
  }

  // Security: Only allow verified email addresses
  if (!emailVerified) {
    console.log(`[Google Auth] Rejected unverified email: ${email}`);
    return { user: null, error: "Your Google email address must be verified to sign in" };
  }

  // Normalize email to lowercase for consistent matching
  const normalizedEmail = email.toLowerCase();

  // Check if user already exists by email (case-insensitive)
  const existingUser = await storage.getUserByEmail(normalizedEmail);
  
  if (existingUser) {
    // Existing user - link their Google account if not already linked
    if (!existingUser.googleId) {
      await storage.linkGoogleAccount(existingUser.id, googleId);
      console.log(`[Google Auth] Linked Google account for existing user: ${normalizedEmail}`);
    }
    return { user: existingUser };
  }
  
  // New user - check if email domain is allowed
  if (!isEmailDomainAllowed(normalizedEmail)) {
    console.log(`[Google Auth] Rejected sign-up from unauthorized domain: ${normalizedEmail}`);
    return { 
      user: null, 
      error: `Sign-up is only allowed for users with email addresses from: ${ALLOWED_SIGNUP_DOMAINS.join(", ")}` 
    };
  }
  
  // Create new user with Google account
  const newUser = await storage.createGoogleUser({
    email: normalizedEmail,
    firstName: claims["first_name"] || "",
    lastName: claims["last_name"] || "",
    profileImageUrl: claims["profile_image_url"],
    googleId: googleId,
  });
  
  console.log(`[Google Auth] Created new user via Google sign-up: ${normalizedEmail}`);
  return { user: newUser };
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      const claims = tokens.claims();
      const { user: dbUser, error } = await handleGoogleSignIn(claims);
      
      if (error || !dbUser) {
        return verified(new Error(error || "Authentication failed"), undefined);
      }
      
      const sessionUser = {};
      updateUserSession(sessionUser, tokens, dbUser);
      verified(null, sessionUser);
    } catch (err) {
      console.error("[Google Auth] Error during authentication:", err);
      verified(err as Error, undefined);
    }
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Google sign-in endpoint (via Replit Auth which supports Google)
  app.get("/api/auth/google", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  // Legacy login endpoint (redirects to Google auth)
  app.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/auth?error=google_auth_failed",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
