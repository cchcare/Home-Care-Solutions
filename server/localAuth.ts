import { Express, RequestHandler } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import crypto from "crypto";
import * as client from "openid-client";
import memoize from "memoizee";
import { storage } from "./storage";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { sendEmail, sendSMS, formatPhoneNumber, isValidPhone } from "./communication-services";
import { sendTemplatedEmail } from "./agentmail";

// Allowed email domains for new Google sign-ups
const ALLOWED_SIGNUP_DOMAINS = ["carechc.com", "rgshomecare.com"];

function isEmailDomainAllowed(email: string): boolean {
  if (!email) return false;
  const domain = email.toLowerCase().split("@")[1];
  return ALLOWED_SIGNUP_DOMAINS.includes(domain);
}

// Memoized OIDC configuration for Google auth via Replit
const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

// SMS code rate limiting
const smsAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_SMS_ATTEMPTS = 3;
const SMS_LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const SMS_CODE_EXPIRY = 5 * 60 * 1000; // 5 minutes

function generateSmsCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isSmsLockedOut(identifier: string): boolean {
  const attempts = smsAttempts.get(identifier);
  if (!attempts) return false;
  
  if (attempts.count >= MAX_SMS_ATTEMPTS) {
    const timeSinceLast = Date.now() - attempts.lastAttempt;
    if (timeSinceLast < SMS_LOCKOUT_DURATION) {
      return true;
    }
    smsAttempts.delete(identifier);
  }
  return false;
}

function recordSmsAttempt(identifier: string): void {
  const attempts = smsAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
  attempts.count += 1;
  attempts.lastAttempt = Date.now();
  smsAttempts.set(identifier, attempts);
}

function clearSmsAttempts(identifier: string): void {
  smsAttempts.delete(identifier);
}

const SALT_ROUNDS = 12;
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

// Rate limiting for login attempts
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function isLockedOut(identifier: string): boolean {
  const attempts = loginAttempts.get(identifier);
  if (!attempts) return false;
  
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    const timeSinceLast = Date.now() - attempts.lastAttempt;
    if (timeSinceLast < LOCKOUT_DURATION) {
      return true;
    }
    // Reset after lockout period
    loginAttempts.delete(identifier);
  }
  return false;
}

function recordFailedAttempt(identifier: string): void {
  const attempts = loginAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
  attempts.count += 1;
  attempts.lastAttempt = Date.now();
  loginAttempts.set(identifier, attempts);
}

function clearLoginAttempts(identifier: string): void {
  loginAttempts.delete(identifier);
}

