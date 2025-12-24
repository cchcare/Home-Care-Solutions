import { Express, RequestHandler } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";

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
}

export const isAuthenticated: RequestHandler = (req: any, res, next) => {
  if (req.session?.user) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};
