import { Express, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { storage } from "./storage";

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "mobile-app-secret-key";
const JWT_EXPIRY = "7d";

interface JwtPayload {
  caregiverId: string;
  email: string;
  role: string;
}

interface AuthenticatedRequest extends Request {
  caregiver?: {
    id: string;
    email: string;
    role: string;
  };
}

function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

async function mobileAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ 
      error: "unauthorized",
      message: "Missing or invalid Authorization header. Use: Bearer <token>" 
    });
  }
  
  const token = authHeader.substring(7);
  const payload = verifyToken(token);
  
  if (!payload) {
    return res.status(401).json({ 
      error: "invalid_token",
      message: "Invalid or expired token. Please login again." 
    });
  }
  
  const caregiver = await storage.getCaregiver(payload.caregiverId);
  if (!caregiver) {
    return res.status(401).json({ 
      error: "caregiver_not_found",
      message: "Caregiver account not found" 
    });
  }
  
  if (caregiver.isActive === false) {
    return res.status(403).json({ 
      error: "account_inactive",
      message: "Your account is not active. Please contact your administrator." 
    });
  }
  
  req.caregiver = {
    id: payload.caregiverId,
    email: payload.email,
    role: payload.role
  };
  
  next();
}

export function setupMobileApi(app: Express) {
  app.post("/api/mobile/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ 
          error: "missing_credentials",
          message: "Email and password are required" 
        });
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      
      const user = await storage.getUserByEmail(normalizedEmail);
      
      if (!user) {
        return res.status(401).json({ 
          error: "invalid_credentials",
          message: "Invalid email or password" 
        });
      }
      
      if (!user.passwordHash) {
        return res.status(401).json({ 
          error: "no_password",
          message: "This account uses Google sign-in. Please set a password in the web app first." 
        });
      }
      
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      
      if (!isValidPassword) {
        return res.status(401).json({ 
          error: "invalid_credentials",
          message: "Invalid email or password" 
        });
      }
      
      const caregiver = await storage.getCaregiverByEmail(normalizedEmail);
      
      if (!caregiver) {
        return res.status(403).json({ 
          error: "not_caregiver",
          message: "This account is not registered as a caregiver" 
        });
      }
      
      if (caregiver.isActive === false) {
        return res.status(403).json({ 
          error: "account_inactive",
          message: "Your caregiver account is not active. Please contact your administrator." 
        });
      }
      
      const token = generateToken({
        caregiverId: caregiver.id,
        email: normalizedEmail,
        role: "caregiver"
      });
      
      await storage.updateUserLastLogin(user.id);
      
      res.json({
        success: true,
        token,
        caregiver: {
          id: caregiver.id,
          firstName: caregiver.firstName,
          lastName: caregiver.lastName,
          email: caregiver.email,
          phone: caregiver.phone,
          officeId: caregiver.officeId,
          isActive: caregiver.isActive,
          hhaxCaregiverCode: caregiver.hhaxCaregiverCode
        }
      });
    } catch (error) {
      console.error("[Mobile API] Login error:", error);
      res.status(500).json({ 
        error: "server_error",
        message: "Login failed. Please try again." 
      });
    }
  });

  app.get("/api/mobile/auth/me", mobileAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const caregiver = await storage.getCaregiver(req.caregiver!.id);
      
      if (!caregiver) {
        return res.status(404).json({ 
          error: "not_found",
          message: "Caregiver not found" 
        });
      }
      
      res.json({
        id: caregiver.id,
        firstName: caregiver.firstName,
        lastName: caregiver.lastName,
        email: caregiver.email,
        phone: caregiver.phone,
        officeId: caregiver.officeId,
        isActive: caregiver.isActive,
        hhaxCaregiverCode: caregiver.hhaxCaregiverCode,
      });
    } catch (error) {
      console.error("[Mobile API] Get profile error:", error);
      res.status(500).json({ 
        error: "server_error",
        message: "Failed to fetch profile" 
      });
    }
  });

  app.get("/api/mobile/schedules", mobileAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const caregiverId = req.caregiver!.id;
      const { startDate, endDate } = req.query;
      
      const today = new Date();
      const defaultStartDate = new Date(today);
      defaultStartDate.setDate(defaultStartDate.getDate() - 7);
      const defaultEndDate = new Date(today);
      defaultEndDate.setDate(defaultEndDate.getDate() + 14);
      
      const start = startDate ? new Date(String(startDate)) : defaultStartDate;
      const end = endDate ? new Date(String(endDate)) : defaultEndDate;
      
      const schedules = await storage.getSchedulesByCaregiver(caregiverId, start, end);
      
      const schedulesWithClients = await Promise.all(
        schedules.map(async (schedule: any) => {
          let client = null;
          if (schedule.clientId) {
            client = await storage.getClient(schedule.clientId);
          }
          return {
            id: schedule.id,
            scheduledDate: schedule.scheduledDate,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            serviceType: schedule.serviceType,
            status: schedule.status,
            notes: schedule.notes,
            clockInTime: schedule.clockInTime,
            clockOutTime: schedule.clockOutTime,
            clockInLatitude: schedule.clockInLatitude,
            clockInLongitude: schedule.clockInLongitude,
            clockOutLatitude: schedule.clockOutLatitude,
            clockOutLongitude: schedule.clockOutLongitude,
            clockInDistance: schedule.clockInDistance,
            clockOutDistance: schedule.clockOutDistance,
            evvStatus: schedule.evvStatus,
            client: client ? {
              id: client.id,
              firstName: client.firstName,
              lastName: client.lastName,
              address: client.address,
              phone: client.phone,
              status: client.status
            } : null
          };
        })
      );
      
      res.json({
        schedules: schedulesWithClients,
        meta: {
          startDate: start.toISOString().split("T")[0],
          endDate: end.toISOString().split("T")[0],
          count: schedulesWithClients.length
        }
      });
    } catch (error) {
      console.error("[Mobile API] Get schedules error:", error);
      res.status(500).json({ 
        error: "server_error",
        message: "Failed to fetch schedules" 
      });
    }
  });

  app.get("/api/mobile/schedules/:id", mobileAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const caregiverId = req.caregiver!.id;
      
      const schedule = await storage.getCaregiverSchedule(id);
      
      if (!schedule) {
        return res.status(404).json({ 
          error: "not_found",
          message: "Schedule not found" 
        });
      }
      
      if (schedule.caregiverId !== caregiverId) {
        return res.status(403).json({ 
          error: "forbidden",
          message: "You don't have access to this schedule" 
        });
      }
      
      let client = null;
      if (schedule.clientId) {
        client = await storage.getClient(schedule.clientId);
      }
      
      res.json({
        id: schedule.id,
        scheduledDate: schedule.scheduledDate,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        serviceType: schedule.serviceType,
        status: schedule.status,
        notes: schedule.notes,
        clockInTime: schedule.clockInTime,
        clockOutTime: schedule.clockOutTime,
        clockInLatitude: schedule.clockInLatitude,
        clockInLongitude: schedule.clockInLongitude,
        clockOutLatitude: schedule.clockOutLatitude,
        clockOutLongitude: schedule.clockOutLongitude,
        clockInDistance: schedule.clockInDistance,
        clockOutDistance: schedule.clockOutDistance,
        evvStatus: schedule.evvStatus,
        client: client ? {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          address: client.address,
          phone: client.phone,
          status: client.status
        } : null
      });
    } catch (error) {
      console.error("[Mobile API] Get schedule error:", error);
      res.status(500).json({ 
        error: "server_error",
        message: "Failed to fetch schedule" 
      });
    }
  });

  app.post("/api/mobile/schedules/:id/clock-in", mobileAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const caregiverId = req.caregiver!.id;
      const { latitude, longitude, distance } = req.body;
      
      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ 
          error: "missing_location",
          message: "Latitude and longitude are required for clock-in" 
        });
      }
      
      const schedule = await storage.getCaregiverSchedule(id);
      
      if (!schedule) {
        return res.status(404).json({ 
          error: "not_found",
          message: "Schedule not found" 
        });
      }
      
      if (schedule.caregiverId !== caregiverId) {
        return res.status(403).json({ 
          error: "forbidden",
          message: "You don't have access to this schedule" 
        });
      }
      
      if (schedule.clockInTime) {
        return res.status(400).json({ 
          error: "already_clocked_in",
          message: "Already clocked in for this schedule",
          clockInTime: schedule.clockInTime
        });
      }
      
      const updatedSchedule = await storage.clockInWithLocation(
        id,
        String(latitude),
        String(longitude),
        distance ? String(distance) : undefined
      );
      
      res.json({
        success: true,
        message: "Successfully clocked in",
        schedule: {
          id: updatedSchedule.id,
          clockInTime: updatedSchedule.clockInTime,
          clockInLatitude: updatedSchedule.clockInLatitude,
          clockInLongitude: updatedSchedule.clockInLongitude,
          clockInDistance: updatedSchedule.clockInDistance
        }
      });
    } catch (error) {
      console.error("[Mobile API] Clock-in error:", error);
      res.status(500).json({ 
        error: "server_error",
        message: "Failed to clock in. Please try again." 
      });
    }
  });

  app.post("/api/mobile/schedules/:id/clock-out", mobileAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const caregiverId = req.caregiver!.id;
      const { latitude, longitude, distance } = req.body;
      
      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ 
          error: "missing_location",
          message: "Latitude and longitude are required for clock-out" 
        });
      }
      
      const schedule = await storage.getCaregiverSchedule(id);
      
      if (!schedule) {
        return res.status(404).json({ 
          error: "not_found",
          message: "Schedule not found" 
        });
      }
      
      if (schedule.caregiverId !== caregiverId) {
        return res.status(403).json({ 
          error: "forbidden",
          message: "You don't have access to this schedule" 
        });
      }
      
      if (!schedule.clockInTime) {
        return res.status(400).json({ 
          error: "not_clocked_in",
          message: "Must clock in before clocking out" 
        });
      }
      
      if (schedule.clockOutTime) {
        return res.status(400).json({ 
          error: "already_clocked_out",
          message: "Already clocked out for this schedule",
          clockOutTime: schedule.clockOutTime
        });
      }
      
      const updatedSchedule = await storage.clockOutWithLocation(
        id,
        String(latitude),
        String(longitude),
        distance ? String(distance) : undefined
      );
      
      res.json({
        success: true,
        message: "Successfully clocked out",
        schedule: {
          id: updatedSchedule.id,
          clockInTime: updatedSchedule.clockInTime,
          clockOutTime: updatedSchedule.clockOutTime,
          clockOutLatitude: updatedSchedule.clockOutLatitude,
          clockOutLongitude: updatedSchedule.clockOutLongitude,
          clockOutDistance: updatedSchedule.clockOutDistance,
          evvStatus: updatedSchedule.evvStatus
        }
      });
    } catch (error) {
      console.error("[Mobile API] Clock-out error:", error);
      res.status(500).json({ 
        error: "server_error",
        message: "Failed to clock out. Please try again." 
      });
    }
  });

  app.post("/api/mobile/auth/refresh", mobileAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const newToken = generateToken({
        caregiverId: req.caregiver!.id,
        email: req.caregiver!.email,
        role: req.caregiver!.role
      });
      
      res.json({
        success: true,
        token: newToken
      });
    } catch (error) {
      console.error("[Mobile API] Token refresh error:", error);
      res.status(500).json({ 
        error: "server_error",
        message: "Failed to refresh token" 
      });
    }
  });

  app.get("/api/mobile/clients", mobileAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const caregiverId = req.caregiver!.id;
      const clients = await storage.getAssignedClientsByCaregiver(caregiverId);
      
      res.json({
        clients: clients.map(client => ({
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          phone: client.phone,
          email: client.email,
          address: client.address,
          city: client.city,
          state: client.state,
          zipCode: client.zipCode,
          status: client.status
        }))
      });
    } catch (error) {
      console.error("[Mobile API] Get assigned clients error:", error);
      res.status(500).json({ 
        error: "server_error",
        message: "Failed to fetch assigned clients" 
      });
    }
  });

  console.log("[Mobile API] Mobile API endpoints registered");
}