export async function setupAuth(app: Express) {
  const PgSession = connectPgSimple(session);
  
  const sessionSettings: session.SessionOptions = {
    store: new PgSession({
      pool,
      tableName: "sessions",
      createTableIfMissing: false,
    }),
    secret: process.env.SESSION_SECRET || "homecare-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));

  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const identifier = username.toLowerCase();
      
      // Check for lockout
      if (isLockedOut(identifier)) {
        return res.status(429).json({ 
          message: "Too many failed login attempts. Please try again in 15 minutes." 
        });
      }

      // Find user by username or email
      const user = await storage.getUserByUsernameOrEmail(identifier);
      
      if (!user || !user.passwordHash) {
        recordFailedAttempt(identifier);
        return res.status(401).json({ message: "Invalid username or password" });
      }

      if (!user.isActive) {
        return res.status(401).json({ message: "Account is disabled. Contact your administrator." });
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      
      if (!isValid) {
        recordFailedAttempt(identifier);
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Clear failed attempts on successful login
      clearLoginAttempts(identifier);

      // Update last login
      await storage.updateUserLastLogin(user.id);

      // Regenerate session to prevent fixation
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ message: "Login failed" });
        }

        // Store user info in session (exclude sensitive data)
        (req.session as any).user = {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          primaryOfficeId: user.primaryOfficeId,
          profileImageUrl: user.profileImageUrl,
          mustResetPassword: user.mustResetPassword,
        };

        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            return res.status(500).json({ message: "Login failed" });
          }
          
          res.json({
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            primaryOfficeId: user.primaryOfficeId,
            profileImageUrl: user.profileImageUrl,
            mustResetPassword: user.mustResetPassword,
          });
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "An error occurred during login" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  // Change password endpoint
  app.post("/api/auth/change-password", isAuthenticated, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.session.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new passwords are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.passwordHash) {
        return res.status(404).json({ message: "User not found" });
      }

      const isValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }

      const newHash = await hashPassword(newPassword);
      await storage.updateUserPassword(userId, newHash);

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Reset password (by admin/manager for a user)
  app.post("/api/auth/reset-password/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { newPassword } = req.body;
      const currentUser = req.session.user;

      if (!currentUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Only admins and office managers can reset passwords
      const allowedRoles = ["super_admin", "admin", "office_admin"];
      if (!allowedRoles.includes(currentUser.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Office admins can only reset users in their office
      if (currentUser.role === "office_admin" && targetUser.primaryOfficeId !== currentUser.primaryOfficeId) {
        return res.status(403).json({ message: "Cannot reset password for users outside your office" });
      }

      // Prevent resetting super_admin password by non-super_admins
      if (targetUser.role === "super_admin" && currentUser.role !== "super_admin") {
        return res.status(403).json({ message: "Cannot reset super admin password" });
      }

      const hash = await hashPassword(newPassword);
      await storage.updateUserPassword(userId, hash, true); // Set mustResetPassword = true

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Forgot password - request reset token via email
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Find user by email (we check email specifically, not username)
      const user = await storage.getUserByUsernameOrEmail(email.toLowerCase());

      // Always return success to prevent email enumeration attacks
      if (!user || !user.email) {
        return res.json({ 
          message: "If an account with that email exists, a reset link has been sent." 
        });
      }

      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

      // Store token in database
      await storage.setUserResetToken(user.id, resetToken, tokenExpiry);

      // Build reset URL from request origin
      const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
      const host = req.headers["x-forwarded-host"] || req.headers.host || req.hostname;
      const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

      // Fallback email content
      const fallbackHtml = `
        <h2>Password Reset Request</h2>
        <p>Hello ${user.firstName || user.username || "User"},</p>
        <p>You requested to reset your password. Click the link below to set a new password:</p>
        <p><a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background-color:#0066cc;color:white;text-decoration:none;border-radius:4px;">Reset Password</a></p>
        <p>Or copy this link: ${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email.</p>
        <p>- CCHC Solutions Team</p>
      `;
      const fallbackText = `Password Reset Request\n\nHello ${user.firstName || user.username || "User"},\n\nYou requested to reset your password. Visit this link to set a new password:\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not request this, please ignore this email.\n\n- CCHC Solutions Team`;

      // Send email using template system (with fallback)
      const emailResult = await sendTemplatedEmail(
        user.email,
        "password_reset",
        {
          firstName: user.firstName || user.username || "User",
          resetUrl: resetUrl,
          expiryTime: "1 hour",
          companyName: "CCHC Solutions",
          currentYear: new Date().getFullYear().toString(),
        },
        "CCHC Solutions - Password Reset Request",
        fallbackHtml,
        fallbackText
      );

      if (!emailResult.success) {
        console.error("Failed to send password reset email");
        // Still return success to prevent enumeration
      }

      res.json({ 
        message: "If an account with that email exists, a reset link has been sent." 
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Reset password using token
  app.post("/api/auth/reset-password-token", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      // Find user by reset token (also checks expiry)
      const user = await storage.getUserByResetToken(token);

      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Hash new password and update user
      const passwordHash = await hashPassword(newPassword);
      await storage.updateUserPassword(user.id, passwordHash, false);

      // Clear the reset token
      await storage.clearUserResetToken(user.id);

      res.json({ message: "Password has been reset successfully. You can now log in." });
    } catch (error) {
      console.error("Reset password token error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Validate reset token (check if token is valid before showing form)
  app.get("/api/auth/validate-reset-token", async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== "string") {
        return res.status(400).json({ valid: false, message: "Token is required" });
      }

      const user = await storage.getUserByResetToken(token);

      if (!user) {
        return res.json({ valid: false, message: "Invalid or expired reset token" });
      }

      res.json({ valid: true });
    } catch (error) {
      console.error("Validate token error:", error);
      res.status(500).json({ valid: false, message: "Failed to validate token" });
    }
  });

  // ========== SMS Mobile Login Routes ==========

  // Send verification code to verify a phone number (for logged-in users)
  app.post("/api/auth/sms/send-verification", isAuthenticated, async (req: any, res) => {
    try {
      const { phone } = req.body;
      const userId = req.session.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      if (!isValidPhone(phone)) {
        return res.status(400).json({ message: "Invalid phone number format" });
      }

      const formattedPhone = formatPhoneNumber(phone);

      if (isSmsLockedOut(formattedPhone)) {
        return res.status(429).json({ 
          message: "Too many SMS requests. Please try again in 15 minutes." 
        });
      }

      const code = generateSmsCode();
      const expiry = new Date(Date.now() + SMS_CODE_EXPIRY);

      // Store code in database
      await storage.setUserSmsCode(userId, code, expiry);
      // Store pending phone number temporarily (we don't verify until code is confirmed)
      await storage.updateUser(userId, { mobilePhone: formattedPhone, mobileVerified: false });

      // Send SMS
      const smsResult = await sendSMS({
        to: formattedPhone,
        body: `Your Home Care verification code is: ${code}. This code expires in 5 minutes.`,
      });

      if (!smsResult.success) {
        console.error("Failed to send verification SMS:", smsResult.error);
        return res.status(500).json({ message: "Failed to send verification code" });
      }

      recordSmsAttempt(formattedPhone);
      res.json({ message: "Verification code sent", phone: formattedPhone });
    } catch (error) {
      console.error("Send verification SMS error:", error);
      res.status(500).json({ message: "Failed to send verification code" });
    }
  });

  // Verify phone number with code (for logged-in users)
  app.post("/api/auth/sms/verify-phone", isAuthenticated, async (req: any, res) => {
    try {
      const { code } = req.body;
      const userId = req.session.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (!code || code.length !== 6) {
        return res.status(400).json({ message: "6-digit code is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.smsVerificationCode || !user.smsCodeExpiry) {
        return res.status(400).json({ message: "No verification pending. Request a new code." });
      }

      if (new Date() > new Date(user.smsCodeExpiry)) {
        await storage.clearUserSmsCode(userId);
        return res.status(400).json({ message: "Verification code expired. Request a new code." });
      }

      if (user.smsVerificationCode !== code) {
        return res.status(400).json({ message: "Invalid verification code" });
      }

      // Mark phone as verified
      await storage.updateUserMobilePhone(userId, user.mobilePhone || "", true);
      clearSmsAttempts(user.mobilePhone || "");

      res.json({ message: "Phone number verified successfully", mobileVerified: true });
    } catch (error) {
      console.error("Verify phone error:", error);
      res.status(500).json({ message: "Failed to verify phone number" });
    }
  });

  // Request SMS login code (for users with verified phone - unauthenticated)
  app.post("/api/auth/sms/request-login-code", async (req, res) => {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      if (!isValidPhone(phone)) {
        return res.status(400).json({ message: "Invalid phone number format" });
      }

      const formattedPhone = formatPhoneNumber(phone);

      if (isSmsLockedOut(formattedPhone)) {
        return res.status(429).json({ 
          message: "Too many login attempts. Please try again in 15 minutes." 
        });
      }

      // Find user by verified mobile phone
      const user = await storage.getUserByMobilePhone(formattedPhone);

      // Always return success to prevent phone number enumeration
      if (!user) {
        // Fake delay to prevent timing attacks
        await new Promise(resolve => setTimeout(resolve, 500));
        return res.json({ message: "If this phone number is registered, a login code has been sent." });
      }

      const code = generateSmsCode();
      const expiry = new Date(Date.now() + SMS_CODE_EXPIRY);

      // Store login code
      await storage.setUserSmsCode(user.id, code, expiry);

      // Send SMS
      const smsResult = await sendSMS({
        to: formattedPhone,
        body: `Your Home Care login code is: ${code}. This code expires in 5 minutes.`,
      });

      if (!smsResult.success) {
        console.error("Failed to send login SMS:", smsResult.error);
        // Still return success to prevent enumeration
      }

      recordSmsAttempt(formattedPhone);
      res.json({ message: "If this phone number is registered, a login code has been sent." });
    } catch (error) {
      console.error("Request login code error:", error);
      res.status(500).json({ message: "Failed to process login request" });
    }
  });

  // Login with SMS code
  app.post("/api/auth/sms/login", async (req, res) => {
    try {
      const { phone, code } = req.body;

      if (!phone || !code) {
        return res.status(400).json({ message: "Phone number and code are required" });
      }

      if (code.length !== 6) {
        return res.status(400).json({ message: "Invalid code format" });
      }

      const formattedPhone = formatPhoneNumber(phone);

      if (isSmsLockedOut(formattedPhone)) {
        return res.status(429).json({ 
          message: "Too many failed login attempts. Please try again in 15 minutes." 
        });
      }

      // Find user by verified mobile phone
      const user = await storage.getUserByMobilePhone(formattedPhone);

      if (!user) {
        recordSmsAttempt(formattedPhone);
        return res.status(401).json({ message: "Invalid phone number or code" });
      }

      if (!user.smsVerificationCode || !user.smsCodeExpiry) {
        return res.status(400).json({ message: "No login code pending. Request a new code." });
      }

      if (new Date() > new Date(user.smsCodeExpiry)) {
        await storage.clearUserSmsCode(user.id);
        return res.status(400).json({ message: "Login code expired. Request a new code." });
      }

      if (user.smsVerificationCode !== code) {
        recordSmsAttempt(formattedPhone);
        return res.status(401).json({ message: "Invalid phone number or code" });
      }

      // Clear the code
      await storage.clearUserSmsCode(user.id);
      clearSmsAttempts(formattedPhone);

      // Update last login
      await storage.updateUserLastLogin(user.id);

      // Regenerate session
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ message: "Login failed" });
        }

        // Store user info in session
        (req.session as any).user = {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          primaryOfficeId: user.primaryOfficeId,
          profileImageUrl: user.profileImageUrl,
          mustResetPassword: user.mustResetPassword,
        };

        req.session.save((err) => {
          if (err) {
            console.error("Session save error:", err);
            return res.status(500).json({ message: "Login failed" });
          }
          
          res.json({
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            primaryOfficeId: user.primaryOfficeId,
            profileImageUrl: user.profileImageUrl,
            mustResetPassword: user.mustResetPassword,
          });
        });
      });
    } catch (error) {
      console.error("SMS login error:", error);
      res.status(500).json({ message: "An error occurred during login" });
    }
  });

  // Get current user's mobile verification status
  app.get("/api/auth/sms/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        mobilePhone: user.mobilePhone,
        mobileVerified: user.mobileVerified,
      });
    } catch (error) {
      console.error("Get SMS status error:", error);
      res.status(500).json({ message: "Failed to get mobile status" });
    }
  });

  // ============================================
  // Google OAuth Routes (via Replit OIDC)
  // ============================================
  
  // Helper to get base URL respecting proxy headers
  function getBaseUrl(req: any): string {
    const protocol = req.get("x-forwarded-proto") || req.protocol || "https";
    const host = req.get("x-forwarded-host") || req.get("host") || req.hostname;
    return `${protocol}://${host}`;
  }

  // Initiate Google sign-in
  app.get("/api/auth/google", async (req, res) => {
    try {
      const config = await getOidcConfig();
      const baseUrl = getBaseUrl(req);
      const redirectUri = `${baseUrl}/api/auth/google/callback`;
      
      // Generate and store state for CSRF protection
      const state = crypto.randomBytes(16).toString("hex");
      (req.session as any).googleOAuthState = state;
      (req.session as any).googleRedirectUri = redirectUri; // Store for callback
      
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      const authUrl = client.buildAuthorizationUrl(config, {
        redirect_uri: redirectUri,
        scope: "openid email profile",
        state: state,
      });
      
      res.redirect(authUrl.href);
    } catch (error) {
      console.error("[Google Auth] Error initiating OAuth:", error);
      res.redirect("/?error=google_auth_failed");
    }
  });
  
  // Google OAuth callback
  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const config = await getOidcConfig();
      const baseUrl = getBaseUrl(req);
      const redirectUri = (req.session as any).googleRedirectUri || `${baseUrl}/api/auth/google/callback`;
      
      // Verify state to prevent CSRF
      const state = req.query.state as string;
      const storedState = (req.session as any).googleOAuthState;
      
      if (!state || state !== storedState) {
        console.error("[Google Auth] State mismatch - possible CSRF attack");
        return res.redirect("/?error=invalid_state");
      }
      
      // Clear the stored state
      delete (req.session as any).googleOAuthState;
      delete (req.session as any).googleRedirectUri;
      
      // Exchange authorization code for tokens
      const currentUrl = new URL(`${baseUrl}${req.url}`);
      const tokens = await client.authorizationCodeGrant(config, currentUrl, {
        expectedState: state,
        redirect_uri: redirectUri,
      });
      
      const claims = tokens.claims();
      const email = claims.email as string | undefined;
      const emailVerified = claims.email_verified;
      const googleId = claims.sub;
      
      if (!email) {
        console.error("[Google Auth] No email in claims");
        return res.redirect("/?error=no_email");
      }
      
      // Security: Only allow verified email addresses
      if (!emailVerified) {
        console.log(`[Google Auth] Rejected unverified email: ${email}`);
        return res.redirect("/?error=email_not_verified");
      }
      
      const normalizedEmail = email.toLowerCase();
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(normalizedEmail);
      
      let user;
      if (existingUser) {
        // Link Google account if not already linked
        if (!existingUser.googleId) {
          await storage.linkGoogleAccount(existingUser.id, googleId);
          console.log(`[Google Auth] Linked Google account for: ${normalizedEmail}`);
        }
        user = existingUser;
      } else {
        // New user - check domain restriction
        if (!isEmailDomainAllowed(normalizedEmail)) {
          console.log(`[Google Auth] Rejected unauthorized domain: ${normalizedEmail}`);
          return res.redirect(`/?error=unauthorized_domain`);
        }
        
        // Create new user
        user = await storage.createGoogleUser({
          email: normalizedEmail,
          firstName: (claims.given_name as string) || (claims.first_name as string) || "",
          lastName: (claims.family_name as string) || (claims.last_name as string) || "",
          profileImageUrl: claims.picture as string,
          googleId: googleId,
        });
        console.log(`[Google Auth] Created new user: ${normalizedEmail}`);
      }
      
      if (!user.isActive) {
        return res.redirect("/?error=account_disabled");
      }
      
      // Update last login
      await storage.updateUserLastLogin(user.id);
      
      // Create session (same as local login)
      req.session.regenerate((err) => {
        if (err) {
          console.error("[Google Auth] Session regeneration error:", err);
          return res.redirect("/?error=session_error");
        }
        
        (req.session as any).user = {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          primaryOfficeId: user.primaryOfficeId,
          profileImageUrl: user.profileImageUrl,
          mustResetPassword: false, // Google users don't have passwords
        };
        
        req.session.save((err) => {
          if (err) {
            console.error("[Google Auth] Session save error:", err);
            return res.redirect("/?error=session_error");
          }
          res.redirect("/");
        });
      });
    } catch (error) {
      console.error("[Google Auth] Callback error:", error);
      res.redirect("/?error=google_auth_failed");
    }
  });
}

export const isAuthenticated: RequestHandler = (req: any, res, next) => {
  if (req.session?.user) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};
