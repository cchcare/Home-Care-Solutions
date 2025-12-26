import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, hashPassword } from "./localAuth";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import {
  insertOfficeSchema,
  insertClientSchema,
  insertCaregiverSchema,
  insertCarePlanSchema,
  insertCarePlanGoalSchema,
  insertCarePlanInterventionSchema,
  insertProgressNoteSchema,
  insertDocumentSchema,
  insertIncidentReportSchema,
  insertIncidentFollowUpSchema,
  insertTaskSchema,
  insertMessageSchema,
  insertCertificationSchema,
  insertComplianceItemSchema,
  insertTrainingSchema,
  insertTrainingRecordSchema,
  insertFileSchema,
  insertUserSchema,
  insertFamilyMemberSchema,
  insertClientFamilyMemberSchema,
  insertFamilyUpdateSchema,
  insertCustomRoleSchema,
  insertPermissionSchema,
  insertRolePermissionSchema,
  insertUserCustomRoleSchema,
  insertMasterWeekTemplateSchema,
  insertMasterWeekSlotSchema,
  insertClientScheduleSchema,
  insertScheduleChangeLogSchema,
  insertEvvDataSchema,
  insertMcoTypeSchema,
  insertMcoSchema,
  insertSystemSettingSchema,
  insertEntityFieldConfigSchema,
  insertCaregiverNoteSchema,
  insertCaregiverPreferenceSchema,
  insertCaregiverAbsenceSchema,
  insertCaregiverAvailabilitySchema,
  insertCaregiverAvailabilityExceptionSchema,
  insertCaregiverPayrollInfoSchema,
  insertCaregiverExpenseSchema,
  insertCaregiverPaycheckSchema,
  insertCaregiverRateSchema,
  insertCaregiverInServiceSchema,
  insertCaregiverOfficeMoveSchema,
  insertCaregiverScheduleSchema,
  insertClientMcoSchema,
  insertCoordinatorSchema,
  insertOfficeLicenseSchema,
  insertOfficeStaffSchema,
  insertOfficeExpenseSchema,
  insertEligibilityCheckSchema,
  insertEligibilityScheduleSchema,
  insertCaregiverComplianceSchema,
  insertMedicationSchema,
  insertMedicationLogSchema,
  insertVitalSignSchema,
  insertMileageLogSchema,
  insertApplicantSchema,
  insertApplicantNoteSchema,
  insertApplicantInterviewSchema,
  insertBackgroundCheckSchema,
  insertShiftDifferentialSchema,
  insertHolidaySchema,
  insertPerformanceReviewSchema,
  insertPerformanceMetricSchema,
  insertTimeOffRequestSchema,
  insertPtoBalanceSchema,
  insertSurveyTemplateSchema,
  insertSurveyResponseSchema,
  insertClaimSchema,
  insertClaimLineItemSchema,
  insertReferralSourceSchema,
  insertClientReferralSchema,
  insertHhaxOfficeMappingSchema,
  insertHhaxSyncLogSchema,
} from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { extractPaystubsFromPdf, cleanupPaystubTempFiles, ExtractedPaystubData } from "./ocr-service";
import { sendTodaysBirthdayNotifications, getUpcomingBirthdays, getBirthdayNotificationHistory } from "./birthday-service";
import { 
  queueNotification, 
  processNotificationQueue, 
  sendTestNotification, 
  sendScheduleChangeNotification,
  sendReminderNotification,
  sendUrgentAlert
} from "./notification-service";
import { insertNotificationPreferenceSchema, insertNotificationTemplateSchema } from "@shared/schema";
import { shiftMatchingService } from "./shift-matching-service";
import {
  getOperationalKPIs,
  getFinancialKPIs,
  getComplianceKPIs,
  getStaffingKPIs,
  getTrendData,
  getForecasting,
  getAllKPIs,
  getDashboardAnalytics,
  type DateRange,
} from "./analytics-service";

// Helper function to coerce date strings to Date objects
function coerceDate(value: string | Date | null | undefined): Date | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    return new Date(value);
  }
  return undefined;
}

// Configure multer for HIPAA-compliant file uploads
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow specific file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

// Configure multer for Excel file uploads (memory storage for direct buffer access)
const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /xlsx|xls/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream'
    ];
    
    if (extname || allowedMimeTypes.includes(file.mimetype)) {
      return cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only Excel files (.xlsx, .xls) are allowed."));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Ensure uploads directory exists
  if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads", { recursive: true });
  }

  // Auth routes - get current user from session
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const sessionUser = req.session.user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      // Return fresh user data from database
      const user = await storage.getUser(sessionUser.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Exclude password hash from response
      const { passwordHash, ...safeUser } = user as any;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard metrics
  app.get("/api/dashboard/metrics", isAuthenticated, async (req, res) => {
    try {
      const { officeId } = req.query;
      const officeFilter = officeId && officeId !== 'all' ? String(officeId) : undefined;
      const metrics = await storage.getDashboardMetrics(officeFilter);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // Monthly dashboard statistics for charts
  app.get("/api/dashboard/monthly-stats", isAuthenticated, async (req, res) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const { officeId } = req.query;
      const officeFilter = officeId && officeId !== 'all' ? String(officeId) : undefined;
      const stats = await storage.getMonthlyStats(year, officeFilter);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching monthly stats:", error);
      res.status(500).json({ message: "Failed to fetch monthly statistics" });
    }
  });

  // Office routes
  app.get("/api/offices", isAuthenticated, async (req, res) => {
    try {
      const offices = await storage.getAllOffices();
      res.json(offices);
    } catch (error) {
      console.error("Error fetching offices:", error);
      res.status(500).json({ message: "Failed to fetch offices" });
    }
  });

  app.get("/api/offices/:id", isAuthenticated, async (req, res) => {
    try {
      const office = await storage.getOffice(req.params.id);
      if (!office) {
        return res.status(404).json({ message: "Office not found" });
      }
      res.json(office);
    } catch (error) {
      console.error("Error fetching office:", error);
      res.status(500).json({ message: "Failed to fetch office" });
    }
  });

  app.post("/api/offices", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertOfficeSchema.parse(req.body);
      const office = await storage.createOffice(validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "office",
        entityId: office.id,
        newValues: office,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(201).json(office);
    } catch (error) {
      console.error("Error creating office:", error);
      res.status(400).json({ message: "Failed to create office" });
    }
  });

  app.put("/api/offices/:id", isAuthenticated, async (req: any, res) => {
    try {
      const oldOffice = await storage.getOffice(req.params.id);
      const validatedData = insertOfficeSchema.partial().parse(req.body);
      const office = await storage.updateOffice(req.params.id, validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "update",
        entityType: "office",
        entityId: office.id,
        oldValues: oldOffice,
        newValues: office,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(office);
    } catch (error) {
      console.error("Error updating office:", error);
      res.status(400).json({ message: "Failed to update office" });
    }
  });

  app.delete("/api/offices/:id", isAuthenticated, async (req: any, res) => {
    try {
      const office = await storage.getOffice(req.params.id);
      if (!office) {
        return res.status(404).json({ message: "Office not found" });
      }
      
      await storage.deleteOffice(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "delete",
        entityType: "office",
        entityId: req.params.id,
        oldValues: office,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting office:", error);
      res.status(500).json({ message: "Failed to delete office" });
    }
  });

  // Coordinator routes
  app.get("/api/coordinators", isAuthenticated, async (req, res) => {
    try {
      const { officeId } = req.query;
      const officeFilter = officeId && officeId !== 'all' ? String(officeId) : undefined;
      const coordinators = await storage.getAllCoordinators(officeFilter);
      res.json(coordinators);
    } catch (error) {
      console.error("Error fetching coordinators:", error);
      res.status(500).json({ message: "Failed to fetch coordinators" });
    }
  });

  app.get("/api/coordinators/:id", isAuthenticated, async (req, res) => {
    try {
      const coordinator = await storage.getCoordinator(req.params.id);
      if (!coordinator) {
        return res.status(404).json({ message: "Coordinator not found" });
      }
      res.json(coordinator);
    } catch (error) {
      console.error("Error fetching coordinator:", error);
      res.status(500).json({ message: "Failed to fetch coordinator" });
    }
  });

  app.post("/api/coordinators", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertCoordinatorSchema.parse(req.body);
      const coordinator = await storage.createCoordinator(validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "coordinator",
        entityId: coordinator.id,
        newValues: coordinator,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(201).json(coordinator);
    } catch (error) {
      console.error("Error creating coordinator:", error);
      res.status(400).json({ message: "Failed to create coordinator" });
    }
  });

  app.put("/api/coordinators/:id", isAuthenticated, async (req: any, res) => {
    try {
      const oldCoordinator = await storage.getCoordinator(req.params.id);
      const validatedData = insertCoordinatorSchema.partial().parse(req.body);
      const coordinator = await storage.updateCoordinator(req.params.id, validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "update",
        entityType: "coordinator",
        entityId: coordinator.id,
        oldValues: oldCoordinator,
        newValues: coordinator,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(coordinator);
    } catch (error) {
      console.error("Error updating coordinator:", error);
      res.status(400).json({ message: "Failed to update coordinator" });
    }
  });

  app.delete("/api/coordinators/:id", isAuthenticated, async (req: any, res) => {
    try {
      const coordinator = await storage.getCoordinator(req.params.id);
      if (!coordinator) {
        return res.status(404).json({ message: "Coordinator not found" });
      }
      
      await storage.deleteCoordinator(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "delete",
        entityType: "coordinator",
        entityId: req.params.id,
        oldValues: coordinator,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting coordinator:", error);
      res.status(500).json({ message: "Failed to delete coordinator" });
    }
  });

  // Client routes
  app.get("/api/clients", isAuthenticated, async (req, res) => {
    try {
      const { search, officeId } = req.query;
      const officeFilter = officeId && officeId !== 'all' ? String(officeId) : undefined;
      let clients;
      
      if (search) {
        // Validate search parameter to prevent injection attacks
        if (typeof search !== 'string' || search.length > 100 || search.trim().length === 0) {
          return res.status(400).json({ message: "Invalid search parameter" });
        }
        
        // Sanitize search input (remove potentially dangerous characters)
        const sanitizedSearch = search.replace(/[<>\"'%;()&+]/g, '');
        
        clients = await storage.searchClients(sanitizedSearch, officeFilter);
      } else {
        clients = await storage.getAllClients(officeFilter);
      }
      
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", isAuthenticated, async (req: any, res) => {
    try {
      // Convert date strings to Date objects
      const processedBody = {
        ...req.body,
        dateOfBirth: req.body.dateOfBirth && typeof req.body.dateOfBirth === 'string' ? new Date(req.body.dateOfBirth) : req.body.dateOfBirth,
      };
      const validatedData = insertClientSchema.parse(processedBody);
      const client = await storage.createClient(validatedData);
      
      // Log audit trail
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "client",
        entityId: client.id,
        newValues: client,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(400).json({ message: "Failed to create client" });
    }
  });

  app.put("/api/clients/:id", isAuthenticated, async (req: any, res) => {
    try {
      const oldClient = await storage.getClient(req.params.id);
      // Convert date strings to Date objects
      const processedBody = {
        ...req.body,
        dateOfBirth: coerceDate(req.body.dateOfBirth),
        serviceStartDate: coerceDate(req.body.serviceStartDate),
        snapRenewalDate: coerceDate(req.body.snapRenewalDate),
        snapExpiryDate: coerceDate(req.body.snapExpiryDate),
        medicaidRenewalDate: coerceDate(req.body.medicaidRenewalDate),
        medicaidExpiryDate: coerceDate(req.body.medicaidExpiryDate),
      };
      const validatedData = insertClientSchema.partial().parse(processedBody);
      const client = await storage.updateClient(req.params.id, validatedData);
      
      // Log audit trail
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "update",
        entityType: "client",
        entityId: client.id,
        oldValues: oldClient,
        newValues: client,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(400).json({ message: "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", isAuthenticated, async (req: any, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      await storage.deleteClient(req.params.id);
      
      // Log audit trail
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "delete",
        entityType: "client",
        entityId: req.params.id,
        oldValues: client,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Client bulk update
  app.post("/api/clients/bulk-update", isAuthenticated, async (req: any, res) => {
    try {
      const { clientIds, updates } = req.body;

      if (!Array.isArray(clientIds) || clientIds.length === 0) {
        return res.status(400).json({ message: "clientIds must be a non-empty array" });
      }

      if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "updates must be a non-empty object" });
      }

      const validatedUpdates = insertClientSchema.partial().parse(updates);
      const updatedClients = await storage.updateClientsBulk(clientIds, validatedUpdates);

      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "bulk_update",
        entityType: "client",
        entityId: clientIds.join(","),
        newValues: { clientIds, updates: validatedUpdates },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json(updatedClients);
    } catch (error) {
      console.error("Error bulk updating clients:", error);
      res.status(400).json({ message: "Failed to bulk update clients" });
    }
  });

  // Client bulk import
  app.post("/api/clients/bulk-import", isAuthenticated, async (req: any, res) => {
    try {
      const { data } = req.body;
      
      if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ message: "Invalid data format" });
      }

      interface BulkImportError {
        row: number;
        error: string;
        // Don't include sensitive data in error responses
      }
      
      const results: {
        totalRows: number;
        successfulImports: number;
        errors: BulkImportError[];
      } = {
        totalRows: data.length,
        successfulImports: 0,
        errors: []
      };

      for (let i = 0; i < data.length; i++) {
        try {
          const clientData = data[i];
          
          // Convert date strings to Date objects
          const processedClientData = {
            ...clientData,
            dateOfBirth: clientData.dateOfBirth && typeof clientData.dateOfBirth === 'string' ? new Date(clientData.dateOfBirth) : clientData.dateOfBirth,
          };
          
          // Validate the data
          const validatedData = insertClientSchema.parse(processedClientData);
          
          // Create the client
          const client = await storage.createClient(validatedData);
          
          // Log audit trail
          await storage.createAuditLog({
            userId: req.session?.user?.id,
            action: "bulk_import_create",
            entityType: "client",
            entityId: client.id,
            newValues: client,
            ipAddress: req.ip,
            userAgent: req.get("User-Agent"),
          });
          
          results.successfulImports++;
        } catch (error: any) {
          // Sanitize error message to avoid exposing sensitive data
          const sanitizedError = error.message?.includes('duplicate') ? 'Record already exists' : 
                                error.message?.includes('validation') ? 'Invalid data format' :
                                'Failed to import record';
          results.errors.push({
            row: i + 1,
            error: sanitizedError
          });
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Error during bulk client import:", error);
      res.status(500).json({ message: "Failed to import clients" });
    }
  });

  // User routes
  app.get("/api/users/:id", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Caregiver routes
  app.get("/api/caregivers", isAuthenticated, async (req, res) => {
    try {
      const { officeId } = req.query;
      const officeFilter = officeId && officeId !== 'all' ? String(officeId) : undefined;
      const caregivers = await storage.getAllCaregivers(officeFilter);
      
      // Fetch all offices for enrichment
      const offices = await storage.getAllOffices();
      const officeMap = new Map(offices.map(o => [o.id, o]));
      
      // Enrich caregivers with user data and office info
      const enrichedCaregivers = await Promise.all(
        caregivers.map(async (caregiver) => {
          let userInfo = { firstName: null as string | null, lastName: null as string | null, email: null as string | null };
          if (caregiver.userId) {
            const user = await storage.getUser(caregiver.userId);
            userInfo = {
              firstName: user?.firstName || null,
              lastName: user?.lastName || null,
              email: user?.email || null,
            };
          }
          
          // Get office info
          const office = caregiver.officeId ? officeMap.get(caregiver.officeId) : null;
          
          return {
            ...caregiver,
            ...userInfo,
            officeName: office?.name || null,
            officeAddress: office?.address || null,
            officePhone: office?.phone || null,
            officeEmail: office?.email || null,
          };
        })
      );
      
      res.json(enrichedCaregivers);
    } catch (error) {
      console.error("Error fetching caregivers:", error);
      res.status(500).json({ message: "Failed to fetch caregivers" });
    }
  });

  app.get("/api/caregivers/by-user/:userId", isAuthenticated, async (req, res) => {
    try {
      const caregiver = await storage.getCaregiverByUserId(req.params.userId);
      if (!caregiver) {
        return res.status(404).json({ message: "Caregiver not found for this user" });
      }
      res.json(caregiver);
    } catch (error) {
      console.error("Error fetching caregiver by user ID:", error);
      res.status(500).json({ message: "Failed to fetch caregiver" });
    }
  });

  app.get("/api/caregivers/:id", isAuthenticated, async (req, res) => {
    try {
      const caregiver = await storage.getCaregiver(req.params.id);
      if (!caregiver) {
        return res.status(404).json({ message: "Caregiver not found" });
      }
      
      // Enrich caregiver with user data
      let enrichedCaregiver = { ...caregiver, firstName: null as string | null, lastName: null as string | null, email: null as string | null };
      if (caregiver.userId) {
        const user = await storage.getUser(caregiver.userId);
        enrichedCaregiver = {
          ...caregiver,
          firstName: user?.firstName || null,
          lastName: user?.lastName || null,
          email: user?.email || null,
        };
      }
      
      res.json(enrichedCaregiver);
    } catch (error) {
      console.error("Error fetching caregiver:", error);
      res.status(500).json({ message: "Failed to fetch caregiver" });
    }
  });

  app.post("/api/caregivers", isAuthenticated, async (req: any, res) => {
    try {
      // Extract user info and client assignments from the request body
      const { email, firstName, middleName, lastName, dateOfBirth, clientIds, ...caregiverData } = req.body;
      
      // Convert date strings to Date objects if they're strings
      const processedDateOfBirth = dateOfBirth && typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
      const processedHireDate = caregiverData.hireDate && typeof caregiverData.hireDate === 'string' ? new Date(caregiverData.hireDate) : caregiverData.hireDate;
      const processedStartDate = caregiverData.startDate && typeof caregiverData.startDate === 'string' ? new Date(caregiverData.startDate) : caregiverData.startDate;
      
      // Convert hourlyWage to string if it's a number (numeric type expects string)
      if (caregiverData.hourlyWage !== undefined && typeof caregiverData.hourlyWage === 'number') {
        caregiverData.hourlyWage = String(caregiverData.hourlyWage);
      }
      
      // First create the user account for login
      const user = await storage.upsertUser({
        email,
        firstName,
        middleName,
        lastName,
        dateOfBirth: processedDateOfBirth,
        role: "caregiver"
      });
      
      // Then create the caregiver record linked to the user (exclude clientIds from caregiver data)
      const validatedCaregiverData = insertCaregiverSchema.parse({
        ...caregiverData,
        hireDate: processedHireDate,
        startDate: processedStartDate,
        userId: user.id
      });
      
      const caregiver = await storage.createCaregiver(validatedCaregiverData);
      
      // Assign clients to caregiver if provided
      if (clientIds && Array.isArray(clientIds) && clientIds.length > 0) {
        await storage.assignClientsToCaregiver(caregiver.id, clientIds);
      }
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "caregiver",
        entityId: caregiver.id,
        newValues: { 
          ...caregiver, 
          userEmail: email, 
          userFirstName: firstName, 
          userMiddleName: middleName,
          userLastName: lastName,
          userDateOfBirth: dateOfBirth,
          assignedClients: clientIds
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      // Return caregiver with user information
      res.status(201).json({
        ...caregiver,
        user: {
          email: user.email,
          firstName: user.firstName,
          middleName: user.middleName,
          lastName: user.lastName,
          dateOfBirth: user.dateOfBirth
        }
      });
    } catch (error) {
      console.error("Error creating caregiver:", error);
      if (error instanceof Error && error.message.includes("unique constraint")) {
        res.status(400).json({ message: "Email address or employee ID already exists" });
      } else {
        res.status(400).json({ message: "Failed to create caregiver" });
      }
    }
  });

  // Update caregiver
  app.put("/api/caregivers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const oldCaregiver = await storage.getCaregiver(req.params.id);
      if (!oldCaregiver) {
        return res.status(404).json({ message: "Caregiver not found" });
      }

      // Convert date strings to Date objects if they're strings
      const processedHireDate = req.body.hireDate && typeof req.body.hireDate === 'string' ? new Date(req.body.hireDate) : req.body.hireDate;
      const processedStartDate = req.body.startDate && typeof req.body.startDate === 'string' ? new Date(req.body.startDate) : req.body.startDate;
      
      // Convert hourlyWage to string if it's a number (numeric type expects string)
      if (req.body.hourlyWage !== undefined && typeof req.body.hourlyWage === 'number') {
        req.body.hourlyWage = String(req.body.hourlyWage);
      }
      
      const processedBody = {
        ...req.body,
        hireDate: processedHireDate,
        startDate: processedStartDate,
      };
      
      const validatedData = insertCaregiverSchema.partial().parse(processedBody);
      const caregiver = await storage.updateCaregiver(req.params.id, validatedData);
      
      // Log audit trail
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "update",
        entityType: "caregiver",
        entityId: caregiver.id,
        oldValues: oldCaregiver,
        newValues: caregiver,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(caregiver);
    } catch (error) {
      console.error("Error updating caregiver:", error);
      res.status(400).json({ message: "Failed to update caregiver" });
    }
  });

  // Caregiver bulk import
  app.post("/api/caregivers/bulk-import", isAuthenticated, async (req: any, res) => {
    try {
      const { data } = req.body;
      
      if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ message: "Invalid data format" });
      }

      interface BulkImportError {
        row: number;
        error: string;
        // Don't include sensitive data in error responses
      }
      
      const results: {
        totalRows: number;
        successfulImports: number;
        errors: BulkImportError[];
      } = {
        totalRows: data.length,
        successfulImports: 0,
        errors: []
      };

      for (let i = 0; i < data.length; i++) {
        try {
          const caregiverData = data[i];
          
          // Extract user info from the caregiver data
          const { email, firstName, middleName, lastName, dateOfBirth, ...caregiverInfo } = caregiverData;
          
          // First create the user account for login
          const user = await storage.upsertUser({
            email,
            firstName,
            middleName,
            lastName,
            dateOfBirth,
            role: "caregiver"
          });
          
          // Then create the caregiver record linked to the user
          const validatedCaregiverData = insertCaregiverSchema.parse({
            ...caregiverInfo,
            userId: user.id
          });
          
          const caregiver = await storage.createCaregiver(validatedCaregiverData);
          
          // Log audit trail
          await storage.createAuditLog({
            userId: req.session?.user?.id,
            action: "bulk_import_create",
            entityType: "caregiver",
            entityId: caregiver.id,
            newValues: { 
              ...caregiver, 
              userEmail: email, 
              userFirstName: firstName, 
              userMiddleName: middleName,
              userLastName: lastName,
              userDateOfBirth: dateOfBirth
            },
            ipAddress: req.ip,
            userAgent: req.get("User-Agent"),
          });
          
          results.successfulImports++;
        } catch (error: any) {
          // Sanitize error message to avoid exposing sensitive data
          const sanitizedError = error.message?.includes('duplicate') ? 'Record already exists' : 
                                error.message?.includes('validation') ? 'Invalid data format' :
                                'Failed to import record';
          results.errors.push({
            row: i + 1,
            error: sanitizedError
          });
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Error during bulk caregiver import:", error);
      res.status(500).json({ message: "Failed to import caregivers" });
    }
  });

  // Caregiver bulk update
  app.post("/api/caregivers/bulk-update", isAuthenticated, async (req: any, res) => {
    try {
      const { caregiverIds, updates } = req.body;

      if (!Array.isArray(caregiverIds) || caregiverIds.length === 0) {
        return res.status(400).json({ message: "caregiverIds must be a non-empty array" });
      }

      if (!updates || typeof updates !== 'object' || Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "updates must be a non-empty object" });
      }

      const validatedUpdates = insertCaregiverSchema.partial().parse(updates);
      const updatedCaregivers = await storage.updateCaregiversBulk(caregiverIds, validatedUpdates);

      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "bulk_update",
        entityType: "caregiver",
        entityId: caregiverIds.join(","),
        newValues: { caregiverIds, updates: validatedUpdates, count: updatedCaregivers.length },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json({
        updated: updatedCaregivers.length,
        caregivers: updatedCaregivers,
      });
    } catch (error) {
      console.error("Error bulk updating caregivers:", error);
      res.status(400).json({ message: "Failed to bulk update caregivers" });
    }
  });

  // Caregiver bulk delete
  app.post("/api/caregivers/bulk-delete", isAuthenticated, async (req: any, res) => {
    try {
      const { caregiverIds } = req.body;

      if (!Array.isArray(caregiverIds) || caregiverIds.length === 0) {
        return res.status(400).json({ message: "caregiverIds must be a non-empty array" });
      }

      // Check user role - only admin, supervisor, or super_admin can bulk delete
      const user = await storage.getUser(req.session?.user?.id);
      if (!user || !['admin', 'supervisor', 'super_admin'].includes(user.role || '')) {
        return res.status(403).json({ message: "Insufficient permissions to delete caregivers" });
      }

      await storage.deleteCaregiversBulk(caregiverIds);

      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "bulk_delete",
        entityType: "caregiver",
        entityId: caregiverIds.join(","),
        oldValues: { caregiverIds, count: caregiverIds.length },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json({
        deleted: caregiverIds.length,
      });
    } catch (error) {
      console.error("Error bulk deleting caregivers:", error);
      res.status(500).json({ message: "Failed to bulk delete caregivers" });
    }
  });

  // Care plan routes
  app.get("/api/clients/:clientId/care-plans", isAuthenticated, async (req, res) => {
    try {
      const carePlans = await storage.getCarePlansByClient(req.params.clientId);
      res.json(carePlans);
    } catch (error) {
      console.error("Error fetching care plans:", error);
      res.status(500).json({ message: "Failed to fetch care plans" });
    }
  });

  app.post("/api/care-plans", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertCarePlanSchema.parse({
        ...req.body,
        createdBy: req.session?.user?.id,
      });
      const carePlan = await storage.createCarePlan(validatedData);
      res.status(201).json(carePlan);
    } catch (error) {
      console.error("Error creating care plan:", error);
      res.status(400).json({ message: "Failed to create care plan" });
    }
  });

  // Care plan goals routes
  app.get("/api/care-plans/:id/goals", isAuthenticated, async (req, res) => {
    try {
      const goals = await storage.getCarePlanGoals(req.params.id);
      res.json(goals);
    } catch (error) {
      console.error("Error fetching care plan goals:", error);
      res.status(500).json({ message: "Failed to fetch care plan goals" });
    }
  });

  app.post("/api/care-plans/:id/goals", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertCarePlanGoalSchema.parse({
        ...req.body,
        carePlanId: req.params.id,
      });
      const goal = await storage.createCarePlanGoal(validatedData);
      res.status(201).json(goal);
    } catch (error) {
      console.error("Error creating care plan goal:", error);
      res.status(400).json({ message: "Failed to create care plan goal" });
    }
  });

  app.patch("/api/care-plans/:id/goals/:goalId", isAuthenticated, async (req: any, res) => {
    try {
      const goal = await storage.updateCarePlanGoal(req.params.goalId, req.body);
      res.json(goal);
    } catch (error) {
      console.error("Error updating care plan goal:", error);
      res.status(400).json({ message: "Failed to update care plan goal" });
    }
  });

  // Care plan interventions routes
  app.get("/api/care-plans/:id/interventions", isAuthenticated, async (req, res) => {
    try {
      const interventions = await storage.getCarePlanInterventions(req.params.id);
      res.json(interventions);
    } catch (error) {
      console.error("Error fetching care plan interventions:", error);
      res.status(500).json({ message: "Failed to fetch care plan interventions" });
    }
  });

  app.post("/api/care-plans/:id/interventions", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertCarePlanInterventionSchema.parse({
        ...req.body,
        carePlanId: req.params.id,
      });
      const intervention = await storage.createCarePlanIntervention(validatedData);
      res.status(201).json(intervention);
    } catch (error) {
      console.error("Error creating care plan intervention:", error);
      res.status(400).json({ message: "Failed to create care plan intervention" });
    }
  });

  app.patch("/api/care-plans/:id/interventions/:interventionId", isAuthenticated, async (req: any, res) => {
    try {
      const intervention = await storage.updateCarePlanIntervention(req.params.interventionId, req.body);
      res.json(intervention);
    } catch (error) {
      console.error("Error updating care plan intervention:", error);
      res.status(400).json({ message: "Failed to update care plan intervention" });
    }
  });

  // Progress notes routes
  app.get("/api/clients/:clientId/progress-notes", isAuthenticated, async (req, res) => {
    try {
      const notes = await storage.getProgressNotesByClient(req.params.clientId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching progress notes:", error);
      res.status(500).json({ message: "Failed to fetch progress notes" });
    }
  });

  app.post("/api/progress-notes", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertProgressNoteSchema.parse(req.body);
      const note = await storage.createProgressNote(validatedData);
      res.status(201).json(note);
    } catch (error) {
      console.error("Error creating progress note:", error);
      res.status(400).json({ message: "Failed to create progress note" });
    }
  });

  // Document routes with HIPAA-compliant upload
  app.post("/api/documents/upload", isAuthenticated, upload.single("file"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Generate encryption key for HIPAA compliance
      const encryptionKey = crypto.randomBytes(32).toString("hex");
      
      const document = await storage.createDocument({
        clientId: req.body.clientId || null,
        caregiverId: req.body.caregiverId || null,
        uploadedBy: req.session?.user?.id,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        documentType: req.body.documentType || "general",
        encryptionKey,
      });

      res.status(201).json(document);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  app.get("/api/documents", isAuthenticated, async (req, res) => {
    try {
      const { officeId } = req.query;
      const officeFilter = officeId && officeId !== 'all' ? String(officeId) : undefined;
      const documents = await storage.getAllDocuments(officeFilter);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get("/api/caregivers/:caregiverId/documents", isAuthenticated, async (req, res) => {
    try {
      const documents = await storage.getDocumentsByCaregiver(req.params.caregiverId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching caregiver documents:", error);
      res.status(500).json({ message: "Failed to fetch caregiver documents" });
    }
  });

  app.get("/api/clients/:clientId/documents", isAuthenticated, async (req, res) => {
    try {
      const documents = await storage.getDocumentsByClient(req.params.clientId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching client documents:", error);
      res.status(500).json({ message: "Failed to fetch client documents" });
    }
  });

  app.get("/api/documents/:id", isAuthenticated, async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  app.put("/api/documents/:id", isAuthenticated, async (req: any, res) => {
    try {
      const document = await storage.updateDocument(req.params.id, req.body);
      res.json(document);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  app.get("/api/documents/:id/download", isAuthenticated, async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      const filePath = path.join("uploads", document.fileName);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on server" });
      }
      
      res.setHeader("Content-Disposition", `attachment; filename="${document.originalName}"`);
      res.setHeader("Content-Type", document.fileType || "application/octet-stream");
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      console.error("Error downloading document:", error);
      res.status(500).json({ message: "Failed to download document" });
    }
  });

  app.get("/api/documents/:id/view", isAuthenticated, async (req, res) => {
    try {
      const document = await storage.getDocument(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      const filePath = path.join("uploads", document.fileName);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found on server" });
      }
      
      res.setHeader("Content-Disposition", `inline; filename="${document.originalName}"`);
      res.setHeader("Content-Type", document.fileType || "application/octet-stream");
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      console.error("Error viewing document:", error);
      res.status(500).json({ message: "Failed to view document" });
    }
  });

  app.get("/api/clients/:clientId/caregivers", isAuthenticated, async (req, res) => {
    try {
      const caregivers = await storage.getAssignedCaregiversByClient(req.params.clientId);
      res.json(caregivers);
    } catch (error) {
      console.error("Error fetching assigned caregivers:", error);
      res.status(500).json({ message: "Failed to fetch assigned caregivers" });
    }
  });

  // Assign caregiver to client (requires admin, supervisor, or super_admin role)
  app.post("/api/clients/:clientId/caregivers", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session?.user?.id);
      if (!user || (user.role !== "admin" && user.role !== "supervisor" && user.role !== "super_admin")) {
        return res.status(403).json({ message: "Access denied. Admin or supervisor role required." });
      }
      const { caregiverId } = req.body;
      if (!caregiverId || typeof caregiverId !== "string") {
        return res.status(400).json({ message: "caregiverId is required and must be a string" });
      }
      const caregiver = await storage.getCaregiver(caregiverId);
      if (!caregiver) {
        return res.status(404).json({ message: "Caregiver not found" });
      }
      const client = await storage.getClient(req.params.clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      await storage.assignClientsToCaregiver(caregiverId, [req.params.clientId]);
      res.status(201).json({ message: "Caregiver assigned successfully" });
    } catch (error) {
      console.error("Error assigning caregiver:", error);
      res.status(500).json({ message: "Failed to assign caregiver" });
    }
  });

  // Unassign caregiver from client (requires admin, supervisor, or super_admin role)
  app.delete("/api/clients/:clientId/caregivers/:caregiverId", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session?.user?.id);
      if (!user || (user.role !== "admin" && user.role !== "supervisor" && user.role !== "super_admin")) {
        return res.status(403).json({ message: "Access denied. Admin or supervisor role required." });
      }
      await storage.unassignClientsFromCaregiver(req.params.caregiverId, [req.params.clientId]);
      res.json({ message: "Caregiver unassigned successfully" });
    } catch (error) {
      console.error("Error unassigning caregiver:", error);
      res.status(500).json({ message: "Failed to unassign caregiver" });
    }
  });

  // Get clients assigned to caregiver
  app.get("/api/caregivers/:caregiverId/clients", isAuthenticated, async (req, res) => {
    try {
      const clients = await storage.getAssignedClientsByCaregiver(req.params.caregiverId);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching assigned clients:", error);
      res.status(500).json({ message: "Failed to fetch assigned clients" });
    }
  });

  // Assign client to caregiver (requires admin, supervisor, or super_admin role)
  app.post("/api/caregivers/:caregiverId/clients", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session?.user?.id);
      if (!user || (user.role !== "admin" && user.role !== "supervisor" && user.role !== "super_admin")) {
        return res.status(403).json({ message: "Access denied. Admin or supervisor role required." });
      }
      const { clientId } = req.body;
      if (!clientId || typeof clientId !== "string") {
        return res.status(400).json({ message: "clientId is required and must be a string" });
      }
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      const caregiver = await storage.getCaregiver(req.params.caregiverId);
      if (!caregiver) {
        return res.status(404).json({ message: "Caregiver not found" });
      }
      await storage.assignClientsToCaregiver(req.params.caregiverId, [clientId]);
      res.status(201).json({ message: "Client assigned successfully" });
    } catch (error) {
      console.error("Error assigning client:", error);
      res.status(500).json({ message: "Failed to assign client" });
    }
  });

  // Unassign client from caregiver (requires admin, supervisor, or super_admin role)
  app.delete("/api/caregivers/:caregiverId/clients/:clientId", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session?.user?.id);
      if (!user || (user.role !== "admin" && user.role !== "supervisor" && user.role !== "super_admin")) {
        return res.status(403).json({ message: "Access denied. Admin or supervisor role required." });
      }
      await storage.unassignClientsFromCaregiver(req.params.caregiverId, [req.params.clientId]);
      res.json({ message: "Client unassigned successfully" });
    } catch (error) {
      console.error("Error unassigning client:", error);
      res.status(500).json({ message: "Failed to unassign client" });
    }
  });

  // Client Communications routes
  app.get("/api/clients/:clientId/communications", isAuthenticated, async (req, res) => {
    try {
      const communications = await storage.getClientCommunications(req.params.clientId);
      res.json(communications);
    } catch (error) {
      console.error("Error fetching client communications:", error);
      res.status(500).json({ message: "Failed to fetch communications" });
    }
  });

  app.post("/api/clients/:clientId/communications", isAuthenticated, async (req: any, res) => {
    try {
      const communication = await storage.createClientCommunication({
        ...req.body,
        clientId: req.params.clientId,
        authorUserId: req.session?.user?.id,
      });
      res.status(201).json(communication);
    } catch (error) {
      console.error("Error creating client communication:", error);
      res.status(500).json({ message: "Failed to create communication" });
    }
  });

  app.delete("/api/communications/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteClientCommunication(req.params.id);
      res.json({ message: "Communication deleted successfully" });
    } catch (error) {
      console.error("Error deleting communication:", error);
      res.status(500).json({ message: "Failed to delete communication" });
    }
  });

  // Office MCO Billing Rate routes
  app.get("/api/offices/:officeId/billing-rates", isAuthenticated, async (req, res) => {
    try {
      const mcoId = req.query.mcoId as string | undefined;
      const rates = await storage.getOfficeMcoBillingRates(req.params.officeId, mcoId);
      res.json(rates);
    } catch (error) {
      console.error("Error fetching billing rates:", error);
      res.status(500).json({ message: "Failed to fetch billing rates" });
    }
  });

  app.post("/api/offices/:officeId/billing-rates", isAuthenticated, async (req: any, res) => {
    try {
      const rate = await storage.createOfficeMcoBillingRate({
        ...req.body,
        officeId: req.params.officeId,
      });
      res.status(201).json(rate);
    } catch (error) {
      console.error("Error creating billing rate:", error);
      res.status(500).json({ message: "Failed to create billing rate" });
    }
  });

  app.put("/api/billing-rates/:id", isAuthenticated, async (req, res) => {
    try {
      const rate = await storage.updateOfficeMcoBillingRate(req.params.id, req.body);
      res.json(rate);
    } catch (error) {
      console.error("Error updating billing rate:", error);
      res.status(500).json({ message: "Failed to update billing rate" });
    }
  });

  app.delete("/api/billing-rates/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteOfficeMcoBillingRate(req.params.id);
      res.json({ message: "Billing rate deleted successfully" });
    } catch (error) {
      console.error("Error deleting billing rate:", error);
      res.status(500).json({ message: "Failed to delete billing rate" });
    }
  });

  // Client Schedule routes
  app.get("/api/clients/:clientId/schedules", isAuthenticated, async (req, res) => {
    try {
      const schedules = await storage.getClientSchedules(req.params.clientId);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching client schedules:", error);
      res.status(500).json({ message: "Failed to fetch schedules" });
    }
  });

  app.post("/api/clients/:clientId/schedules/rollover", isAuthenticated, async (req, res) => {
    try {
      const days = req.body.days || 30;
      const schedules = await storage.rolloverSchedules(req.params.clientId, days);
      res.status(201).json(schedules);
    } catch (error) {
      console.error("Error rolling over schedules:", error);
      res.status(500).json({ message: "Failed to rollover schedules" });
    }
  });

  // Master Week Template routes for clients
  app.get("/api/clients/:clientId/master-week", isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getMasterWeekTemplatesByClient(req.params.clientId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching master week templates:", error);
      res.status(500).json({ message: "Failed to fetch master week templates" });
    }
  });

  app.post("/api/clients/:clientId/master-week", isAuthenticated, async (req: any, res) => {
    try {
      const template = await storage.createMasterWeekTemplate({
        ...req.body,
        clientId: req.params.clientId,
        createdBy: req.session?.user?.id,
      });
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating master week template:", error);
      res.status(500).json({ message: "Failed to create master week template" });
    }
  });

  app.get("/api/master-week/:templateId/slots", isAuthenticated, async (req, res) => {
    try {
      const slots = await storage.getMasterWeekSlots(req.params.templateId);
      res.json(slots);
    } catch (error) {
      console.error("Error fetching master week slots:", error);
      res.status(500).json({ message: "Failed to fetch master week slots" });
    }
  });

  app.post("/api/master-week/:templateId/slots", isAuthenticated, async (req, res) => {
    try {
      const slot = await storage.createMasterWeekSlot({
        ...req.body,
        templateId: req.params.templateId,
      });
      res.status(201).json(slot);
    } catch (error) {
      console.error("Error creating master week slot:", error);
      res.status(500).json({ message: "Failed to create master week slot" });
    }
  });

  app.delete("/api/master-week/slots/:slotId", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteMasterWeekSlot(req.params.slotId);
      res.json({ message: "Slot deleted successfully" });
    } catch (error) {
      console.error("Error deleting master week slot:", error);
      res.status(500).json({ message: "Failed to delete slot" });
    }
  });

  // Incident report routes
  app.get("/api/incident-reports", isAuthenticated, async (req, res) => {
    try {
      const { officeId } = req.query;
      const officeFilter = officeId && officeId !== 'all' ? String(officeId) : undefined;
      const reports = await storage.getAllIncidentReports(officeFilter);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching incident reports:", error);
      res.status(500).json({ message: "Failed to fetch incident reports" });
    }
  });

  app.post("/api/incident-reports", isAuthenticated, async (req: any, res) => {
    try {
      const coercedData = {
        ...req.body,
        incidentDate: coerceDate(req.body.incidentDate),
        followUpDate: coerceDate(req.body.followUpDate),
        reportedBy: req.session?.user?.id,
      };
      const validatedData = insertIncidentReportSchema.parse(coercedData);
      const report = await storage.createIncidentReport(validatedData);
      res.status(201).json(report);
    } catch (error) {
      console.error("Error creating incident report:", error);
      res.status(400).json({ message: "Failed to create incident report" });
    }
  });

  // Incident report statistics by month
  app.get("/api/incidents/stats", isAuthenticated, async (req, res) => {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const stats = await storage.getIncidentStatsByMonth(year);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching incident statistics:", error);
      res.status(500).json({ message: "Failed to fetch incident statistics" });
    }
  });

  // Task routes
  app.get("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const { userId, officeId } = req.query;
      const officeFilter = officeId && officeId !== 'all' ? String(officeId) : undefined;
      let tasks;
      
      if (userId) {
        tasks = await storage.getTasksByUser(userId as string);
      } else {
        tasks = await storage.getAllTasks(officeFilter);
      }
      
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const coercedData = {
        ...req.body,
        dueDate: coerceDate(req.body.dueDate),
        completedAt: coerceDate(req.body.completedAt),
        createdBy: req.session?.user?.id,
      };
      const validatedData = insertTaskSchema.parse(coercedData);
      const task = await storage.createTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(400).json({ message: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const coercedData = {
        ...req.body,
        dueDate: coerceDate(req.body.dueDate),
        completedAt: coerceDate(req.body.completedAt),
      };
      const validatedData = insertTaskSchema.partial().parse(coercedData);
      const task = await storage.updateTask(req.params.id, validatedData);
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(400).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteTask(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Message routes
  app.get("/api/messages", isAuthenticated, async (req: any, res) => {
    try {
      const { type = 'received', status, officeId } = req.query;
      const userId = req.session?.user?.id;
      const officeFilter = officeId && officeId !== 'all' ? String(officeId) : undefined;
      let messages;
      
      if (type === 'sent') {
        messages = await storage.getSentMessagesByUser(userId, status);
      } else {
        messages = await storage.getReceivedMessagesByUser(userId, status);
      }
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post("/api/messages", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertMessageSchema.parse({
        ...req.body,
        senderId: req.session?.user?.id,
      });
      
      const message = await storage.createMessage(validatedData);
      
      // Handle external communications (email/SMS)
      if (validatedData.communicationType === 'email' || validatedData.communicationType === 'sms') {
        const { sendEmail, sendSMS, isValidEmail, isValidPhone, formatPhoneNumber } = await import('./communication-services');
        
        if (validatedData.communicationType === 'email' && validatedData.recipientEmail) {
          if (!isValidEmail(validatedData.recipientEmail)) {
            return res.status(400).json({ message: "Invalid email address" });
          }
          
          const emailResult = await sendEmail({
            to: validatedData.recipientEmail,
            subject: validatedData.subject || 'Message from Healthcare Team',
            text: validatedData.content,
            html: `<p>${validatedData.content.replace(/\n/g, '<br>')}</p>`
          });
          
          // Update message with delivery status
          await storage.updateMessageDelivery(message.id, {
            deliveryStatus: emailResult.success ? 'sent' : 'failed',
            externalId: emailResult.messageId,
            deliveryAttempts: 1,
            lastDeliveryAttempt: new Date()
          });
          
          if (!emailResult.success) {
            return res.status(500).json({ 
              message: "Message saved but email delivery failed",
              error: emailResult.error 
            });
          }
        }
        
        if (validatedData.communicationType === 'sms' && validatedData.recipientPhone) {
          if (!isValidPhone(validatedData.recipientPhone)) {
            return res.status(400).json({ message: "Invalid phone number" });
          }
          
          const smsResult = await sendSMS({
            to: formatPhoneNumber(validatedData.recipientPhone),
            body: validatedData.content
          });
          
          // Update message with delivery status
          await storage.updateMessageDelivery(message.id, {
            deliveryStatus: smsResult.success ? 'sent' : 'failed',
            externalId: smsResult.messageSid,
            deliveryAttempts: 1,
            lastDeliveryAttempt: new Date()
          });
          
          if (!smsResult.success) {
            return res.status(500).json({ 
              message: "Message saved but SMS delivery failed",
              error: smsResult.error 
            });
          }
        }
      }
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(400).json({ message: "Failed to create message" });
    }
  });

  app.put("/api/messages/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      await storage.updateMessageStatus(req.params.id, userId, 'read');
      res.status(204).send();
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  app.put("/api/messages/:id/unread", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      await storage.updateMessageStatus(req.params.id, userId, 'unread');
      res.status(204).send();
    } catch (error) {
      console.error("Error marking message as unread:", error);
      res.status(500).json({ message: "Failed to mark message as unread" });
    }
  });

  app.put("/api/messages/:id/archive", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      await storage.updateMessageStatus(req.params.id, userId, 'archived');
      res.status(204).send();
    } catch (error) {
      console.error("Error archiving message:", error);
      res.status(500).json({ message: "Failed to archive message" });
    }
  });

  // Channel communication routes
  app.get("/api/channel/messages", isAuthenticated, async (req, res) => {
    try {
      const messages = await storage.getAllChannelMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching channel messages:", error);
      res.status(500).json({ message: "Failed to fetch channel messages" });
    }
  });

  app.post("/api/channel/messages", isAuthenticated, async (req: any, res) => {
    try {
      const { content, priority = "normal" } = req.body;
      if (!content || !content.trim()) {
        return res.status(400).json({ message: "Message content is required" });
      }
      
      const userId = req.session?.user?.id;
      const message = await storage.createChannelMessage(userId, content.trim(), priority);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating channel message:", error);
      res.status(500).json({ message: "Failed to send channel message" });
    }
  });

  // Certification routes
  app.get("/api/caregivers/:caregiverId/certifications", isAuthenticated, async (req, res) => {
    try {
      const certifications = await storage.getCertificationsByCaregiver(req.params.caregiverId);
      res.json(certifications);
    } catch (error) {
      console.error("Error fetching certifications:", error);
      res.status(500).json({ message: "Failed to fetch certifications" });
    }
  });

  app.post("/api/certifications", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertCertificationSchema.parse(req.body);
      const certification = await storage.createCertification(validatedData);
      res.status(201).json(certification);
    } catch (error) {
      console.error("Error creating certification:", error);
      res.status(400).json({ message: "Failed to create certification" });
    }
  });

  // Compliance routes
  app.get("/api/caregivers/:caregiverId/compliance", isAuthenticated, async (req, res) => {
    try {
      const complianceItems = await storage.getComplianceItemsByCaregiver(req.params.caregiverId);
      res.json(complianceItems);
    } catch (error) {
      console.error("Error fetching compliance items:", error);
      res.status(500).json({ message: "Failed to fetch compliance items" });
    }
  });

  app.get("/api/compliance", isAuthenticated, async (req, res) => {
    try {
      const officeId = req.query.officeId as string | undefined;
      const complianceItems = await storage.getAllComplianceItems(officeId);
      res.json(complianceItems);
    } catch (error) {
      console.error("Error fetching compliance items:", error);
      res.status(500).json({ message: "Failed to fetch compliance items" });
    }
  });

  app.post("/api/compliance", isAuthenticated, async (req: any, res) => {
    try {
      const coercedData = {
        ...req.body,
        dueDate: coerceDate(req.body.dueDate),
        completedDate: coerceDate(req.body.completedDate),
      };
      const validatedData = insertComplianceItemSchema.parse(coercedData);
      const item = await storage.createComplianceItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating compliance item:", error);
      res.status(400).json({ message: "Failed to create compliance item" });
    }
  });

  app.put("/api/compliance/:id", isAuthenticated, async (req, res) => {
    try {
      const coercedData = {
        ...req.body,
        dueDate: coerceDate(req.body.dueDate),
        completedDate: coerceDate(req.body.completedDate),
      };
      const validatedData = insertComplianceItemSchema.partial().parse(coercedData);
      const item = await storage.updateComplianceItem(req.params.id, validatedData);
      res.json(item);
    } catch (error) {
      console.error("Error updating compliance item:", error);
      res.status(400).json({ message: "Failed to update compliance item" });
    }
  });


  // Training management routes
  app.get("/api/trainings", isAuthenticated, async (req, res) => {
    try {
      const { officeId } = req.query;
      const officeFilter = officeId && officeId !== 'all' ? String(officeId) : undefined;
      const trainings = await storage.getAllTrainings(officeFilter);
      res.json(trainings);
    } catch (error) {
      console.error("Error fetching trainings:", error);
      res.status(500).json({ message: "Failed to fetch trainings" });
    }
  });

  app.post("/api/trainings", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertTrainingSchema.parse(req.body);
      const training = await storage.createTraining(validatedData);
      res.status(201).json(training);
    } catch (error) {
      console.error("Error creating training:", error);
      res.status(400).json({ message: "Failed to create training" });
    }
  });

  app.put("/api/trainings/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertTrainingSchema.partial().omit({ id: true, createdAt: true, updatedAt: true }).parse(req.body);
      const training = await storage.updateTraining(req.params.id, validatedData);
      res.json(training);
    } catch (error) {
      console.error("Error updating training:", error);
      res.status(400).json({ message: "Failed to update training" });
    }
  });

  app.get("/api/training-records", isAuthenticated, async (req, res) => {
    try {
      const records = await storage.getAllTrainingRecords();
      res.json(records);
    } catch (error) {
      console.error("Error fetching training records:", error);
      res.status(500).json({ message: "Failed to fetch training records" });
    }
  });

  app.post("/api/training-records", isAuthenticated, async (req: any, res) => {
    try {
      const coercedData = {
        ...req.body,
        startDate: coerceDate(req.body.startDate),
        completionDate: coerceDate(req.body.completionDate),
        expirationDate: coerceDate(req.body.expirationDate),
      };
      const validatedData = insertTrainingRecordSchema.parse(coercedData);
      const record = await storage.createTrainingRecord(validatedData);
      res.status(201).json(record);
    } catch (error) {
      console.error("Error creating training record:", error);
      res.status(400).json({ message: "Failed to create training record" });
    }
  });

  app.post("/api/training-records/bulk-assign", isAuthenticated, async (req: any, res) => {
    try {
      const { trainingId, caregiverIds } = req.body;
      
      if (!trainingId || !Array.isArray(caregiverIds) || caregiverIds.length === 0) {
        return res.status(400).json({ message: "Training ID and caregiver IDs are required" });
      }

      const records = [];
      for (const caregiverId of caregiverIds) {
        const recordData = {
          caregiverId,
          trainingId,
          status: "not_started" as const,
          startDate: new Date(),
        };
        const record = await storage.createTrainingRecord(recordData);
        records.push(record);
      }

      res.status(201).json({ 
        message: `Training assigned to ${records.length} caregivers`, 
        records 
      });
    } catch (error) {
      console.error("Error bulk assigning training:", error);
      res.status(400).json({ message: "Failed to bulk assign training" });
    }
  });

  // Object storage routes
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.session?.user?.id;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Profile image upload route
  app.post("/api/profile/upload-image", isAuthenticated, upload.single("profileImage"), async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(400).json({ message: "User ID not found" });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }
      
      // Check if it's an image file
      const allowedImageTypes = /jpeg|jpg|png|gif/;
      const extname = allowedImageTypes.test(path.extname(req.file.originalname).toLowerCase());
      const mimetype = allowedImageTypes.test(req.file.mimetype);
      
      if (!mimetype || !extname) {
        // Remove the uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "Only image files (JPEG, PNG, GIF) are allowed" });
      }
      
      // Generate a unique filename
      const uniqueFilename = `profile_${userId}_${Date.now()}${path.extname(req.file.originalname)}`;
      const newPath = path.join("uploads", "profiles", uniqueFilename);
      
      // Ensure profiles directory exists
      const profilesDir = path.join("uploads", "profiles");
      if (!fs.existsSync(profilesDir)) {
        fs.mkdirSync(profilesDir, { recursive: true });
      }
      
      // Move file to profiles directory
      fs.renameSync(req.file.path, newPath);
      
      // Generate the URL for the profile image
      const profileImageUrl = `/api/profile-images/${uniqueFilename}`;
      
      // Update user profile with the new image URL
      await storage.updateUser(userId, { profileImageUrl });
      
      res.json({ profileImageUrl });
    } catch (error) {
      console.error("Error uploading profile image:", error);
      res.status(500).json({ message: "Failed to upload profile image" });
    }
  });
  
  // Serve profile images
  app.get("/api/profile-images/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join("uploads", "profiles", filename);
    
    if (fs.existsSync(filePath)) {
      res.sendFile(path.resolve(filePath));
    } else {
      res.status(404).json({ message: "Image not found" });
    }
  });

  // Users route (for communication functionality)
  app.get("/api/users", isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update message status
  app.patch("/api/messages/:id", isAuthenticated, async (req, res) => {
    try {
      const message = await storage.updateMessage(req.params.id, req.body);
      res.json(message);
    } catch (error) {
      console.error("Error updating message:", error);
      res.status(500).json({ message: "Failed to update message" });
    }
  });

  // User management routes (admin, supervisor, and super admin)
  const requireAdminOrSupervisor = async (req: any, res: any, next: any) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || (user.role !== "admin" && user.role !== "supervisor" && user.role !== "super_admin" && user.role !== "office_admin")) {
        return res.status(403).json({ message: "Access denied. Admin, supervisor, or super admin role required." });
      }
      next();
    } catch (error) {
      return res.status(500).json({ message: "Failed to verify permissions" });
    }
  };

  // Super admin only routes
  const requireSuperAdmin = async (req: any, res: any, next: any) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const user = await storage.getUser(userId);
      if (!user || user.role !== "super_admin") {
        return res.status(403).json({ message: "Access denied. Super admin role required." });
      }
      next();
    } catch (error) {
      return res.status(500).json({ message: "Failed to verify permissions" });
    }
  };

  // Create user with password (for office managers to create staff/caregiver accounts)
  app.post("/api/users", isAuthenticated, requireAdminOrSupervisor, async (req: any, res) => {
    try {
      const { password, ...userData } = req.body;
      const currentUser = req.session?.user;
      
      if (!password || password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      // Office admins can only create users in their office
      if (currentUser.role === "office_admin") {
        if (!userData.primaryOfficeId) {
          userData.primaryOfficeId = currentUser.primaryOfficeId;
        } else if (userData.primaryOfficeId !== currentUser.primaryOfficeId) {
          return res.status(403).json({ message: "Cannot create users for other offices" });
        }
        // Office admins cannot create super_admin or admin users
        if (userData.role === "super_admin" || userData.role === "admin") {
          return res.status(403).json({ message: "Cannot create admin or super admin users" });
        }
      }

      // Check if username already exists (email duplicates are allowed)
      if (userData.username) {
        const existingUser = await storage.getUserByUsernameOrEmail(userData.username);
        if (existingUser) {
          return res.status(400).json({ message: "Username already exists" });
        }
      }

      const passwordHash = await hashPassword(password);
      const validatedData = insertUserSchema.omit({ id: true, createdAt: true, updatedAt: true }).parse({
        ...userData,
        passwordHash,
        mustResetPassword: true, // Force password change on first login
      });
      const user = await storage.createUser(validatedData);
      
      // Return user without password hash
      const { passwordHash: _, ...safeUser } = user as any;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ message: "Failed to create user" });
    }
  });

  // Allow users to update their own profile (limited fields)
  app.put("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(400).json({ message: "User ID not found" });
      }
      
      // Only allow updating specific profile fields with explicit property access
      const sanitizedData: any = {};
      if (req.body.firstName !== undefined) {
        sanitizedData.firstName = req.body.firstName;
      }
      if (req.body.lastName !== undefined) {
        sanitizedData.lastName = req.body.lastName;
      }
      if (req.body.profileImageUrl !== undefined) {
        sanitizedData.profileImageUrl = req.body.profileImageUrl;
      }
      
      const validatedData = insertUserSchema.partial().omit({ 
        id: true, 
        createdAt: true, 
        updatedAt: true,
        email: true,
        role: true,
        primaryOfficeId: true,
        isActive: true
      }).parse(sanitizedData);
      
      const user = await storage.updateUser(userId, validatedData);
      res.json(user);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(400).json({ message: "Failed to update profile" });
    }
  });

  app.put("/api/users/:id", isAuthenticated, requireAdminOrSupervisor, async (req, res) => {
    try {
      const validatedData = insertUserSchema.partial().omit({ id: true, createdAt: true, updatedAt: true }).parse(req.body);
      const user = await storage.updateUser(req.params.id, validatedData);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(400).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, requireAdminOrSupervisor, async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Users bulk import
  app.post("/api/users/bulk-import", isAuthenticated, requireAdminOrSupervisor, async (req: any, res) => {
    try {
      const { data } = req.body;
      
      if (!Array.isArray(data) || data.length === 0) {
        return res.status(400).json({ message: "Invalid data format" });
      }

      interface BulkImportError {
        row: number;
        error: string;
      }
      
      const results: {
        totalRows: number;
        successfulImports: number;
        errors: BulkImportError[];
      } = {
        totalRows: data.length,
        successfulImports: 0,
        errors: []
      };

      for (let i = 0; i < data.length; i++) {
        try {
          const userData = data[i];
          
          // Process date fields
          if (userData.dateOfBirth && typeof userData.dateOfBirth === 'string') {
            userData.dateOfBirth = new Date(userData.dateOfBirth);
          }
          
          // Handle isActive field
          if (userData.isActive !== undefined) {
            userData.isActive = userData.isActive === 'Yes' || userData.isActive === 'true' || userData.isActive === true;
          }
          
          // Validate the data
          const validatedData = insertUserSchema.omit({ id: true, createdAt: true, updatedAt: true }).parse(userData);
          
          // Create the user
          const user = await storage.createUser(validatedData);
          
          // Log audit trail
          await storage.createAuditLog({
            userId: req.session?.user?.id,
            action: "bulk_import_create",
            entityType: "user",
            entityId: user.id,
            newValues: { email: user.email, role: user.role },
            ipAddress: req.ip,
            userAgent: req.get("User-Agent"),
          });
          
          results.successfulImports++;
        } catch (error: any) {
          const sanitizedError = error.message?.includes('duplicate') ? 'Record already exists' : 
                                error.message?.includes('validation') ? 'Invalid data format' :
                                'Failed to import record';
          results.errors.push({
            row: i + 1,
            error: sanitizedError
          });
        }
      }

      res.json(results);
    } catch (error) {
      console.error("Error during bulk user import:", error);
      res.status(500).json({ message: "Failed to import users" });
    }
  });

  // Reports API endpoints
  app.get("/api/training-records", isAuthenticated, async (req, res) => {
    try {
      const records = await storage.getAllTrainingRecords();
      res.json(records);
    } catch (error) {
      console.error("Error fetching training records:", error);
      res.status(500).json({ message: "Failed to fetch training records" });
    }
  });

  app.get("/api/certifications", isAuthenticated, async (req, res) => {
    try {
      const certifications = await storage.getAllCertifications();
      res.json(certifications);
    } catch (error) {
      console.error("Error fetching certifications:", error);
      res.status(500).json({ message: "Failed to fetch certifications" });
    }
  });

  // Incident reports routes
  app.get("/api/incident-reports", isAuthenticated, async (req, res) => {
    try {
      const { officeId } = req.query;
      const officeFilter = officeId && officeId !== 'all' ? String(officeId) : undefined;
      const incidents = await storage.getAllIncidentReports(officeFilter);
      res.json(incidents);
    } catch (error) {
      console.error("Error fetching incident reports:", error);
      res.status(500).json({ message: "Failed to fetch incident reports" });
    }
  });

  app.post("/api/incident-reports", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertIncidentReportSchema.parse({
        ...req.body,
        reportedBy: req.session?.user?.id,
      });
      const incident = await storage.createIncidentReport(validatedData);
      res.status(201).json(incident);
    } catch (error) {
      console.error("Error creating incident report:", error);
      res.status(400).json({ message: "Failed to create incident report" });
    }
  });

  app.get("/api/incident-reports/:id", isAuthenticated, async (req, res) => {
    try {
      const incident = await storage.getIncidentReport(req.params.id);
      if (!incident) {
        return res.status(404).json({ message: "Incident report not found" });
      }
      res.json(incident);
    } catch (error) {
      console.error("Error fetching incident report:", error);
      res.status(500).json({ message: "Failed to fetch incident report" });
    }
  });

  app.put("/api/incident-reports/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertIncidentReportSchema.partial().parse(req.body);
      const incident = await storage.updateIncidentReport(req.params.id, validatedData);
      res.json(incident);
    } catch (error) {
      console.error("Error updating incident report:", error);
      res.status(400).json({ message: "Failed to update incident report" });
    }
  });

  // Incident Follow-up Routes
  app.get("/api/incidents/:id/follow-ups", isAuthenticated, async (req, res) => {
    try {
      const followUps = await storage.getIncidentFollowUps(req.params.id);
      res.json(followUps);
    } catch (error) {
      console.error("Error fetching incident follow-ups:", error);
      res.status(500).json({ message: "Failed to fetch incident follow-ups" });
    }
  });

  app.post("/api/incidents/:id/follow-ups", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertIncidentFollowUpSchema.parse({
        ...req.body,
        incidentId: req.params.id,
        dueDate: coerceDate(req.body.dueDate),
        createdBy: req.session?.user?.id,
      });
      const followUp = await storage.createIncidentFollowUp(validatedData);
      res.status(201).json(followUp);
    } catch (error) {
      console.error("Error creating incident follow-up:", error);
      res.status(400).json({ message: "Failed to create incident follow-up" });
    }
  });

  app.patch("/api/follow-ups/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertIncidentFollowUpSchema.partial().parse({
        ...req.body,
        dueDate: coerceDate(req.body.dueDate),
      });
      const followUp = await storage.updateIncidentFollowUp(req.params.id, validatedData);
      res.json(followUp);
    } catch (error) {
      console.error("Error updating incident follow-up:", error);
      res.status(400).json({ message: "Failed to update incident follow-up" });
    }
  });

  app.post("/api/follow-ups/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const followUp = await storage.completeFollowUp(req.params.id, userId);
      res.json(followUp);
    } catch (error) {
      console.error("Error completing incident follow-up:", error);
      res.status(400).json({ message: "Failed to complete incident follow-up" });
    }
  });

  app.get("/api/follow-ups/overdue", isAuthenticated, async (req, res) => {
    try {
      const overdueFollowUps = await storage.getOverdueFollowUps();
      res.json(overdueFollowUps);
    } catch (error) {
      console.error("Error fetching overdue follow-ups:", error);
      res.status(500).json({ message: "Failed to fetch overdue follow-ups" });
    }
  });

  app.get("/api/follow-ups/my", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      const followUps = await storage.getFollowUpsByAssignee(userId);
      res.json(followUps);
    } catch (error) {
      console.error("Error fetching assigned follow-ups:", error);
      res.status(500).json({ message: "Failed to fetch assigned follow-ups" });
    }
  });

  // Family Portal API Routes
  
  // Family member management routes
  app.get("/api/family-members/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "family") {
        return res.status(403).json({ message: "Access denied. Family member role required." });
      }
      
      const familyMember = await storage.getFamilyMemberByUserId(userId);
      if (!familyMember) {
        return res.status(404).json({ message: "Family member profile not found" });
      }
      
      res.json(familyMember);
    } catch (error) {
      console.error("Error fetching family member profile:", error);
      res.status(500).json({ message: "Failed to fetch family member profile" });
    }
  });

  // Get clients for the family member
  app.get("/api/family-members/me/clients", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const user = await storage.getUser(userId);
      
      if (user?.role !== "family") {
        return res.status(403).json({ message: "Access denied. Family member role required." });
      }
      
      const familyMember = await storage.getFamilyMemberByUserId(userId);
      if (!familyMember) {
        return res.status(404).json({ message: "Family member profile not found" });
      }
      
      const clients = await storage.getFamilyMemberClients(familyMember.id);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching family member clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  // Get client details with access permissions
  app.get("/api/family-portal/client/:clientId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const user = await storage.getUser(userId);
      const { clientId } = req.params;
      
      if (user?.role !== "family") {
        return res.status(403).json({ message: "Access denied. Family member role required." });
      }
      
      const familyMember = await storage.getFamilyMemberByUserId(userId);
      if (!familyMember) {
        return res.status(404).json({ message: "Family member profile not found" });
      }
      
      // Check if family member has access to this client
      const clientRelationships = await storage.getFamilyMemberClients(familyMember.id);
      const relationship = clientRelationships.find(r => r.client.id === clientId);
      
      if (!relationship) {
        return res.status(403).json({ message: "Access denied to this client" });
      }
      
      res.json({
        client: relationship.client,
        accessPermissions: {
          canViewCarePlans: relationship.canViewCarePlans,
          canViewProgressNotes: relationship.canViewProgressNotes,
          canViewDocuments: relationship.canViewDocuments,
          canViewIncidentReports: relationship.canViewIncidentReports,
          accessLevel: relationship.accessLevel
        }
      });
    } catch (error) {
      console.error("Error fetching client details:", error);
      res.status(500).json({ message: "Failed to fetch client details" });
    }
  });

  // Get care plans for a client (with permission check)
  app.get("/api/family-portal/client/:clientId/care-plans", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const user = await storage.getUser(userId);
      const { clientId } = req.params;
      
      if (user?.role !== "family") {
        return res.status(403).json({ message: "Access denied. Family member role required." });
      }
      
      const familyMember = await storage.getFamilyMemberByUserId(userId);
      if (!familyMember) {
        return res.status(404).json({ message: "Family member profile not found" });
      }
      
      // Check if family member has access to view care plans for this client
      const clientRelationships = await storage.getFamilyMemberClients(familyMember.id);
      const relationship = clientRelationships.find(r => r.client.id === clientId);
      
      if (!relationship || !relationship.canViewCarePlans) {
        return res.status(403).json({ message: "Access denied to care plans" });
      }
      
      const carePlans = await storage.getCarePlansByClient(clientId);
      res.json(carePlans);
    } catch (error) {
      console.error("Error fetching care plans:", error);
      res.status(500).json({ message: "Failed to fetch care plans" });
    }
  });

  // Get progress notes for a client (with permission check)
  app.get("/api/family-portal/client/:clientId/progress-notes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const user = await storage.getUser(userId);
      const { clientId } = req.params;
      
      if (user?.role !== "family") {
        return res.status(403).json({ message: "Access denied. Family member role required." });
      }
      
      const familyMember = await storage.getFamilyMemberByUserId(userId);
      if (!familyMember) {
        return res.status(404).json({ message: "Family member profile not found" });
      }
      
      // Check if family member has access to view progress notes for this client
      const clientRelationships = await storage.getFamilyMemberClients(familyMember.id);
      const relationship = clientRelationships.find(r => r.client.id === clientId);
      
      if (!relationship || !relationship.canViewProgressNotes) {
        return res.status(403).json({ message: "Access denied to progress notes" });
      }
      
      const progressNotes = await storage.getProgressNotesByClient(clientId);
      res.json(progressNotes);
    } catch (error) {
      console.error("Error fetching progress notes:", error);
      res.status(500).json({ message: "Failed to fetch progress notes" });
    }
  });

  // Submit family update request
  app.post("/api/family-portal/client/:clientId/update-request", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const user = await storage.getUser(userId);
      const { clientId } = req.params;
      
      if (user?.role !== "family") {
        return res.status(403).json({ message: "Access denied. Family member role required." });
      }
      
      const familyMember = await storage.getFamilyMemberByUserId(userId);
      if (!familyMember) {
        return res.status(404).json({ message: "Family member profile not found" });
      }
      
      // Check if family member has access to update info for this client
      const clientRelationships = await storage.getFamilyMemberClients(familyMember.id);
      const relationship = clientRelationships.find(r => r.client.id === clientId);
      
      if (!relationship || relationship.accessLevel === "view_only") {
        return res.status(403).json({ message: "Access denied to submit updates" });
      }
      
      const validatedData = insertFamilyUpdateSchema.parse({
        ...req.body,
        clientId,
        submittedBy: userId,
      });
      
      const familyUpdate = await storage.createFamilyUpdate(validatedData);
      res.status(201).json(familyUpdate);
    } catch (error) {
      console.error("Error creating family update request:", error);
      res.status(400).json({ message: "Failed to create update request" });
    }
  });

  // Get family update requests
  app.get("/api/family-portal/client/:clientId/update-requests", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const user = await storage.getUser(userId);
      const { clientId } = req.params;
      
      if (user?.role !== "family") {
        return res.status(403).json({ message: "Access denied. Family member role required." });
      }
      
      const familyMember = await storage.getFamilyMemberByUserId(userId);
      if (!familyMember) {
        return res.status(404).json({ message: "Family member profile not found" });
      }
      
      // Check if family member has access to this client
      const clientRelationships = await storage.getFamilyMemberClients(familyMember.id);
      const relationship = clientRelationships.find(r => r.client.id === clientId);
      
      if (!relationship) {
        return res.status(403).json({ message: "Access denied to this client" });
      }
      
      const updates = await storage.getFamilyUpdates(clientId, familyMember.id);
      res.json(updates);
    } catch (error) {
      console.error("Error fetching family update requests:", error);
      res.status(500).json({ message: "Failed to fetch update requests" });
    }
  });

  // Staff routes for managing family update requests
  app.get("/api/admin/family-updates", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const user = await storage.getUser(userId);
      
      // Only admin, supervisor roles can view all family updates
      if (!["admin", "supervisor", "super_admin"].includes(user?.role || "")) {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }
      
      const updates = await storage.getFamilyUpdates();
      res.json(updates);
    } catch (error) {
      console.error("Error fetching family updates:", error);
      res.status(500).json({ message: "Failed to fetch family updates" });
    }
  });

  app.put("/api/admin/family-updates/:id/review", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const user = await storage.getUser(userId);
      const { id } = req.params;
      const { status, reviewNotes } = req.body;
      
      // Only admin, supervisor roles can review family updates
      if (!["admin", "supervisor", "super_admin"].includes(user?.role || "")) {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }
      
      const update = await storage.reviewFamilyUpdate(id, userId, status, reviewNotes);
      res.json(update);
    } catch (error) {
      console.error("Error reviewing family update:", error);
      res.status(400).json({ message: "Failed to review update" });
    }
  });

  // Role and Permission Management routes
  // Custom roles
  app.get("/api/custom-roles", isAuthenticated, async (req, res) => {
    try {
      const roles = await storage.getAllCustomRoles();
      res.json(roles);
    } catch (error) {
      console.error("Error fetching custom roles:", error);
      res.status(500).json({ message: "Failed to fetch custom roles" });
    }
  });

  app.get("/api/custom-roles/:id", isAuthenticated, async (req, res) => {
    try {
      const role = await storage.getCustomRole(req.params.id);
      if (!role) {
        return res.status(404).json({ message: "Custom role not found" });
      }
      res.json(role);
    } catch (error) {
      console.error("Error fetching custom role:", error);
      res.status(500).json({ message: "Failed to fetch custom role" });
    }
  });

  app.post("/api/custom-roles", isAuthenticated, async (req, res) => {
    try {
      const roleData = insertCustomRoleSchema.parse(req.body);
      const role = await storage.createCustomRole(roleData);
      res.status(201).json(role);
    } catch (error) {
      console.error("Error creating custom role:", error);
      res.status(500).json({ message: "Failed to create custom role" });
    }
  });

  app.put("/api/custom-roles/:id", isAuthenticated, async (req, res) => {
    try {
      const roleData = insertCustomRoleSchema.partial().parse(req.body);
      const role = await storage.updateCustomRole(req.params.id, roleData);
      res.json(role);
    } catch (error) {
      console.error("Error updating custom role:", error);
      res.status(500).json({ message: "Failed to update custom role" });
    }
  });

  app.delete("/api/custom-roles/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteCustomRole(req.params.id);
      res.json({ message: "Custom role deleted successfully" });
    } catch (error) {
      console.error("Error deleting custom role:", error);
      res.status(500).json({ message: "Failed to delete custom role" });
    }
  });

  // Permissions
  app.get("/api/permissions", isAuthenticated, async (req, res) => {
    try {
      const permissions = await storage.getAllPermissions();
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching permissions:", error);
      res.status(500).json({ message: "Failed to fetch permissions" });
    }
  });

  app.get("/api/permissions/category/:category", isAuthenticated, async (req, res) => {
    try {
      const permissions = await storage.getPermissionsByCategory(req.params.category);
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching permissions by category:", error);
      res.status(500).json({ message: "Failed to fetch permissions by category" });
    }
  });

  app.post("/api/permissions", isAuthenticated, async (req, res) => {
    try {
      const permissionData = insertPermissionSchema.parse(req.body);
      const permission = await storage.createPermission(permissionData);
      res.status(201).json(permission);
    } catch (error) {
      console.error("Error creating permission:", error);
      res.status(500).json({ message: "Failed to create permission" });
    }
  });

  // Role permissions
  app.get("/api/custom-roles/:roleId/permissions", isAuthenticated, async (req, res) => {
    try {
      const permissions = await storage.getRolePermissions(req.params.roleId);
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching role permissions:", error);
      res.status(500).json({ message: "Failed to fetch role permissions" });
    }
  });

  app.post("/api/custom-roles/:roleId/permissions", isAuthenticated, async (req, res) => {
    try {
      const rolePermissionData = insertRolePermissionSchema.parse({
        roleId: req.params.roleId,
        permissionId: req.body.permissionId,
      });
      const rolePermission = await storage.addPermissionToRole(rolePermissionData);
      res.status(201).json(rolePermission);
    } catch (error) {
      console.error("Error adding permission to role:", error);
      res.status(500).json({ message: "Failed to add permission to role" });
    }
  });

  app.delete("/api/custom-roles/:roleId/permissions/:permissionId", isAuthenticated, async (req, res) => {
    try {
      await storage.removePermissionFromRole(req.params.roleId, req.params.permissionId);
      res.json({ message: "Permission removed from role successfully" });
    } catch (error) {
      console.error("Error removing permission from role:", error);
      res.status(500).json({ message: "Failed to remove permission from role" });
    }
  });

  // User roles
  app.get("/api/users/:userId/custom-roles", isAuthenticated, async (req, res) => {
    try {
      const roles = await storage.getUserCustomRoles(req.params.userId);
      res.json(roles);
    } catch (error) {
      console.error("Error fetching user custom roles:", error);
      res.status(500).json({ message: "Failed to fetch user custom roles" });
    }
  });

  app.post("/api/users/:userId/custom-roles", isAuthenticated, async (req, res) => {
    try {
      const userRoleData = insertUserCustomRoleSchema.parse({
        userId: req.params.userId,
        roleId: req.body.roleId,
        assignedBy: req.body.assignedBy,
        isActive: true,
      });
      const userRole = await storage.assignRoleToUser(userRoleData);
      res.status(201).json(userRole);
    } catch (error) {
      console.error("Error assigning role to user:", error);
      res.status(500).json({ message: "Failed to assign role to user" });
    }
  });

  app.delete("/api/users/:userId/custom-roles/:roleId", isAuthenticated, async (req, res) => {
    try {
      await storage.removeRoleFromUser(req.params.userId, req.params.roleId);
      res.json({ message: "Role removed from user successfully" });
    } catch (error) {
      console.error("Error removing role from user:", error);
      res.status(500).json({ message: "Failed to remove role from user" });
    }
  });

  app.get("/api/users/:userId/permissions", isAuthenticated, async (req, res) => {
    try {
      const permissions = await storage.getUserPermissions(req.params.userId);
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      res.status(500).json({ message: "Failed to fetch user permissions" });
    }
  });

  // Create multiple roles at once
  app.post("/api/custom-roles/bulk", isAuthenticated, async (req, res) => {
    try {
      const rolesData = req.body.roles;
      const createdRoles = [];
      
      for (const roleData of rolesData) {
        try {
          const validatedData = insertCustomRoleSchema.parse(roleData);
          const role = await storage.createCustomRole(validatedData);
          createdRoles.push(role);
        } catch (error) {
          console.error(`Error creating role ${roleData.name}:`, error);
        }
      }
      
      res.json({ 
        message: "Roles created successfully", 
        created: createdRoles.length,
        roles: createdRoles
      });
    } catch (error) {
      console.error("Error creating bulk roles:", error);
      res.status(500).json({ message: "Failed to create roles" });
    }
  });

  // Seed default permissions (for super admin use)
  app.post("/api/permissions/seed", isAuthenticated, async (req, res) => {
    try {
      const defaultPermissions = [
        // Client Management
        { name: "clients.view", displayName: "View Clients", description: "View client information", category: "Client Management", resource: "clients", action: "view", isSystemPermission: true },
        { name: "clients.create", displayName: "Create Clients", description: "Create new clients", category: "Client Management", resource: "clients", action: "create", isSystemPermission: true },
        { name: "clients.edit", displayName: "Edit Clients", description: "Edit client information", category: "Client Management", resource: "clients", action: "edit", isSystemPermission: true },
        { name: "clients.delete", displayName: "Delete Clients", description: "Delete clients", category: "Client Management", resource: "clients", action: "delete", isSystemPermission: true },
        
        // Caregiver Management
        { name: "caregivers.view", displayName: "View Caregivers", description: "View caregiver information", category: "Caregiver Management", resource: "caregivers", action: "view", isSystemPermission: true },
        { name: "caregivers.create", displayName: "Create Caregivers", description: "Create new caregivers", category: "Caregiver Management", resource: "caregivers", action: "create", isSystemPermission: true },
        { name: "caregivers.edit", displayName: "Edit Caregivers", description: "Edit caregiver information", category: "Caregiver Management", resource: "caregivers", action: "edit", isSystemPermission: true },
        { name: "caregivers.delete", displayName: "Delete Caregivers", description: "Delete caregivers", category: "Caregiver Management", resource: "caregivers", action: "delete", isSystemPermission: true },
        
        // Care Plans
        { name: "careplans.view", displayName: "View Care Plans", description: "View care plans", category: "Care Planning", resource: "careplans", action: "view", isSystemPermission: true },
        { name: "careplans.create", displayName: "Create Care Plans", description: "Create care plans", category: "Care Planning", resource: "careplans", action: "create", isSystemPermission: true },
        { name: "careplans.edit", displayName: "Edit Care Plans", description: "Edit care plans", category: "Care Planning", resource: "careplans", action: "edit", isSystemPermission: true },
        
        // Progress Notes
        { name: "progress.view", displayName: "View Progress Notes", description: "View progress notes", category: "Progress Tracking", resource: "progress", action: "view", isSystemPermission: true },
        { name: "progress.create", displayName: "Create Progress Notes", description: "Create progress notes", category: "Progress Tracking", resource: "progress", action: "create", isSystemPermission: true },
        
        // Documents
        { name: "documents.view", displayName: "View Documents", description: "View documents", category: "Document Management", resource: "documents", action: "view", isSystemPermission: true },
        { name: "documents.upload", displayName: "Upload Documents", description: "Upload documents", category: "Document Management", resource: "documents", action: "upload", isSystemPermission: true },
        { name: "documents.delete", displayName: "Delete Documents", description: "Delete documents", category: "Document Management", resource: "documents", action: "delete", isSystemPermission: true },
        
        // Compliance
        { name: "compliance.view", displayName: "View Compliance", description: "View compliance information", category: "Compliance", resource: "compliance", action: "view", isSystemPermission: true },
        { name: "compliance.manage", displayName: "Manage Compliance", description: "Manage compliance items", category: "Compliance", resource: "compliance", action: "manage", isSystemPermission: true },
        
        // Training
        { name: "training.view", displayName: "View Training", description: "View training information", category: "Training", resource: "training", action: "view", isSystemPermission: true },
        { name: "training.create", displayName: "Create Training", description: "Create training sessions", category: "Training", resource: "training", action: "create", isSystemPermission: true },
        { name: "training.manage", displayName: "Manage Training", description: "Manage training records", category: "Training", resource: "training", action: "manage", isSystemPermission: true },
        
        // Incidents
        { name: "incidents.view", displayName: "View Incidents", description: "View incident reports", category: "Incident Management", resource: "incidents", action: "view", isSystemPermission: true },
        { name: "incidents.create", displayName: "Create Incidents", description: "Create incident reports", category: "Incident Management", resource: "incidents", action: "create", isSystemPermission: true },
        { name: "incidents.manage", displayName: "Manage Incidents", description: "Manage incident reports", category: "Incident Management", resource: "incidents", action: "manage", isSystemPermission: true },
        
        // Communication
        { name: "messages.view", displayName: "View Messages", description: "View messages", category: "Communication", resource: "messages", action: "view", isSystemPermission: true },
        { name: "messages.send", displayName: "Send Messages", description: "Send messages", category: "Communication", resource: "messages", action: "send", isSystemPermission: true },
        
        // Reports
        { name: "reports.view", displayName: "View Reports", description: "View reports", category: "Reporting", resource: "reports", action: "view", isSystemPermission: true },
        { name: "reports.export", displayName: "Export Reports", description: "Export reports", category: "Reporting", resource: "reports", action: "export", isSystemPermission: true },
        
        // Administration
        { name: "users.view", displayName: "View Users", description: "View user information", category: "Administration", resource: "users", action: "view", isSystemPermission: true },
        { name: "users.create", displayName: "Create Users", description: "Create new users", category: "Administration", resource: "users", action: "create", isSystemPermission: true },
        { name: "users.edit", displayName: "Edit Users", description: "Edit user information", category: "Administration", resource: "users", action: "edit", isSystemPermission: true },
        { name: "offices.manage", displayName: "Manage Offices", description: "Manage office locations", category: "Administration", resource: "offices", action: "manage", isSystemPermission: true },
        { name: "roles.manage", displayName: "Manage Roles", description: "Manage custom roles and permissions", category: "Administration", resource: "roles", action: "manage", isSystemPermission: true },
      ];

      const createdPermissions = [];
      for (const permission of defaultPermissions) {
        try {
          const created = await storage.createPermission(permission);
          createdPermissions.push(created);
        } catch (error) {
          // Permission might already exist, continue
        }
      }

      res.json({ 
        message: "Default permissions seeded successfully", 
        created: createdPermissions.length,
        total: defaultPermissions.length
      });
    } catch (error) {
      console.error("Error seeding permissions:", error);
      res.status(500).json({ message: "Failed to seed permissions" });
    }
  });

  // Scheduling API Routes
  
  // Master Week Templates
  app.get("/api/clients/:clientId/master-week-templates", isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getMasterWeekTemplatesByClient(req.params.clientId);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching master week templates:", error);
      res.status(500).json({ message: "Failed to fetch master week templates" });
    }
  });

  app.post("/api/master-week-templates", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertMasterWeekTemplateSchema.parse({
        ...req.body,
        startDate: coerceDate(req.body.startDate),
        endDate: coerceDate(req.body.endDate),
        createdBy: req.session?.user?.id,
      });
      const template = await storage.createMasterWeekTemplate(validatedData);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating master week template:", error);
      res.status(400).json({ message: "Failed to create master week template" });
    }
  });

  app.put("/api/master-week-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertMasterWeekTemplateSchema.partial().parse({
        ...req.body,
        startDate: coerceDate(req.body.startDate),
        endDate: coerceDate(req.body.endDate),
      });
      const template = await storage.updateMasterWeekTemplate(req.params.id, validatedData);
      res.json(template);
    } catch (error) {
      console.error("Error updating master week template:", error);
      res.status(400).json({ message: "Failed to update master week template" });
    }
  });

  app.delete("/api/master-week-templates/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteMasterWeekTemplate(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting master week template:", error);
      res.status(400).json({ message: "Failed to delete master week template" });
    }
  });

  // Master Week Slots
  app.get("/api/master-week-templates/:templateId/slots", isAuthenticated, async (req, res) => {
    try {
      const slots = await storage.getMasterWeekSlots(req.params.templateId);
      res.json(slots);
    } catch (error) {
      console.error("Error fetching master week slots:", error);
      res.status(500).json({ message: "Failed to fetch master week slots" });
    }
  });

  app.post("/api/master-week-slots", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertMasterWeekSlotSchema.parse(req.body);
      const slot = await storage.createMasterWeekSlot(validatedData);
      res.status(201).json(slot);
    } catch (error) {
      console.error("Error creating master week slot:", error);
      res.status(400).json({ message: "Failed to create master week slot" });
    }
  });

  app.put("/api/master-week-slots/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertMasterWeekSlotSchema.partial().parse(req.body);
      const slot = await storage.updateMasterWeekSlot(req.params.id, validatedData);
      res.json(slot);
    } catch (error) {
      console.error("Error updating master week slot:", error);
      res.status(400).json({ message: "Failed to update master week slot" });
    }
  });

  app.delete("/api/master-week-slots/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteMasterWeekSlot(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting master week slot:", error);
      res.status(400).json({ message: "Failed to delete master week slot" });
    }
  });

  // Client Schedules
  app.get("/api/clients/:clientId/schedules", isAuthenticated, async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const schedules = await storage.getClientSchedules(req.params.clientId, startDate, endDate);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching client schedules:", error);
      res.status(500).json({ message: "Failed to fetch client schedules" });
    }
  });

  app.get("/api/caregivers/:caregiverId/schedules", isAuthenticated, async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const schedules = await storage.getSchedulesByCaregiver(req.params.caregiverId, startDate, endDate);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching caregiver schedules:", error);
      res.status(500).json({ message: "Failed to fetch caregiver schedules" });
    }
  });

  app.post("/api/client-schedules", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertClientScheduleSchema.parse({
        ...req.body,
        createdBy: req.session?.user?.id,
      });
      const schedule = await storage.createClientSchedule(validatedData);
      
      // Log the creation
      await storage.createScheduleChangeLog({
        scheduleId: schedule.id,
        changeType: 'created',
        newValues: schedule,
        changedBy: req.session?.user?.id,
        reason: 'Schedule created manually'
      });
      
      res.status(201).json(schedule);
    } catch (error) {
      console.error("Error creating client schedule:", error);
      res.status(400).json({ message: "Failed to create client schedule" });
    }
  });

  app.put("/api/client-schedules/:id", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertClientScheduleSchema.partial().parse(req.body);
      const schedule = await storage.updateClientSchedule(req.params.id, validatedData);
      
      // Log the update
      await storage.createScheduleChangeLog({
        scheduleId: schedule.id,
        changeType: 'updated',
        newValues: validatedData,
        changedBy: req.session?.user?.id,
        reason: req.body.reason || 'Schedule updated'
      });
      
      res.json(schedule);
    } catch (error) {
      console.error("Error updating client schedule:", error);
      res.status(400).json({ message: "Failed to update client schedule" });
    }
  });

  app.delete("/api/client-schedules/:id", isAuthenticated, async (req: any, res) => {
    try {
      // Log the deletion before deleting
      await storage.createScheduleChangeLog({
        scheduleId: req.params.id,
        changeType: 'cancelled',
        changedBy: req.session?.user?.id,
        reason: req.body.reason || 'Schedule cancelled'
      });
      
      await storage.deleteClientSchedule(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client schedule:", error);
      res.status(400).json({ message: "Failed to delete client schedule" });
    }
  });

  // Master Week Rollover
  app.post("/api/master-week-templates/:id/apply", isAuthenticated, async (req: any, res) => {
    try {
      const { fromDate, toDate } = req.body;
      console.log("[Apply] Received request with fromDate:", fromDate, "toDate:", toDate);
      if (!fromDate || !toDate) {
        return res.status(400).json({ message: "From date and to date are required" });
      }

      console.log("[Apply] Calling applyMasterWeekToSchedules...");
      const schedules = await storage.applyMasterWeekToSchedules(req.params.id, new Date(fromDate), new Date(toDate));
      console.log("[Apply] Created", schedules.length, "schedules");
      
      // Log the rollover
      for (const schedule of schedules) {
        await storage.createScheduleChangeLog({
          scheduleId: schedule.id,
          changeType: 'created',
          newValues: schedule,
          changedBy: req.session?.user?.id,
          reason: 'Schedule created from master week template rollover'
        });
      }
      
      res.status(201).json({ 
        message: `Created ${schedules.length} schedule entries from master week template`,
        schedules 
      });
    } catch (error) {
      console.error("Error applying master week template:", error);
      res.status(400).json({ message: "Failed to apply master week template" });
    }
  });

  // Client MCO Management Routes
  app.get("/api/clients/:clientId/mcos", isAuthenticated, async (req, res) => {
    try {
      const mcos = await storage.getClientMcosByClient(req.params.clientId);
      res.json(mcos);
    } catch (error) {
      console.error("Error fetching client MCOs:", error);
      res.status(500).json({ message: "Failed to fetch client MCOs" });
    }
  });

  app.post("/api/clients/:clientId/mcos", isAuthenticated, async (req, res) => {
    try {
      const { clientId: _, ...userBody } = req.body;
      const coercedData = {
        ...userBody,
        startDate: coerceDate(userBody.startDate),
        dischargeDate: coerceDate(userBody.dischargeDate),
      };
      const validatedBody = insertClientMcoSchema.omit({ clientId: true }).parse(coercedData);
      const mco = await storage.createClientMco({
        ...validatedBody,
        clientId: req.params.clientId,
      });
      res.status(201).json(mco);
    } catch (error) {
      console.error("Error creating client MCO:", error);
      res.status(400).json({ message: "Failed to create client MCO" });
    }
  });

  app.put("/api/client-mcos/:id", isAuthenticated, async (req, res) => {
    try {
      const { clientId, ...updateData } = req.body;
      const coercedData = {
        ...updateData,
        startDate: coerceDate(updateData.startDate),
        dischargeDate: coerceDate(updateData.dischargeDate),
      };
      const validatedData = insertClientMcoSchema.partial().parse(coercedData);
      const mco = await storage.updateClientMco(req.params.id, validatedData);
      res.json(mco);
    } catch (error) {
      console.error("Error updating client MCO:", error);
      res.status(400).json({ message: "Failed to update client MCO" });
    }
  });

  app.delete("/api/client-mcos/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteClientMco(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client MCO:", error);
      res.status(400).json({ message: "Failed to delete client MCO" });
    }
  });

  // ==================== ELIGIBILITY CHECK ROUTES ====================
  app.get("/api/clients/:clientId/eligibility-checks", isAuthenticated, async (req, res) => {
    try {
      const checks = await storage.getEligibilityChecksByClient(req.params.clientId);
      res.json(checks);
    } catch (error) {
      console.error("Error fetching eligibility checks:", error);
      res.status(500).json({ message: "Failed to fetch eligibility checks" });
    }
  });

  app.get("/api/eligibility-checks/:id", isAuthenticated, async (req, res) => {
    try {
      const check = await storage.getEligibilityCheck(req.params.id);
      if (!check) {
        return res.status(404).json({ message: "Eligibility check not found" });
      }
      res.json(check);
    } catch (error) {
      console.error("Error fetching eligibility check:", error);
      res.status(500).json({ message: "Failed to fetch eligibility check" });
    }
  });

  app.post("/api/clients/:clientId/eligibility-checks", isAuthenticated, async (req: any, res) => {
    try {
      const { clientId: _, verifiedBy: __, ...userBody } = req.body;
      const coercedData = {
        ...userBody,
        checkDate: coerceDate(userBody.checkDate),
        coverageStartDate: coerceDate(userBody.coverageStartDate),
        coverageEndDate: coerceDate(userBody.coverageEndDate),
        expirationDate: coerceDate(userBody.expirationDate),
      };
      const validatedBody = insertEligibilityCheckSchema.omit({ clientId: true, verifiedBy: true }).parse(coercedData);
      const check = await storage.createEligibilityCheck({
        ...validatedBody,
        clientId: req.params.clientId,
        verifiedBy: req.session?.user?.id,
      });
      res.status(201).json(check);
    } catch (error) {
      console.error("Error creating eligibility check:", error);
      res.status(400).json({ message: "Failed to create eligibility check" });
    }
  });

  app.put("/api/eligibility-checks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { clientId, verifiedBy, ...updateData } = req.body;
      const coercedData = {
        ...updateData,
        checkDate: coerceDate(updateData.checkDate),
        coverageStartDate: coerceDate(updateData.coverageStartDate),
        coverageEndDate: coerceDate(updateData.coverageEndDate),
        expirationDate: coerceDate(updateData.expirationDate),
      };
      const validatedData = insertEligibilityCheckSchema.partial().parse(coercedData);
      const check = await storage.updateEligibilityCheck(req.params.id, {
        ...validatedData,
        verifiedBy: req.session?.user?.id,
      });
      res.json(check);
    } catch (error) {
      console.error("Error updating eligibility check:", error);
      res.status(400).json({ message: "Failed to update eligibility check" });
    }
  });

  app.delete("/api/eligibility-checks/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteEligibilityCheck(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting eligibility check:", error);
      res.status(400).json({ message: "Failed to delete eligibility check" });
    }
  });

  // Get eligibility history for a client (alias)
  app.get("/api/clients/:id/eligibility", isAuthenticated, async (req, res) => {
    try {
      const checks = await storage.getEligibilityChecksByClient(req.params.id);
      res.json(checks);
    } catch (error) {
      console.error("Error fetching eligibility history:", error);
      res.status(500).json({ message: "Failed to fetch eligibility history" });
    }
  });

  // Get latest eligibility check for a client
  app.get("/api/clients/:id/eligibility/latest", isAuthenticated, async (req, res) => {
    try {
      const check = await storage.getLatestEligibilityCheck(req.params.id);
      res.json(check || null);
    } catch (error) {
      console.error("Error fetching latest eligibility check:", error);
      res.status(500).json({ message: "Failed to fetch latest eligibility check" });
    }
  });

  // Trigger manual eligibility check
  app.post("/api/clients/:id/eligibility/check", isAuthenticated, async (req: any, res) => {
    try {
      const { checkType, payerId, memberId } = req.body;
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      // Create the eligibility check record
      const check = await storage.createEligibilityCheck({
        clientId: req.params.id,
        checkType: checkType || "medicaid",
        payerId: payerId || null,
        memberId: memberId || client.memberId,
        checkDate: new Date(),
        status: "pending",
        checkedBy: req.session?.user?.id || "system",
        verificationSource: "api",
      });
      
      // In a production system, this would trigger an actual API call to the payer
      // For now, we just create the check record and return it
      res.status(201).json(check);
    } catch (error) {
      console.error("Error triggering eligibility check:", error);
      res.status(400).json({ message: "Failed to trigger eligibility check" });
    }
  });

  // Get eligibility schedule for a client
  app.get("/api/clients/:id/eligibility/schedule", isAuthenticated, async (req, res) => {
    try {
      const schedule = await storage.getEligibilitySchedule(req.params.id);
      res.json(schedule || null);
    } catch (error) {
      console.error("Error fetching eligibility schedule:", error);
      res.status(500).json({ message: "Failed to fetch eligibility schedule" });
    }
  });

  // Create or update eligibility schedule for a client
  app.post("/api/clients/:id/eligibility/schedule", isAuthenticated, async (req: any, res) => {
    try {
      const { checkFrequency, isActive, checkType, payerId, notes } = req.body;
      
      // Check if schedule exists
      const existing = await storage.getEligibilitySchedule(req.params.id);
      
      // Calculate next check date based on frequency
      const calculateNextCheckDate = (frequency: string): Date => {
        const now = new Date();
        switch (frequency) {
          case "weekly":
            return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          case "monthly":
            return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
          case "quarterly":
            return new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
          default:
            return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        }
      };

      if (existing) {
        // Update existing schedule
        const updated = await storage.updateEligibilitySchedule(existing.id, {
          checkFrequency,
          isActive: isActive !== undefined ? isActive : existing.isActive,
          checkType: checkType || existing.checkType,
          payerId: payerId !== undefined ? payerId : existing.payerId,
          notes: notes !== undefined ? notes : existing.notes,
          nextCheckDate: calculateNextCheckDate(checkFrequency || existing.checkFrequency || "monthly"),
        });
        res.json(updated);
      } else {
        // Create new schedule
        const coercedData = {
          clientId: req.params.id,
          checkFrequency: checkFrequency || "monthly",
          isActive: isActive !== undefined ? isActive : true,
          checkType: checkType || "medicaid",
          payerId: payerId || null,
          notes: notes || null,
          nextCheckDate: calculateNextCheckDate(checkFrequency || "monthly"),
        };
        const validatedData = insertEligibilityScheduleSchema.parse(coercedData);
        const schedule = await storage.createEligibilitySchedule(validatedData);
        res.status(201).json(schedule);
      }
    } catch (error) {
      console.error("Error managing eligibility schedule:", error);
      res.status(400).json({ message: "Failed to manage eligibility schedule" });
    }
  });

  // Delete eligibility schedule for a client
  app.delete("/api/clients/:id/eligibility/schedule", isAuthenticated, async (req, res) => {
    try {
      const schedule = await storage.getEligibilitySchedule(req.params.id);
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      await storage.deleteEligibilitySchedule(schedule.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting eligibility schedule:", error);
      res.status(400).json({ message: "Failed to delete eligibility schedule" });
    }
  });

  // Get all clients due for eligibility check
  app.get("/api/eligibility/due", isAuthenticated, async (req, res) => {
    try {
      const dueSchedules = await storage.getDueEligibilityChecks();
      res.json(dueSchedules);
    } catch (error) {
      console.error("Error fetching due eligibility checks:", error);
      res.status(500).json({ message: "Failed to fetch due eligibility checks" });
    }
  });

  // Run all due eligibility checks (for cron job)
  app.post("/api/eligibility/run-scheduled", isAuthenticated, async (req: any, res) => {
    try {
      const dueSchedules = await storage.getDueEligibilityChecks();
      const results: { clientId: string; checkId: string; status: string }[] = [];

      for (const schedule of dueSchedules) {
        try {
          // Get client details
          const client = await storage.getClient(schedule.clientId);
          if (!client) continue;

          // Create the eligibility check
          const check = await storage.createEligibilityCheck({
            clientId: schedule.clientId,
            checkType: schedule.checkType || "medicaid",
            payerId: schedule.payerId || null,
            memberId: client.memberId,
            checkDate: new Date(),
            status: "pending",
            checkedBy: "system",
            verificationSource: "scheduled",
          });

          // Update schedule with last checked time and next check date
          const calculateNextCheckDate = (frequency: string | null): Date => {
            const now = new Date();
            switch (frequency) {
              case "weekly":
                return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
              case "monthly":
                return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
              case "quarterly":
                return new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
              default:
                return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
            }
          };

          await storage.updateEligibilitySchedule(schedule.id, {
            lastChecked: new Date(),
            nextCheckDate: calculateNextCheckDate(schedule.checkFrequency),
          });

          results.push({
            clientId: schedule.clientId,
            checkId: check.id,
            status: "created",
          });
        } catch (err) {
          console.error(`Error processing schedule ${schedule.id}:`, err);
          results.push({
            clientId: schedule.clientId,
            checkId: "",
            status: "error",
          });
        }
      }

      res.json({
        processed: results.length,
        results,
      });
    } catch (error) {
      console.error("Error running scheduled eligibility checks:", error);
      res.status(500).json({ message: "Failed to run scheduled eligibility checks" });
    }
  });

  // Update client eligibility status based on check result
  app.put("/api/clients/:id/eligibility/status", isAuthenticated, async (req: any, res) => {
    try {
      const { medicaidStatus, snapStatus } = req.body;
      const client = await storage.updateClientEligibilityStatus(
        req.params.id,
        medicaidStatus,
        snapStatus
      );
      res.json(client);
    } catch (error) {
      console.error("Error updating client eligibility status:", error);
      res.status(400).json({ message: "Failed to update client eligibility status" });
    }
  });

  // Caregiver Compliance Routes
  app.get("/api/caregivers/:caregiverId/compliance", isAuthenticated, async (req, res) => {
    try {
      const items = await storage.getCaregiverComplianceByCaregiver(req.params.caregiverId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching caregiver compliance:", error);
      res.status(500).json({ message: "Failed to fetch caregiver compliance" });
    }
  });

  app.get("/api/caregiver-compliance/:id", isAuthenticated, async (req, res) => {
    try {
      const item = await storage.getCaregiverCompliance(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Compliance item not found" });
      }
      res.json(item);
    } catch (error) {
      console.error("Error fetching compliance item:", error);
      res.status(500).json({ message: "Failed to fetch compliance item" });
    }
  });

  app.post("/api/caregivers/:caregiverId/compliance", isAuthenticated, async (req: any, res) => {
    try {
      const { caregiverId: _, ...userBody } = req.body;
      const coercedData = {
        ...userBody,
        expirationDate: coerceDate(userBody.expirationDate),
        performedDate: coerceDate(userBody.performedDate),
        resultDate: coerceDate(userBody.resultDate),
        verifiedAt: coerceDate(userBody.verifiedAt),
      };
      const validatedBody = insertCaregiverComplianceSchema.omit({ caregiverId: true, createdBy: true }).parse(coercedData);
      const item = await storage.createCaregiverCompliance({
        ...validatedBody,
        caregiverId: req.params.caregiverId,
        createdBy: req.session?.user?.id,
      });
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating compliance item:", error);
      res.status(400).json({ message: "Failed to create compliance item" });
    }
  });

  app.put("/api/caregiver-compliance/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { caregiverId, createdBy, ...updateData } = req.body;
      const coercedData = {
        ...updateData,
        expirationDate: coerceDate(updateData.expirationDate),
        performedDate: coerceDate(updateData.performedDate),
        resultDate: coerceDate(updateData.resultDate),
        verifiedAt: coerceDate(updateData.verifiedAt),
      };
      const validatedData = insertCaregiverComplianceSchema.partial().parse(coercedData);
      const item = await storage.updateCaregiverCompliance(req.params.id, validatedData);
      res.json(item);
    } catch (error) {
      console.error("Error updating compliance item:", error);
      res.status(400).json({ message: "Failed to update compliance item" });
    }
  });

  app.delete("/api/caregiver-compliance/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteCaregiverCompliance(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting compliance item:", error);
      res.status(400).json({ message: "Failed to delete compliance item" });
    }
  });

  // AI Issue Detection Routes
  app.get("/api/ai-issues", isAuthenticated, async (req, res) => {
    try {
      const issues = await storage.getAllAiDetectedIssues();
      res.json(issues);
    } catch (error) {
      console.error("Error fetching AI detected issues:", error);
      res.status(500).json({ message: "Failed to fetch AI detected issues" });
    }
  });

  app.post("/api/ai-issues/scan", isAuthenticated, async (req: any, res) => {
    try {
      const { aiIssueService } = await import("./aiService");
      const newIssues = await aiIssueService.scanForIssues();
      res.json({ 
        message: `Scan completed. Found ${newIssues.length} new issues.`,
        issuesFound: newIssues.length,
        issues: newIssues
      });
    } catch (error) {
      console.error("Error scanning for issues:", error);
      res.status(500).json({ message: "Failed to scan for issues" });
    }
  });

  app.post("/api/ai-issues/:id/resolve", isAuthenticated, async (req: any, res) => {
    try {
      const { aiIssueService } = await import("./aiService");
      await aiIssueService.resolveIssue(req.params.id, req.session?.user?.id, req.body.resolutionNotes);
      const issue = await storage.getAiDetectedIssue(req.params.id);
      res.json(issue);
    } catch (error) {
      console.error("Error resolving issue:", error);
      res.status(500).json({ message: "Failed to resolve issue" });
    }
  });

  app.post("/api/ai-issues/:id/dismiss", isAuthenticated, async (req: any, res) => {
    try {
      const { aiIssueService } = await import("./aiService");
      await aiIssueService.dismissIssue(req.params.id, req.session?.user?.id, req.body.reason);
      const issue = await storage.getAiDetectedIssue(req.params.id);
      res.json(issue);
    } catch (error) {
      console.error("Error dismissing issue:", error);
      res.status(500).json({ message: "Failed to dismiss issue" });
    }
  });

  app.post("/api/ai-issues/:id/auto-fix", isAuthenticated, async (req: any, res) => {
    try {
      const { aiIssueService } = await import("./aiService");
      const result = await aiIssueService.applyAutoFix(req.params.id, req.session?.user?.id);
      if (result.success) {
        const issue = await storage.getAiDetectedIssue(req.params.id);
        res.json({ ...result, issue });
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error applying auto-fix:", error);
      res.status(500).json({ message: "Failed to apply auto-fix" });
    }
  });

  app.delete("/api/ai-issues/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteAiDetectedIssue(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting AI issue:", error);
      res.status(500).json({ message: "Failed to delete AI issue" });
    }
  });

  // AI Error Diagnosis route - HIPAA compliant: no PHI/PII stored or processed
  app.post("/api/ai-issues/diagnose", isAuthenticated, async (req: any, res) => {
    try {
      const { diagnoseApiError } = await import("./aiService");
      const { errorLogStorage } = await import("./storage");
      const { endpoint, method, errorMessage, statusCode, createIssue } = req.body;
      
      if (!endpoint || !method || !errorMessage) {
        return res.status(400).json({ message: "endpoint, method, and errorMessage are required" });
      }
      
      // Log the error - HIPAA COMPLIANCE: Never store request body data (may contain PHI/PII)
      const errorLog = errorLogStorage.logError({
        endpoint,
        method,
        errorMessage,
        statusCode,
        userId: req.session?.user?.id,
      });
      
      // Get diagnosis using local pattern-matching only (no external AI calls)
      const diagnosis = await diagnoseApiError({
        endpoint,
        method,
        errorMessage,
        statusCode,
      });
      
      // Optionally create an AI detected issue for tracking
      let issue = null;
      if (createIssue) {
        issue = await storage.createAiDetectedIssue({
          category: "data_quality",
          severity: diagnosis.severity,
          title: `API Error: ${errorMessage.substring(0, 100)}`,
          description: diagnosis.diagnosis,
          affectedEntityType: "api_error",
          affectedEntityId: errorLog.id,
          suggestedAction: diagnosis.suggestedFix,
          autoFixAvailable: false,
          aiConfidence: "85",
        });
      }
      
      res.json({
        ...diagnosis,
        errorLogId: errorLog.id,
        issue,
      });
    } catch (error) {
      console.error("Error diagnosing API error:", error);
      res.status(500).json({ message: "Failed to diagnose error" });
    }
  });

  // Get recent error logs
  app.get("/api/ai-issues/error-logs", isAuthenticated, async (req: any, res) => {
    try {
      const { errorLogStorage } = await import("./storage");
      const limit = parseInt(req.query.limit as string) || 10;
      const errors = errorLogStorage.getRecentErrors(limit);
      res.json(errors);
    } catch (error) {
      console.error("Error fetching error logs:", error);
      res.status(500).json({ message: "Failed to fetch error logs" });
    }
  });

  // AI Assistant route
  app.post("/api/ai-assistant/chat", isAuthenticated, async (req: any, res) => {
    try {
      const { processAIAssistantMessage } = await import("./aiAssistant");
      const { message, conversationHistory } = req.body;
      
      if (!message || typeof message !== "string") {
        return res.status(400).json({ message: "Message is required" });
      }
      
      const userRole = req.session?.user?.role || "caregiver";
      const userId = req.session?.user?.id;
      const result = await processAIAssistantMessage(message, conversationHistory || [], userRole, userId);
      res.json(result);
    } catch (error) {
      console.error("Error processing AI assistant message:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  // EVV Data routes
  app.get("/api/evv-data", isAuthenticated, async (req, res) => {
    try {
      const { month, year, officeId } = req.query;
      let evvDataItems;
      
      if (month && year) {
        evvDataItems = await storage.getEvvDataByMonthYear(
          parseInt(month as string, 10),
          parseInt(year as string, 10)
        );
        // Filter by officeId if provided
        if (officeId) {
          evvDataItems = evvDataItems.filter(item => item.officeId === officeId);
        }
      } else {
        evvDataItems = await storage.getAllEvvData(officeId as string | undefined);
      }
      res.json(evvDataItems);
    } catch (error) {
      console.error("Error fetching EVV data:", error);
      res.status(500).json({ message: "Failed to fetch EVV data" });
    }
  });

  app.get("/api/evv-data/:id", isAuthenticated, async (req, res) => {
    try {
      const evvDataItem = await storage.getEvvData(req.params.id);
      if (!evvDataItem) {
        return res.status(404).json({ message: "EVV data not found" });
      }
      res.json(evvDataItem);
    } catch (error) {
      console.error("Error fetching EVV data:", error);
      res.status(500).json({ message: "Failed to fetch EVV data" });
    }
  });

  app.post("/api/evv-data", isAuthenticated, async (req: any, res) => {
    try {
      // Convert numeric fields to strings for Drizzle's numeric type
      const requestData = {
        ...req.body,
        createdBy: req.session?.user?.id,
        percentage: req.body.percentage != null ? String(req.body.percentage) : undefined,
      };
      const validatedData = insertEvvDataSchema.parse(requestData);
      const evvDataItem = await storage.createEvvData(validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "evv_data",
        entityId: evvDataItem.id,
        newValues: evvDataItem,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(201).json(evvDataItem);
    } catch (error) {
      console.error("Error creating EVV data:", error);
      res.status(400).json({ message: "Failed to create EVV data" });
    }
  });

  app.put("/api/evv-data/:id", isAuthenticated, async (req: any, res) => {
    try {
      const oldEvvData = await storage.getEvvData(req.params.id);
      if (!oldEvvData) {
        return res.status(404).json({ message: "EVV data not found" });
      }
      
      // Convert numeric fields to strings for Drizzle's numeric type
      const requestData = {
        ...req.body,
        percentage: req.body.percentage != null ? String(req.body.percentage) : undefined,
      };
      const validatedData = insertEvvDataSchema.partial().parse(requestData);
      const evvDataItem = await storage.updateEvvData(req.params.id, validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "update",
        entityType: "evv_data",
        entityId: evvDataItem.id,
        oldValues: oldEvvData,
        newValues: evvDataItem,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(evvDataItem);
    } catch (error) {
      console.error("Error updating EVV data:", error);
      res.status(400).json({ message: "Failed to update EVV data" });
    }
  });

  app.delete("/api/evv-data/:id", isAuthenticated, async (req: any, res) => {
    try {
      const evvDataItem = await storage.getEvvData(req.params.id);
      if (!evvDataItem) {
        return res.status(404).json({ message: "EVV data not found" });
      }
      
      await storage.deleteEvvData(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "delete",
        entityType: "evv_data",
        entityId: req.params.id,
        oldValues: evvDataItem,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting EVV data:", error);
      res.status(500).json({ message: "Failed to delete EVV data" });
    }
  });

  // OCR Document Extraction Routes
  const { extractCaregiverFromPdf, extractClientFromPdf, extractFromImageFile } = await import("./ocr-service");

  app.post("/api/ocr/extract-caregiver", isAuthenticated, upload.single("document"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No document uploaded" });
      }

      const filePath = req.file.path;
      const fileType = req.file.mimetype;
      
      let extractedData;
      
      if (fileType === "application/pdf") {
        extractedData = await extractCaregiverFromPdf(filePath);
      } else if (fileType.startsWith("image/")) {
        extractedData = await extractFromImageFile(filePath, "caregiver");
      } else {
        return res.status(400).json({ message: "Unsupported file type. Please upload a PDF or image file." });
      }

      // Cleanup uploaded file
      try {
        const fs = await import("fs");
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error("Failed to cleanup uploaded file:", e);
      }

      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "ocr_extract",
        entityType: "caregiver",
        entityId: null,
        newValues: { extractedFields: Object.keys(extractedData).filter(k => (extractedData as any)[k] !== null) },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json(extractedData);
    } catch (error) {
      console.error("Error extracting caregiver data from document:", error);
      res.status(500).json({ message: "Failed to extract data from document. Please ensure the document is readable." });
    }
  });

  app.post("/api/ocr/extract-client", isAuthenticated, upload.single("document"), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No document uploaded" });
      }

      const filePath = req.file.path;
      const fileType = req.file.mimetype;
      
      let extractedData;
      
      if (fileType === "application/pdf") {
        extractedData = await extractClientFromPdf(filePath);
      } else if (fileType.startsWith("image/")) {
        extractedData = await extractFromImageFile(filePath, "client");
      } else {
        return res.status(400).json({ message: "Unsupported file type. Please upload a PDF or image file." });
      }

      // Cleanup uploaded file
      try {
        const fs = await import("fs");
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error("Failed to cleanup uploaded file:", e);
      }

      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "ocr_extract",
        entityType: "client",
        entityId: null,
        newValues: { extractedFields: Object.keys(extractedData).filter(k => (extractedData as any)[k] !== null) },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json(extractedData);
    } catch (error) {
      console.error("Error extracting client data from document:", error);
      res.status(500).json({ message: "Failed to extract data from document. Please ensure the document is readable." });
    }
  });

  // ==================== ADMIN SETTINGS ROUTES ====================

  // MCO Types routes
  app.get("/api/admin/mco-types", isAuthenticated, async (req, res) => {
    try {
      const mcoTypes = await storage.getAllMcoTypes();
      res.json(mcoTypes);
    } catch (error) {
      console.error("Error fetching MCO types:", error);
      res.status(500).json({ message: "Failed to fetch MCO types" });
    }
  });

  app.get("/api/admin/mco-types/:id", isAuthenticated, async (req, res) => {
    try {
      const mcoType = await storage.getMcoType(req.params.id);
      if (!mcoType) {
        return res.status(404).json({ message: "MCO type not found" });
      }
      res.json(mcoType);
    } catch (error) {
      console.error("Error fetching MCO type:", error);
      res.status(500).json({ message: "Failed to fetch MCO type" });
    }
  });

  app.post("/api/admin/mco-types", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertMcoTypeSchema.parse(req.body);
      const mcoType = await storage.createMcoType(validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "mco_type",
        entityId: mcoType.id,
        newValues: mcoType,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(201).json(mcoType);
    } catch (error) {
      console.error("Error creating MCO type:", error);
      res.status(400).json({ message: "Failed to create MCO type" });
    }
  });

  app.put("/api/admin/mco-types/:id", isAuthenticated, async (req: any, res) => {
    try {
      const oldMcoType = await storage.getMcoType(req.params.id);
      const validatedData = insertMcoTypeSchema.partial().parse(req.body);
      const mcoType = await storage.updateMcoType(req.params.id, validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "update",
        entityType: "mco_type",
        entityId: mcoType.id,
        oldValues: oldMcoType,
        newValues: mcoType,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(mcoType);
    } catch (error) {
      console.error("Error updating MCO type:", error);
      res.status(400).json({ message: "Failed to update MCO type" });
    }
  });

  app.delete("/api/admin/mco-types/:id", isAuthenticated, async (req: any, res) => {
    try {
      const mcoType = await storage.getMcoType(req.params.id);
      if (!mcoType) {
        return res.status(404).json({ message: "MCO type not found" });
      }
      
      // Check if any MCOs are linked to this type
      const linkedMcos = await storage.getMcosByType(req.params.id);
      if (linkedMcos.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete MCO type. There are MCOs linked to this type. Please delete or reassign them first." 
        });
      }
      
      await storage.deleteMcoType(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "delete",
        entityType: "mco_type",
        entityId: req.params.id,
        oldValues: mcoType,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting MCO type:", error);
      res.status(500).json({ message: "Failed to delete MCO type" });
    }
  });

  // MCOs routes - public endpoint for billing/payroll
  app.get("/api/mcos", isAuthenticated, async (req, res) => {
    try {
      const mcos = await storage.getAllMcos();
      res.json(mcos);
    } catch (error) {
      console.error("Error fetching MCOs:", error);
      res.status(500).json({ message: "Failed to fetch MCOs" });
    }
  });

  // Office-specific MCO routes
  app.get("/api/offices/:officeId/mcos", isAuthenticated, async (req, res) => {
    try {
      const mcos = await storage.getMcosByOffice(req.params.officeId);
      res.json(mcos);
    } catch (error) {
      console.error("Error fetching office MCOs:", error);
      res.status(500).json({ message: "Failed to fetch office MCOs" });
    }
  });

  app.post("/api/offices/:officeId/mcos", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertMcoSchema.parse({
        ...req.body,
        officeId: req.params.officeId,
      });
      const mco = await storage.createMco(validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "mco",
        entityId: mco.id,
        newValues: mco,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(201).json(mco);
    } catch (error) {
      console.error("Error creating office MCO:", error);
      res.status(400).json({ message: "Failed to create office MCO" });
    }
  });

  app.put("/api/offices/:officeId/mcos/:id", isAuthenticated, async (req: any, res) => {
    try {
      const oldMco = await storage.getMco(req.params.id);
      const validatedData = insertMcoSchema.partial().parse(req.body);
      const mco = await storage.updateMco(req.params.id, validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "update",
        entityType: "mco",
        entityId: mco.id,
        oldValues: oldMco,
        newValues: mco,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(mco);
    } catch (error) {
      console.error("Error updating office MCO:", error);
      res.status(400).json({ message: "Failed to update office MCO" });
    }
  });

  app.delete("/api/offices/:officeId/mcos/:id", isAuthenticated, async (req: any, res) => {
    try {
      const mco = await storage.getMco(req.params.id);
      if (!mco) {
        return res.status(404).json({ message: "MCO not found" });
      }
      
      await storage.deleteMco(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "delete",
        entityType: "mco",
        entityId: req.params.id,
        oldValues: mco,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting office MCO:", error);
      res.status(500).json({ message: "Failed to delete office MCO" });
    }
  });

  // Office Licenses routes
  app.get("/api/offices/:officeId/licenses", isAuthenticated, async (req, res) => {
    try {
      const licenses = await storage.getOfficeLicenses(req.params.officeId);
      res.json(licenses);
    } catch (error) {
      console.error("Error fetching office licenses:", error);
      res.status(500).json({ message: "Failed to fetch office licenses" });
    }
  });

  app.get("/api/offices/:officeId/licenses/:id", isAuthenticated, async (req, res) => {
    try {
      const license = await storage.getOfficeLicense(req.params.id);
      if (!license) {
        return res.status(404).json({ message: "License not found" });
      }
      res.json(license);
    } catch (error) {
      console.error("Error fetching office license:", error);
      res.status(500).json({ message: "Failed to fetch office license" });
    }
  });

  app.post("/api/offices/:officeId/licenses", isAuthenticated, async (req: any, res) => {
    try {
      const requestData = {
        ...req.body,
        officeId: req.params.officeId,
        createdBy: req.session?.user?.id,
      };
      const validatedData = insertOfficeLicenseSchema.parse(requestData);
      const license = await storage.createOfficeLicense(validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "office_license",
        entityId: license.id,
        newValues: license,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(201).json(license);
    } catch (error) {
      console.error("Error creating office license:", error);
      res.status(400).json({ message: "Failed to create office license" });
    }
  });

  app.put("/api/offices/:officeId/licenses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const oldLicense = await storage.getOfficeLicense(req.params.id);
      const validatedData = insertOfficeLicenseSchema.partial().parse(req.body);
      const license = await storage.updateOfficeLicense(req.params.id, validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "update",
        entityType: "office_license",
        entityId: license.id,
        oldValues: oldLicense,
        newValues: license,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(license);
    } catch (error) {
      console.error("Error updating office license:", error);
      res.status(400).json({ message: "Failed to update office license" });
    }
  });

  app.delete("/api/offices/:officeId/licenses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const license = await storage.getOfficeLicense(req.params.id);
      if (!license) {
        return res.status(404).json({ message: "License not found" });
      }
      
      await storage.deleteOfficeLicense(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "delete",
        entityType: "office_license",
        entityId: req.params.id,
        oldValues: license,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting office license:", error);
      res.status(500).json({ message: "Failed to delete office license" });
    }
  });

  // Office Staff routes
  app.get("/api/offices/:officeId/staff", isAuthenticated, async (req, res) => {
    try {
      const staff = await storage.getOfficeStaff(req.params.officeId);
      res.json(staff);
    } catch (error) {
      console.error("Error fetching office staff:", error);
      res.status(500).json({ message: "Failed to fetch office staff" });
    }
  });

  app.post("/api/offices/:officeId/staff", isAuthenticated, async (req: any, res) => {
    try {
      const requestData = {
        ...req.body,
        officeId: req.params.officeId,
      };
      const validatedData = insertOfficeStaffSchema.parse(requestData);
      const staff = await storage.createOfficeStaff(validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "office_staff",
        entityId: staff.id,
        newValues: staff,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(201).json(staff);
    } catch (error) {
      console.error("Error creating office staff:", error);
      res.status(400).json({ message: "Failed to create office staff" });
    }
  });

  app.put("/api/offices/:officeId/staff/:id", isAuthenticated, async (req: any, res) => {
    try {
      const oldStaff = await storage.getOfficeStaffMember(req.params.id);
      const validatedData = insertOfficeStaffSchema.partial().parse(req.body);
      const staff = await storage.updateOfficeStaff(req.params.id, validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "update",
        entityType: "office_staff",
        entityId: staff.id,
        oldValues: oldStaff,
        newValues: staff,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(staff);
    } catch (error) {
      console.error("Error updating office staff:", error);
      res.status(400).json({ message: "Failed to update office staff" });
    }
  });

  app.delete("/api/offices/:officeId/staff/:id", isAuthenticated, async (req: any, res) => {
    try {
      const staff = await storage.getOfficeStaffMember(req.params.id);
      if (!staff) {
        return res.status(404).json({ message: "Staff member not found" });
      }
      
      await storage.deleteOfficeStaff(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "delete",
        entityType: "office_staff",
        entityId: req.params.id,
        oldValues: staff,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting office staff:", error);
      res.status(500).json({ message: "Failed to delete office staff" });
    }
  });

  // Office Expenses routes
  app.get("/api/offices/:officeId/expenses", isAuthenticated, async (req, res) => {
    try {
      const expenses = await storage.getOfficeExpenses(req.params.officeId);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching office expenses:", error);
      res.status(500).json({ message: "Failed to fetch office expenses" });
    }
  });

  app.post("/api/offices/:officeId/expenses", isAuthenticated, async (req: any, res) => {
    try {
      const requestData = {
        ...req.body,
        officeId: req.params.officeId,
        createdBy: req.session?.user?.id,
        amount: req.body.amount != null ? String(req.body.amount) : undefined,
      };
      const validatedData = insertOfficeExpenseSchema.parse(requestData);
      const expense = await storage.createOfficeExpense(validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "office_expense",
        entityId: expense.id,
        newValues: expense,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(201).json(expense);
    } catch (error) {
      console.error("Error creating office expense:", error);
      res.status(400).json({ message: "Failed to create office expense" });
    }
  });

  app.put("/api/offices/:officeId/expenses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const oldExpense = await storage.getOfficeExpense(req.params.id);
      const requestData = {
        ...req.body,
        amount: req.body.amount != null ? String(req.body.amount) : undefined,
      };
      const validatedData = insertOfficeExpenseSchema.partial().parse(requestData);
      const expense = await storage.updateOfficeExpense(req.params.id, validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "update",
        entityType: "office_expense",
        entityId: expense.id,
        oldValues: oldExpense,
        newValues: expense,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(expense);
    } catch (error) {
      console.error("Error updating office expense:", error);
      res.status(400).json({ message: "Failed to update office expense" });
    }
  });

  app.delete("/api/offices/:officeId/expenses/:id", isAuthenticated, async (req: any, res) => {
    try {
      const expense = await storage.getOfficeExpense(req.params.id);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      await storage.deleteOfficeExpense(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "delete",
        entityType: "office_expense",
        entityId: req.params.id,
        oldValues: expense,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting office expense:", error);
      res.status(500).json({ message: "Failed to delete office expense" });
    }
  });

  // MCOs routes - admin endpoint
  app.get("/api/admin/mcos", isAuthenticated, async (req, res) => {
    try {
      const mcos = await storage.getAllMcos();
      res.json(mcos);
    } catch (error) {
      console.error("Error fetching MCOs:", error);
      res.status(500).json({ message: "Failed to fetch MCOs" });
    }
  });

  app.get("/api/admin/mcos/:id", isAuthenticated, async (req, res) => {
    try {
      const mco = await storage.getMco(req.params.id);
      if (!mco) {
        return res.status(404).json({ message: "MCO not found" });
      }
      res.json(mco);
    } catch (error) {
      console.error("Error fetching MCO:", error);
      res.status(500).json({ message: "Failed to fetch MCO" });
    }
  });

  app.post("/api/admin/mcos", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertMcoSchema.parse(req.body);
      const mco = await storage.createMco(validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "mco",
        entityId: mco.id,
        newValues: mco,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(201).json(mco);
    } catch (error) {
      console.error("Error creating MCO:", error);
      res.status(400).json({ message: "Failed to create MCO" });
    }
  });

  app.put("/api/admin/mcos/:id", isAuthenticated, async (req: any, res) => {
    try {
      const oldMco = await storage.getMco(req.params.id);
      const validatedData = insertMcoSchema.partial().parse(req.body);
      const mco = await storage.updateMco(req.params.id, validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "update",
        entityType: "mco",
        entityId: mco.id,
        oldValues: oldMco,
        newValues: mco,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(mco);
    } catch (error) {
      console.error("Error updating MCO:", error);
      res.status(400).json({ message: "Failed to update MCO" });
    }
  });

  app.delete("/api/admin/mcos/:id", isAuthenticated, async (req: any, res) => {
    try {
      const mco = await storage.getMco(req.params.id);
      if (!mco) {
        return res.status(404).json({ message: "MCO not found" });
      }
      
      await storage.deleteMco(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "delete",
        entityType: "mco",
        entityId: req.params.id,
        oldValues: mco,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting MCO:", error);
      res.status(500).json({ message: "Failed to delete MCO" });
    }
  });

  // System Settings routes
  app.get("/api/admin/settings", isAuthenticated, async (req, res) => {
    try {
      const settings = await storage.getAllSystemSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching system settings:", error);
      res.status(500).json({ message: "Failed to fetch system settings" });
    }
  });

  app.get("/api/admin/settings/:key", isAuthenticated, async (req, res) => {
    try {
      const setting = await storage.getSystemSetting(req.params.key);
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      res.json(setting);
    } catch (error) {
      console.error("Error fetching system setting:", error);
      res.status(500).json({ message: "Failed to fetch system setting" });
    }
  });

  app.post("/api/admin/settings", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertSystemSettingSchema.parse(req.body);
      const setting = await storage.createSystemSetting(validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "system_setting",
        entityId: setting.id,
        newValues: setting,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(201).json(setting);
    } catch (error) {
      console.error("Error creating system setting:", error);
      res.status(400).json({ message: "Failed to create system setting" });
    }
  });

  app.put("/api/admin/settings/:key", isAuthenticated, async (req: any, res) => {
    try {
      const oldSetting = await storage.getSystemSetting(req.params.key);
      const validatedData = insertSystemSettingSchema.partial().parse(req.body);
      const setting = await storage.updateSystemSetting(req.params.key, validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "update",
        entityType: "system_setting",
        entityId: setting.id,
        oldValues: oldSetting,
        newValues: setting,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(setting);
    } catch (error) {
      console.error("Error updating system setting:", error);
      res.status(400).json({ message: "Failed to update system setting" });
    }
  });

  app.delete("/api/admin/settings/:key", isAuthenticated, async (req: any, res) => {
    try {
      const setting = await storage.getSystemSetting(req.params.key);
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      
      await storage.deleteSystemSetting(req.params.key);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "delete",
        entityType: "system_setting",
        entityId: setting.id,
        oldValues: setting,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting system setting:", error);
      res.status(500).json({ message: "Failed to delete system setting" });
    }
  });

  // Entity Field Configs routes
  app.get("/api/admin/field-configs", isAuthenticated, async (req, res) => {
    try {
      const entityType = req.query.entityType as 'client' | 'caregiver' | undefined;
      let configs;
      
      if (entityType) {
        configs = await storage.getEntityFieldConfigsByType(entityType);
      } else {
        configs = await storage.getAllEntityFieldConfigs();
      }
      
      res.json(configs);
    } catch (error) {
      console.error("Error fetching entity field configs:", error);
      res.status(500).json({ message: "Failed to fetch field configurations" });
    }
  });

  app.get("/api/admin/field-configs/:id", isAuthenticated, async (req, res) => {
    try {
      const config = await storage.getEntityFieldConfig(req.params.id);
      if (!config) {
        return res.status(404).json({ message: "Field configuration not found" });
      }
      res.json(config);
    } catch (error) {
      console.error("Error fetching entity field config:", error);
      res.status(500).json({ message: "Failed to fetch field configuration" });
    }
  });

  app.post("/api/admin/field-configs", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertEntityFieldConfigSchema.parse(req.body);
      const config = await storage.createEntityFieldConfig(validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "entity_field_config",
        entityId: config.id,
        newValues: config,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(201).json(config);
    } catch (error) {
      console.error("Error creating entity field config:", error);
      res.status(400).json({ message: "Failed to create field configuration" });
    }
  });

  app.put("/api/admin/field-configs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const oldConfig = await storage.getEntityFieldConfig(req.params.id);
      const validatedData = insertEntityFieldConfigSchema.partial().parse(req.body);
      const config = await storage.updateEntityFieldConfig(req.params.id, validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "update",
        entityType: "entity_field_config",
        entityId: config.id,
        oldValues: oldConfig,
        newValues: config,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(config);
    } catch (error) {
      console.error("Error updating entity field config:", error);
      res.status(400).json({ message: "Failed to update field configuration" });
    }
  });

  app.delete("/api/admin/field-configs/:id", isAuthenticated, async (req: any, res) => {
    try {
      const config = await storage.getEntityFieldConfig(req.params.id);
      if (!config) {
        return res.status(404).json({ message: "Field configuration not found" });
      }
      
      await storage.deleteEntityFieldConfig(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "delete",
        entityType: "entity_field_config",
        entityId: req.params.id,
        oldValues: config,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting entity field config:", error);
      res.status(500).json({ message: "Failed to delete field configuration" });
    }
  });

  // ==================== BILLING ROUTES ====================
  // MCO due date calculation: UPMC = 7 days, PA Health and Wellness = 14 days, Amerihealth = 24 days
  const calculateDueDate = async (mcoId: string | null | undefined, billDate: Date): Promise<Date> => {
    if (!mcoId) {
      return new Date(billDate.getTime() + 14 * 24 * 60 * 60 * 1000); // Default 14 days
    }
    const mco = await storage.getMco(mcoId);
    if (!mco) {
      return new Date(billDate.getTime() + 14 * 24 * 60 * 60 * 1000); // Default 14 days
    }
    
    const mcoName = mco.name.toLowerCase();
    let dueDays = 14; // Default
    
    if (mcoName.includes('upmc')) {
      dueDays = 7;
    } else if (mcoName.includes('pa health') || mcoName.includes('health and wellness')) {
      dueDays = 14;
    } else if (mcoName.includes('amerihealth')) {
      dueDays = 24;
    }
    
    return new Date(billDate.getTime() + dueDays * 24 * 60 * 60 * 1000);
  };

  app.get("/api/billing", isAuthenticated, async (req, res) => {
    try {
      const { officeId } = req.query;
      const officeFilter = officeId && officeId !== 'all' ? String(officeId) : undefined;
      const records = await storage.getBillingRecords(officeFilter);
      res.json(records);
    } catch (error) {
      console.error("Error fetching billing records:", error);
      res.status(500).json({ message: "Failed to fetch billing records" });
    }
  });

  app.get("/api/billing/:id", isAuthenticated, async (req, res) => {
    try {
      const record = await storage.getBillingRecord(req.params.id);
      if (!record) {
        return res.status(404).json({ message: "Billing record not found" });
      }
      res.json(record);
    } catch (error) {
      console.error("Error fetching billing record:", error);
      res.status(500).json({ message: "Failed to fetch billing record" });
    }
  });

  app.post("/api/billing", isAuthenticated, async (req: any, res) => {
    try {
      const billDate = new Date(req.body.billDate);
      const dueDate = await calculateDueDate(req.body.mcoId, billDate);
      const serviceStartDate = new Date(req.body.serviceStartDate);
      const serviceEndDate = new Date(req.body.serviceEndDate);
      
      const record = await storage.createBillingRecord({
        ...req.body,
        serviceStartDate,
        serviceEndDate,
        billDate,
        dueDate,
        createdBy: req.session?.user?.id,
      });
      res.status(201).json(record);
    } catch (error) {
      console.error("Error creating billing record:", error);
      res.status(400).json({ message: "Failed to create billing record" });
    }
  });

  app.put("/api/billing/:id", isAuthenticated, async (req: any, res) => {
    try {
      // Recalculate due date if MCO or billDate changed
      let dueDate;
      if (req.body.mcoId || req.body.billDate) {
        const existingRecord = await storage.getBillingRecord(req.params.id);
        const mcoId = req.body.mcoId || existingRecord?.mcoId;
        const billDate = req.body.billDate ? new Date(req.body.billDate) : existingRecord?.billDate;
        if (billDate) {
          dueDate = await calculateDueDate(mcoId, billDate);
        }
      }
      
      const record = await storage.updateBillingRecord(req.params.id, {
        ...req.body,
        ...(dueDate && { dueDate }),
      });
      res.json(record);
    } catch (error) {
      console.error("Error updating billing record:", error);
      res.status(400).json({ message: "Failed to update billing record" });
    }
  });

  app.delete("/api/billing/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteBillingRecord(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting billing record:", error);
      res.status(500).json({ message: "Failed to delete billing record" });
    }
  });

  // ==================== PAYROLL CONFIG ROUTES ====================
  app.get("/api/offices/:officeId/payroll-config", isAuthenticated, async (req, res) => {
    try {
      const config = await storage.getOfficePayrollConfig(req.params.officeId);
      res.json(config || null);
    } catch (error) {
      console.error("Error fetching payroll config:", error);
      res.status(500).json({ message: "Failed to fetch payroll configuration" });
    }
  });

  app.post("/api/offices/:officeId/payroll-config", isAuthenticated, async (req, res) => {
    try {
      const config = await storage.upsertOfficePayrollConfig({
        ...req.body,
        officeId: req.params.officeId,
      });
      res.json(config);
    } catch (error) {
      console.error("Error saving payroll config:", error);
      res.status(400).json({ message: "Failed to save payroll configuration" });
    }
  });

  // ==================== OFFICE MCO BILLING RATES ROUTES ====================
  app.get("/api/offices/:officeId/mco-rates", isAuthenticated, async (req, res) => {
    try {
      const mcoId = req.query.mcoId as string | undefined;
      const rates = await storage.getOfficeMcoBillingRates(req.params.officeId, mcoId);
      res.json(rates);
    } catch (error) {
      console.error("Error fetching MCO rates:", error);
      res.status(500).json({ message: "Failed to fetch MCO rates" });
    }
  });

  app.post("/api/offices/:officeId/mco-rates", isAuthenticated, async (req, res) => {
    try {
      const data = {
        ...req.body,
        officeId: req.params.officeId,
        effectiveFrom: req.body.effectiveFrom ? new Date(req.body.effectiveFrom) : undefined,
        effectiveTo: req.body.effectiveTo ? new Date(req.body.effectiveTo) : undefined,
      };
      const rate = await storage.createOfficeMcoBillingRate(data);
      res.status(201).json(rate);
    } catch (error) {
      console.error("Error creating MCO rate:", error);
      res.status(400).json({ message: "Failed to create MCO rate" });
    }
  });

  app.put("/api/offices/:officeId/mco-rates/:id", isAuthenticated, async (req, res) => {
    try {
      const data = {
        ...req.body,
        effectiveFrom: req.body.effectiveFrom ? new Date(req.body.effectiveFrom) : undefined,
        effectiveTo: req.body.effectiveTo ? new Date(req.body.effectiveTo) : undefined,
      };
      const rate = await storage.updateOfficeMcoBillingRate(req.params.id, data);
      res.json(rate);
    } catch (error) {
      console.error("Error updating MCO rate:", error);
      res.status(400).json({ message: "Failed to update MCO rate" });
    }
  });

  app.delete("/api/offices/:officeId/mco-rates/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteOfficeMcoBillingRate(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting MCO rate:", error);
      res.status(500).json({ message: "Failed to delete MCO rate" });
    }
  });

  // ==================== PAYROLL RUNS ROUTES ====================
  app.get("/api/payroll", isAuthenticated, async (req, res) => {
    try {
      const officeId = req.query.officeId as string | undefined;
      const runs = await storage.getPayrollRuns(officeId);
      res.json(runs);
    } catch (error) {
      console.error("Error fetching payroll runs:", error);
      res.status(500).json({ message: "Failed to fetch payroll runs" });
    }
  });

  app.get("/api/payroll/:id", isAuthenticated, async (req, res) => {
    try {
      const run = await storage.getPayrollRun(req.params.id);
      if (!run) {
        return res.status(404).json({ message: "Payroll run not found" });
      }
      const lineItems = await storage.getPayrollLineItems(req.params.id);
      res.json({ ...run, lineItems });
    } catch (error) {
      console.error("Error fetching payroll run:", error);
      res.status(500).json({ message: "Failed to fetch payroll run" });
    }
  });

  app.post("/api/payroll", isAuthenticated, async (req: any, res) => {
    try {
      const data = {
        ...req.body,
        createdBy: req.session?.user?.id,
        payPeriodStart: req.body.payPeriodStart ? new Date(req.body.payPeriodStart) : null,
        payPeriodEnd: req.body.payPeriodEnd ? new Date(req.body.payPeriodEnd) : null,
        paycheckDate: req.body.paycheckDate ? new Date(req.body.paycheckDate) : null,
      };
      const run = await storage.createPayrollRun(data);
      res.status(201).json(run);
    } catch (error) {
      console.error("Error creating payroll run:", error);
      res.status(400).json({ message: "Failed to create payroll run" });
    }
  });

  app.put("/api/payroll/:id", isAuthenticated, async (req: any, res) => {
    try {
      const updateData = {
        ...req.body,
        payPeriodStart: req.body.payPeriodStart ? new Date(req.body.payPeriodStart) : undefined,
        payPeriodEnd: req.body.payPeriodEnd ? new Date(req.body.payPeriodEnd) : undefined,
        paycheckDate: req.body.paycheckDate ? new Date(req.body.paycheckDate) : undefined,
      };
      if (req.body.status === "approved") {
        updateData.approvedBy = req.session?.user?.id;
        updateData.approvedAt = new Date();
      }
      const run = await storage.updatePayrollRun(req.params.id, updateData);
      res.json(run);
    } catch (error) {
      console.error("Error updating payroll run:", error);
      res.status(400).json({ message: "Failed to update payroll run" });
    }
  });

  app.delete("/api/payroll/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deletePayrollRun(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting payroll run:", error);
      res.status(500).json({ message: "Failed to delete payroll run" });
    }
  });

  // Payroll line items
  app.post("/api/payroll/:runId/line-items", isAuthenticated, async (req, res) => {
    try {
      const item = await storage.createPayrollLineItem({
        ...req.body,
        payrollRunId: req.params.runId,
      });
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating payroll line item:", error);
      res.status(400).json({ message: "Failed to create line item" });
    }
  });

  app.put("/api/payroll-line-items/:id", isAuthenticated, async (req, res) => {
    try {
      const item = await storage.updatePayrollLineItem(req.params.id, req.body);
      res.json(item);
    } catch (error) {
      console.error("Error updating payroll line item:", error);
      res.status(400).json({ message: "Failed to update line item" });
    }
  });

  app.delete("/api/payroll-line-items/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deletePayrollLineItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting payroll line item:", error);
      res.status(500).json({ message: "Failed to delete line item" });
    }
  });

  // ==================== BILLING HOURS IMPORT/EXPORT ROUTES ====================
  
  // Import billing hours from spreadsheet
  app.post("/api/payroll/:runId/import-hours", isAuthenticated, excelUpload.single("file"), async (req, res) => {
    try {
      const { runId } = req.params;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Get the payroll run to determine pay period dates
      const payrollRun = await storage.getPayrollRun(runId);
      if (!payrollRun) {
        return res.status(404).json({ message: "Payroll run not found" });
      }

      // Parse Excel file
      const ExcelJS = require("exceljs");
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer);
      const worksheet = workbook.worksheets[0];

      const resultsList: Array<{
        row: number;
        status: "matched" | "unmatched" | "error";
        clientHhaxId?: string;
        caregiverAssignmentId?: string;
        hours?: number;
        week?: number;
        caregiverName?: string;
        clientName?: string;
        error?: string;
      }> = [];

      let totalRows = 0;
      let matched = 0;
      let unmatched = 0;
      let errors = 0;

      const importBatchId = `import_${Date.now()}`;
      const payPeriodStart = new Date(payrollRun.payPeriodStart);
      const payPeriodEnd = new Date(payrollRun.payPeriodEnd);
      const midpoint = new Date(payPeriodStart.getTime() + (payPeriodEnd.getTime() - payPeriodStart.getTime()) / 2);

      // Delete existing entries for this payroll run (re-import replaces old data)
      await storage.deleteTimeEntriesByPayrollRun(runId);

      const entriesToCreate: any[] = [];

      worksheet.eachRow((row: any, rowNumber: number) => {
        if (rowNumber === 1) return; // Skip header row
        totalRows++;

        try {
          const clientHhaxId = row.getCell(1).value?.toString()?.trim();
          const caregiverAssignmentId = row.getCell(2).value?.toString()?.trim();
          const dateValue = row.getCell(3).value;
          const hoursValue = row.getCell(4).value;

          if (!clientHhaxId || !caregiverAssignmentId || !hoursValue) {
            resultsList.push({ 
              row: rowNumber, 
              status: "error", 
              clientHhaxId,
              caregiverAssignmentId,
              error: "Missing required fields" 
            });
            errors++;
            return;
          }

          // Parse date
          let entryDate: Date;
          if (dateValue instanceof Date) {
            entryDate = dateValue;
          } else if (typeof dateValue === "string") {
            entryDate = new Date(dateValue);
          } else {
            resultsList.push({ 
              row: rowNumber, 
              status: "error", 
              clientHhaxId,
              caregiverAssignmentId,
              error: "Invalid date format" 
            });
            errors++;
            return;
          }

          // Parse hours
          let hours: number;
          if (typeof hoursValue === "number") {
            hours = hoursValue;
          } else if (typeof hoursValue === "string") {
            // Handle HH:MM format
            if (hoursValue.includes(":")) {
              const [h, m] = hoursValue.split(":").map(Number);
              hours = h + (m / 60);
            } else {
              hours = parseFloat(hoursValue);
            }
          } else {
            resultsList.push({ 
              row: rowNumber, 
              status: "error", 
              clientHhaxId,
              caregiverAssignmentId,
              error: "Invalid hours format" 
            });
            errors++;
            return;
          }

          // Determine week number (1 or 2)
          const weekNumber = entryDate <= midpoint ? 1 : 2;

          entriesToCreate.push({
            clientHhaxId,
            caregiverAssignmentId,
            entryDate,
            hours,
            weekNumber,
            rowNumber,
          });
        } catch (err: any) {
          resultsList.push({ 
            row: rowNumber, 
            status: "error", 
            error: err.message 
          });
          errors++;
        }
      });

      // Process entries - match caregivers and clients
      for (const entry of entriesToCreate) {
        const caregiver = await storage.getCaregiverByAssignmentId(entry.caregiverAssignmentId);
        const client = await storage.getClientByHhaxId(entry.clientHhaxId);

        if (!caregiver) {
          resultsList.push({
            row: entry.rowNumber,
            status: "unmatched",
            clientHhaxId: entry.clientHhaxId,
            caregiverAssignmentId: entry.caregiverAssignmentId,
            hours: entry.hours,
            week: entry.weekNumber,
            error: `Caregiver not found for Assignment ID: ${entry.caregiverAssignmentId}`,
          });
          unmatched++;
          continue;
        }

        if (!client) {
          resultsList.push({
            row: entry.rowNumber,
            status: "unmatched",
            clientHhaxId: entry.clientHhaxId,
            caregiverAssignmentId: entry.caregiverAssignmentId,
            hours: entry.hours,
            week: entry.weekNumber,
            caregiverName: `${caregiver.firstName || ""} ${caregiver.lastName || ""}`.trim(),
            error: `Client not found for HHAX ID: ${entry.clientHhaxId}`,
          });
          unmatched++;
          continue;
        }

        await storage.createTimeEntry({
          payrollRunId: runId,
          caregiverId: caregiver.id,
          clientId: client.id,
          entryDate: entry.entryDate,
          hoursWorked: entry.hours.toFixed(2),
          weekNumber: entry.weekNumber,
          sourceRowNumber: entry.rowNumber,
          importBatchId,
        });

        const caregiverName = `${caregiver.firstName || ""} ${caregiver.lastName || ""}`.trim();
        const clientName = client.firstName && client.lastName 
          ? `${client.firstName} ${client.lastName}` 
          : client.hhaxAdmissionId || "";

        resultsList.push({
          row: entry.rowNumber,
          status: "matched",
          clientHhaxId: entry.clientHhaxId,
          caregiverAssignmentId: entry.caregiverAssignmentId,
          hours: entry.hours,
          week: entry.weekNumber,
          caregiverName,
          clientName,
        });
        matched++;
      }

      res.json({
        summary: {
          total: totalRows,
          matched,
          unmatched,
          errors,
        },
        results: resultsList,
        importBatchId,
      });
    } catch (error) {
      console.error("Error importing billing hours:", error);
      res.status(500).json({ message: "Failed to import billing hours" });
    }
  });

  // Calculate overtime hours for a payroll run
  app.post("/api/payroll/:runId/calculate-overtime", isAuthenticated, async (req, res) => {
    try {
      const { runId } = req.params;
      
      const payrollRun = await storage.getPayrollRun(runId);
      if (!payrollRun) {
        return res.status(404).json({ message: "Payroll run not found" });
      }

      // Get all time entries for this payroll run
      const timeEntries = await storage.getTimeEntriesByPayrollRun(runId);
      
      // Group by caregiver and week
      const caregiverHours: { [caregiverId: string]: { week1: number; week2: number } } = {};
      
      for (const entry of timeEntries) {
        if (!caregiverHours[entry.caregiverId]) {
          caregiverHours[entry.caregiverId] = { week1: 0, week2: 0 };
        }
        const hours = parseFloat(entry.hoursWorked) || 0;
        if (entry.weekNumber === 1) {
          caregiverHours[entry.caregiverId].week1 += hours;
        } else {
          caregiverHours[entry.caregiverId].week2 += hours;
        }
      }

      // Calculate regular vs overtime for each caregiver
      const results: any[] = [];
      
      for (const [caregiverId, hours] of Object.entries(caregiverHours)) {
        // Overtime = hours above 40 per week
        const week1Regular = Math.min(hours.week1, 40);
        const week1OT = Math.max(0, hours.week1 - 40);
        const week2Regular = Math.min(hours.week2, 40);
        const week2OT = Math.max(0, hours.week2 - 40);
        
        const totalRegular = week1Regular + week2Regular;
        const totalOT = week1OT + week2OT;
        const totalHours = hours.week1 + hours.week2;

        // Get existing line item or create new one
        const existingItems = await storage.getPayrollLineItems(runId);
        const existingItem = existingItems.find(item => item.caregiverId === caregiverId);

        if (existingItem) {
          await storage.updatePayrollLineItem(existingItem.id, {
            hoursWorked: totalHours.toFixed(2),
            regularHours: totalRegular.toFixed(2),
            overtimeHours: totalOT.toFixed(2),
            week1RegularHours: week1Regular.toFixed(2),
            week1OvertimeHours: week1OT.toFixed(2),
            week2RegularHours: week2Regular.toFixed(2),
            week2OvertimeHours: week2OT.toFixed(2),
          });
        } else {
          await storage.createPayrollLineItem({
            payrollRunId: runId,
            caregiverId,
            hoursWorked: totalHours.toFixed(2),
            regularHours: totalRegular.toFixed(2),
            overtimeHours: totalOT.toFixed(2),
            week1RegularHours: week1Regular.toFixed(2),
            week1OvertimeHours: week1OT.toFixed(2),
            week2RegularHours: week2Regular.toFixed(2),
            week2OvertimeHours: week2OT.toFixed(2),
          });
        }

        results.push({
          caregiverId,
          week1: { regular: week1Regular, overtime: week1OT },
          week2: { regular: week2Regular, overtime: week2OT },
          total: { regular: totalRegular, overtime: totalOT, hours: totalHours },
        });
      }

      res.json({ message: "Overtime calculated", results });
    } catch (error) {
      console.error("Error calculating overtime:", error);
      res.status(500).json({ message: "Failed to calculate overtime" });
    }
  });

  // Export payroll hours by caregiver with ADP code
  app.get("/api/payroll/:runId/export-hours", isAuthenticated, async (req, res) => {
    try {
      const { runId } = req.params;
      
      const payrollRun = await storage.getPayrollRun(runId);
      if (!payrollRun) {
        return res.status(404).json({ message: "Payroll run not found" });
      }

      // Get line items with caregiver details
      const lineItems = await storage.getPayrollLineItems(runId);
      const caregivers = await storage.getAllCaregivers();
      
      const exportData: any[] = [];
      
      for (const item of lineItems) {
        const caregiver = caregivers.find(c => c.id === item.caregiverId);
        if (!caregiver) continue;

        exportData.push({
          adpCode: caregiver.adpCode || "",
          caregiverName: `${caregiver.firstName || ""} ${caregiver.lastName || ""}`.trim(),
          payPeriodStart: payrollRun.payPeriodStart,
          payPeriodEnd: payrollRun.payPeriodEnd,
          week1RegularHours: parseFloat(item.week1RegularHours || "0"),
          week1OvertimeHours: parseFloat(item.week1OvertimeHours || "0"),
          week2RegularHours: parseFloat(item.week2RegularHours || "0"),
          week2OvertimeHours: parseFloat(item.week2OvertimeHours || "0"),
          totalRegularHours: parseFloat(item.regularHours || "0"),
          totalOvertimeHours: parseFloat(item.overtimeHours || "0"),
          totalHours: parseFloat(item.hoursWorked || "0"),
        });
      }

      // Generate Excel file
      const ExcelJS = require("exceljs");
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Payroll Hours");

      worksheet.columns = [
        { header: "ADP Code", key: "adpCode", width: 15 },
        { header: "Caregiver Name", key: "caregiverName", width: 25 },
        { header: "Pay Period Start", key: "payPeriodStart", width: 15 },
        { header: "Pay Period End", key: "payPeriodEnd", width: 15 },
        { header: "Week 1 Regular", key: "week1RegularHours", width: 15 },
        { header: "Week 1 OT", key: "week1OvertimeHours", width: 12 },
        { header: "Week 2 Regular", key: "week2RegularHours", width: 15 },
        { header: "Week 2 OT", key: "week2OvertimeHours", width: 12 },
        { header: "Total Regular", key: "totalRegularHours", width: 15 },
        { header: "Total OT", key: "totalOvertimeHours", width: 12 },
        { header: "Total Hours", key: "totalHours", width: 12 },
      ];

      exportData.forEach(row => worksheet.addRow(row));

      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=payroll_hours_${runId}.xlsx`);
      
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Error exporting payroll hours:", error);
      res.status(500).json({ message: "Failed to export payroll hours" });
    }
  });

  // Get time entries for a payroll run
  app.get("/api/payroll/:runId/time-entries", isAuthenticated, async (req, res) => {
    try {
      const entries = await storage.getTimeEntriesByPayrollRun(req.params.runId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching time entries:", error);
      res.status(500).json({ message: "Failed to fetch time entries" });
    }
  });

  // ==================== PAYROLL HOLIDAYS ROUTES ====================
  app.get("/api/payroll-holidays", isAuthenticated, async (req, res) => {
    try {
      const officeId = req.query.officeId as string;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      if (!officeId) {
        return res.status(400).json({ message: "Office ID is required" });
      }
      if (year) {
        await storage.initializeDefaultHolidays(officeId, year);
      }
      const holidays = await storage.getPayrollHolidays(officeId, year);
      res.json(holidays);
    } catch (error) {
      console.error("Error fetching payroll holidays:", error);
      res.status(500).json({ message: "Failed to fetch holidays" });
    }
  });

  app.post("/api/payroll-holidays", isAuthenticated, async (req, res) => {
    try {
      const data = {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : null,
        isDefault: false,
      };
      const holiday = await storage.createPayrollHoliday(data);
      res.status(201).json(holiday);
    } catch (error) {
      console.error("Error creating payroll holiday:", error);
      res.status(400).json({ message: "Failed to create holiday" });
    }
  });

  app.put("/api/payroll-holidays/:id", isAuthenticated, async (req, res) => {
    try {
      const data = {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : undefined,
      };
      const holiday = await storage.updatePayrollHoliday(req.params.id, data);
      res.json(holiday);
    } catch (error) {
      console.error("Error updating payroll holiday:", error);
      res.status(400).json({ message: "Failed to update holiday" });
    }
  });

  app.delete("/api/payroll-holidays/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deletePayrollHoliday(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting payroll holiday:", error);
      res.status(500).json({ message: "Failed to delete holiday" });
    }
  });

  // ==================== PA SURVEY CHECKLIST ROUTES ====================
  app.get("/api/pa-survey/checklist", isAuthenticated, async (req, res) => {
    try {
      await storage.seedDefaultPaSurveyChecklistItems();
      const items = await storage.getPaSurveyChecklistItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching PA survey checklist:", error);
      res.status(500).json({ message: "Failed to fetch checklist items" });
    }
  });

  app.post("/api/pa-survey/checklist", isAuthenticated, async (req, res) => {
    try {
      const item = await storage.createPaSurveyChecklistItem(req.body);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating PA survey checklist item:", error);
      res.status(400).json({ message: "Failed to create checklist item" });
    }
  });

  app.put("/api/pa-survey/checklist/:id", isAuthenticated, async (req, res) => {
    try {
      const item = await storage.updatePaSurveyChecklistItem(req.params.id, req.body);
      res.json(item);
    } catch (error) {
      console.error("Error updating PA survey checklist item:", error);
      res.status(400).json({ message: "Failed to update checklist item" });
    }
  });

  app.delete("/api/pa-survey/checklist/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deletePaSurveyChecklistItem(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting PA survey checklist item:", error);
      res.status(500).json({ message: "Failed to delete checklist item" });
    }
  });

  // Office PA Survey Status routes
  app.get("/api/offices/:officeId/pa-survey", isAuthenticated, async (req, res) => {
    try {
      await storage.seedDefaultPaSurveyChecklistItems();
      const statuses = await storage.initializeOfficePaSurveyStatuses(req.params.officeId);
      const items = await storage.getPaSurveyChecklistItems();
      
      const result = items.map(item => {
        const status = statuses.find(s => s.checklistItemId === item.id);
        return {
          ...item,
          status: status?.status || 'not_started',
          statusId: status?.id,
          assignedTo: status?.assignedTo,
          dueDate: status?.dueDate,
          completedAt: status?.completedAt,
          notes: status?.notes,
        };
      });
      
      res.json(result);
    } catch (error) {
      console.error("Error fetching office PA survey status:", error);
      res.status(500).json({ message: "Failed to fetch survey status" });
    }
  });

  app.put("/api/offices/:officeId/pa-survey/:checklistItemId", isAuthenticated, async (req: any, res) => {
    try {
      const updateData: any = {
        officeId: req.params.officeId,
        checklistItemId: req.params.checklistItemId,
        ...req.body,
        updatedBy: req.session?.user?.id,
      };
      
      if (req.body.status === 'complete') {
        updateData.completedAt = new Date();
        updateData.completedBy = req.session?.user?.id;
      }
      
      const status = await storage.upsertOfficePaSurveyStatus(updateData);
      res.json(status);
    } catch (error) {
      console.error("Error updating office PA survey status:", error);
      res.status(400).json({ message: "Failed to update survey status" });
    }
  });

  // ==================== CAREGIVER PROFILE ROUTES ====================

  // Caregiver Notes
  app.get("/api/caregivers/:caregiverId/notes", isAuthenticated, async (req, res) => {
    try {
      const notes = await storage.getCaregiverNotes(req.params.caregiverId);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching caregiver notes:", error);
      res.status(500).json({ message: "Failed to fetch caregiver notes" });
    }
  });

  app.post("/api/caregivers/:caregiverId/notes", isAuthenticated, async (req: any, res) => {
    try {
      const { caregiverId: _, authorId: __, ...userBody } = req.body;
      const validatedBody = insertCaregiverNoteSchema.omit({ caregiverId: true, authorId: true }).parse(userBody);
      const note = await storage.createCaregiverNote({
        ...validatedBody,
        caregiverId: req.params.caregiverId,
        authorId: req.session?.user?.id,
      });
      res.status(201).json(note);
    } catch (error) {
      console.error("Error creating caregiver note:", error);
      res.status(400).json({ message: "Failed to create caregiver note" });
    }
  });

  app.put("/api/caregiver-notes/:id", isAuthenticated, async (req, res) => {
    try {
      const { caregiverId, authorId, ...updateData } = req.body;
      const validatedData = insertCaregiverNoteSchema.partial().parse(updateData);
      const note = await storage.updateCaregiverNote(req.params.id, validatedData);
      res.json(note);
    } catch (error) {
      console.error("Error updating caregiver note:", error);
      res.status(400).json({ message: "Failed to update caregiver note" });
    }
  });

  app.delete("/api/caregiver-notes/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteCaregiverNote(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting caregiver note:", error);
      res.status(500).json({ message: "Failed to delete caregiver note" });
    }
  });

  // Caregiver Preferences
  app.get("/api/caregivers/:caregiverId/preferences", isAuthenticated, async (req, res) => {
    try {
      const preferences = await storage.getCaregiverPreferences(req.params.caregiverId);
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching caregiver preferences:", error);
      res.status(500).json({ message: "Failed to fetch caregiver preferences" });
    }
  });

  app.post("/api/caregivers/:caregiverId/preferences", isAuthenticated, async (req, res) => {
    try {
      const { caregiverId: _, ...userBody } = req.body;
      const validatedBody = insertCaregiverPreferenceSchema.omit({ caregiverId: true }).parse(userBody);
      const preference = await storage.createCaregiverPreference({
        ...validatedBody,
        caregiverId: req.params.caregiverId,
      });
      res.status(201).json(preference);
    } catch (error) {
      console.error("Error creating caregiver preference:", error);
      res.status(400).json({ message: "Failed to create caregiver preference" });
    }
  });

  app.put("/api/caregiver-preferences/:id", isAuthenticated, async (req, res) => {
    try {
      const { caregiverId, ...updateData } = req.body;
      const validatedData = insertCaregiverPreferenceSchema.partial().parse(updateData);
      const preference = await storage.updateCaregiverPreference(req.params.id, validatedData);
      res.json(preference);
    } catch (error) {
      console.error("Error updating caregiver preference:", error);
      res.status(400).json({ message: "Failed to update caregiver preference" });
    }
  });

  app.delete("/api/caregiver-preferences/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteCaregiverPreference(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting caregiver preference:", error);
      res.status(500).json({ message: "Failed to delete caregiver preference" });
    }
  });

  // Caregiver Absences
  app.get("/api/caregivers/:caregiverId/absences", isAuthenticated, async (req, res) => {
    try {
      const absences = await storage.getCaregiverAbsences(req.params.caregiverId);
      res.json(absences);
    } catch (error) {
      console.error("Error fetching caregiver absences:", error);
      res.status(500).json({ message: "Failed to fetch caregiver absences" });
    }
  });

  app.post("/api/caregivers/:caregiverId/absences", isAuthenticated, async (req, res) => {
    try {
      const { caregiverId: _, ...userBody } = req.body;
      const coercedData = {
        ...userBody,
        startDate: coerceDate(userBody.startDate),
        endDate: coerceDate(userBody.endDate),
        approvedAt: coerceDate(userBody.approvedAt),
      };
      const validatedBody = insertCaregiverAbsenceSchema.omit({ caregiverId: true }).parse(coercedData);
      const absence = await storage.createCaregiverAbsence({
        ...validatedBody,
        caregiverId: req.params.caregiverId,
      });
      res.status(201).json(absence);
    } catch (error) {
      console.error("Error creating caregiver absence:", error);
      res.status(400).json({ message: "Failed to create caregiver absence" });
    }
  });

  app.put("/api/caregiver-absences/:id", isAuthenticated, async (req, res) => {
    try {
      const { caregiverId, ...updateData } = req.body;
      const coercedData = {
        ...updateData,
        startDate: coerceDate(updateData.startDate),
        endDate: coerceDate(updateData.endDate),
        approvedAt: coerceDate(updateData.approvedAt),
      };
      const validatedData = insertCaregiverAbsenceSchema.partial().parse(coercedData);
      const absence = await storage.updateCaregiverAbsence(req.params.id, validatedData);
      res.json(absence);
    } catch (error) {
      console.error("Error updating caregiver absence:", error);
      res.status(400).json({ message: "Failed to update caregiver absence" });
    }
  });

  app.delete("/api/caregiver-absences/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteCaregiverAbsence(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting caregiver absence:", error);
      res.status(500).json({ message: "Failed to delete caregiver absence" });
    }
  });

  // Caregiver Availability
  app.get("/api/caregivers/:caregiverId/availability", isAuthenticated, async (req, res) => {
    try {
      const availability = await storage.getCaregiverAvailability(req.params.caregiverId);
      res.json(availability);
    } catch (error) {
      console.error("Error fetching caregiver availability:", error);
      res.status(500).json({ message: "Failed to fetch caregiver availability" });
    }
  });

  app.post("/api/caregivers/:caregiverId/availability", isAuthenticated, async (req, res) => {
    try {
      const { caregiverId: _, ...userBody } = req.body;
      const validatedBody = insertCaregiverAvailabilitySchema.omit({ caregiverId: true }).parse(userBody);
      const availability = await storage.createCaregiverAvailability({
        ...validatedBody,
        caregiverId: req.params.caregiverId,
      });
      res.status(201).json(availability);
    } catch (error) {
      console.error("Error creating caregiver availability:", error);
      res.status(400).json({ message: "Failed to create caregiver availability" });
    }
  });

  app.put("/api/caregiver-availability/:id", isAuthenticated, async (req, res) => {
    try {
      const { caregiverId, ...updateData } = req.body;
      const validatedData = insertCaregiverAvailabilitySchema.partial().parse(updateData);
      const availability = await storage.updateCaregiverAvailability(req.params.id, validatedData);
      res.json(availability);
    } catch (error) {
      console.error("Error updating caregiver availability:", error);
      res.status(400).json({ message: "Failed to update caregiver availability" });
    }
  });

  app.delete("/api/caregiver-availability/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteCaregiverAvailability(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting caregiver availability:", error);
      res.status(500).json({ message: "Failed to delete caregiver availability" });
    }
  });

  // Weekly Availability - GET/PUT bulk operations
  app.get("/api/caregivers/:id/weekly-availability", isAuthenticated, async (req, res) => {
    try {
      const availability = await storage.getCaregiverAvailability(req.params.id);
      res.json(availability);
    } catch (error) {
      console.error("Error fetching weekly availability:", error);
      res.status(500).json({ message: "Failed to fetch weekly availability" });
    }
  });

  app.put("/api/caregivers/:id/weekly-availability", isAuthenticated, async (req, res) => {
    try {
      const { availability } = req.body;
      if (!Array.isArray(availability)) {
        return res.status(400).json({ message: "availability must be an array" });
      }
      const result = await storage.setWeeklyAvailability(req.params.id, availability);
      res.json(result);
    } catch (error) {
      console.error("Error setting weekly availability:", error);
      res.status(400).json({ message: "Failed to set weekly availability" });
    }
  });

  // Availability Exceptions
  app.get("/api/caregivers/:id/availability-exceptions", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const exceptions = await storage.getAvailabilityExceptions(
        req.params.id,
        startDate ? new Date(String(startDate)) : undefined,
        endDate ? new Date(String(endDate)) : undefined
      );
      res.json(exceptions);
    } catch (error) {
      console.error("Error fetching availability exceptions:", error);
      res.status(500).json({ message: "Failed to fetch availability exceptions" });
    }
  });

  app.post("/api/caregivers/:id/availability-exceptions", isAuthenticated, async (req, res) => {
    try {
      const { caregiverId: _, ...userBody } = req.body;
      const coercedData = {
        ...userBody,
        date: coerceDate(userBody.date),
        approvedAt: coerceDate(userBody.approvedAt),
      };
      const validatedBody = insertCaregiverAvailabilityExceptionSchema.omit({ caregiverId: true }).parse(coercedData);
      const exception = await storage.createAvailabilityException({
        ...validatedBody,
        caregiverId: req.params.id,
      });
      res.status(201).json(exception);
    } catch (error) {
      console.error("Error creating availability exception:", error);
      res.status(400).json({ message: "Failed to create availability exception" });
    }
  });

  app.delete("/api/caregivers/:id/availability-exceptions/:exceptionId", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteAvailabilityException(req.params.exceptionId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting availability exception:", error);
      res.status(500).json({ message: "Failed to delete availability exception" });
    }
  });

  // Availability Check - Find available caregivers for a time slot
  app.get("/api/availability/check", isAuthenticated, async (req, res) => {
    try {
      const { date, startTime, endTime, officeId } = req.query;
      if (!date || !startTime || !endTime) {
        return res.status(400).json({ message: "date, startTime, and endTime are required" });
      }
      const availableCaregivers = await storage.getAvailableCaregivers(
        new Date(String(date)),
        String(startTime),
        String(endTime),
        officeId ? String(officeId) : undefined
      );
      res.json(availableCaregivers);
    } catch (error) {
      console.error("Error checking availability:", error);
      res.status(500).json({ message: "Failed to check availability" });
    }
  });

  // Check single caregiver availability
  app.get("/api/caregivers/:id/check-availability", isAuthenticated, async (req, res) => {
    try {
      const { date, startTime, endTime } = req.query;
      if (!date || !startTime || !endTime) {
        return res.status(400).json({ message: "date, startTime, and endTime are required" });
      }
      const result = await storage.checkCaregiverAvailability(
        req.params.id,
        new Date(String(date)),
        String(startTime),
        String(endTime)
      );
      res.json(result);
    } catch (error) {
      console.error("Error checking caregiver availability:", error);
      res.status(500).json({ message: "Failed to check caregiver availability" });
    }
  });

  // Caregiver Payroll Info
  app.get("/api/caregivers/:caregiverId/payroll-info", isAuthenticated, async (req, res) => {
    try {
      const info = await storage.getCaregiverPayrollInfo(req.params.caregiverId);
      res.json(info || null);
    } catch (error) {
      console.error("Error fetching caregiver payroll info:", error);
      res.status(500).json({ message: "Failed to fetch caregiver payroll info" });
    }
  });

  app.post("/api/caregivers/:caregiverId/payroll-info", isAuthenticated, async (req, res) => {
    try {
      const { caregiverId: _, ...userBody } = req.body;
      const validatedBody = insertCaregiverPayrollInfoSchema.omit({ caregiverId: true }).parse(userBody);
      const info = await storage.upsertCaregiverPayrollInfo({
        ...validatedBody,
        caregiverId: req.params.caregiverId,
      });
      res.status(201).json(info);
    } catch (error) {
      console.error("Error saving caregiver payroll info:", error);
      res.status(400).json({ message: "Failed to save caregiver payroll info" });
    }
  });

  // Caregiver Expenses
  app.get("/api/caregivers/:caregiverId/expenses", isAuthenticated, async (req, res) => {
    try {
      const expenses = await storage.getCaregiverExpenses(req.params.caregiverId);
      res.json(expenses);
    } catch (error) {
      console.error("Error fetching caregiver expenses:", error);
      res.status(500).json({ message: "Failed to fetch caregiver expenses" });
    }
  });

  app.post("/api/caregivers/:caregiverId/expenses", isAuthenticated, async (req, res) => {
    try {
      const { caregiverId: _, ...userBody } = req.body;
      const coercedData = {
        ...userBody,
        expenseDate: coerceDate(userBody.expenseDate),
        approvedAt: coerceDate(userBody.approvedAt),
        paidAt: coerceDate(userBody.paidAt),
      };
      const validatedBody = insertCaregiverExpenseSchema.omit({ caregiverId: true }).parse(coercedData);
      const expense = await storage.createCaregiverExpense({
        ...validatedBody,
        caregiverId: req.params.caregiverId,
      });
      res.status(201).json(expense);
    } catch (error) {
      console.error("Error creating caregiver expense:", error);
      res.status(400).json({ message: "Failed to create caregiver expense" });
    }
  });

  app.put("/api/caregiver-expenses/:id", isAuthenticated, async (req, res) => {
    try {
      const { caregiverId, ...updateData } = req.body;
      const coercedData = {
        ...updateData,
        expenseDate: coerceDate(updateData.expenseDate),
        approvedAt: coerceDate(updateData.approvedAt),
        paidAt: coerceDate(updateData.paidAt),
      };
      const validatedData = insertCaregiverExpenseSchema.partial().parse(coercedData);
      const expense = await storage.updateCaregiverExpense(req.params.id, validatedData);
      res.json(expense);
    } catch (error) {
      console.error("Error updating caregiver expense:", error);
      res.status(400).json({ message: "Failed to update caregiver expense" });
    }
  });

  app.delete("/api/caregiver-expenses/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteCaregiverExpense(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting caregiver expense:", error);
      res.status(500).json({ message: "Failed to delete caregiver expense" });
    }
  });

  // Caregiver Paychecks
  app.get("/api/caregivers/:caregiverId/paychecks", isAuthenticated, async (req, res) => {
    try {
      const paychecks = await storage.getCaregiverPaychecks(req.params.caregiverId);
      res.json(paychecks);
    } catch (error) {
      console.error("Error fetching caregiver paychecks:", error);
      res.status(500).json({ message: "Failed to fetch caregiver paychecks" });
    }
  });

  app.post("/api/caregivers/:caregiverId/paychecks", isAuthenticated, async (req, res) => {
    try {
      const { caregiverId: _, ...userBody } = req.body;
      const coercedData = {
        ...userBody,
        payPeriodStart: coerceDate(userBody.payPeriodStart),
        payPeriodEnd: coerceDate(userBody.payPeriodEnd),
        payDate: coerceDate(userBody.payDate),
      };
      const validatedBody = insertCaregiverPaycheckSchema.omit({ caregiverId: true }).parse(coercedData);
      const paycheck = await storage.createCaregiverPaycheck({
        ...validatedBody,
        caregiverId: req.params.caregiverId,
      });
      res.status(201).json(paycheck);
    } catch (error) {
      console.error("Error creating caregiver paycheck:", error);
      res.status(400).json({ message: "Failed to create caregiver paycheck" });
    }
  });

  app.put("/api/caregiver-paychecks/:id", isAuthenticated, async (req, res) => {
    try {
      const { caregiverId, ...updateData } = req.body;
      const coercedData = {
        ...updateData,
        payPeriodStart: coerceDate(updateData.payPeriodStart),
        payPeriodEnd: coerceDate(updateData.payPeriodEnd),
        payDate: coerceDate(updateData.payDate),
      };
      const validatedData = insertCaregiverPaycheckSchema.partial().parse(coercedData);
      const paycheck = await storage.updateCaregiverPaycheck(req.params.id, validatedData);
      res.json(paycheck);
    } catch (error) {
      console.error("Error updating caregiver paycheck:", error);
      res.status(400).json({ message: "Failed to update caregiver paycheck" });
    }
  });

  // Caregiver Rates
  app.get("/api/caregivers/:caregiverId/rates", isAuthenticated, async (req, res) => {
    try {
      const rates = await storage.getCaregiverRates(req.params.caregiverId);
      res.json(rates);
    } catch (error) {
      console.error("Error fetching caregiver rates:", error);
      res.status(500).json({ message: "Failed to fetch caregiver rates" });
    }
  });

  app.post("/api/caregivers/:caregiverId/rates", isAuthenticated, async (req, res) => {
    try {
      const { caregiverId: _, ...userBody } = req.body;
      const coercedData = {
        ...userBody,
        effectiveFrom: coerceDate(userBody.effectiveFrom),
        effectiveTo: coerceDate(userBody.effectiveTo),
      };
      const validatedBody = insertCaregiverRateSchema.omit({ caregiverId: true }).parse(coercedData);
      const rate = await storage.createCaregiverRate({
        ...validatedBody,
        caregiverId: req.params.caregiverId,
      });
      res.status(201).json(rate);
    } catch (error) {
      console.error("Error creating caregiver rate:", error);
      res.status(400).json({ message: "Failed to create caregiver rate" });
    }
  });

  app.put("/api/caregiver-rates/:id", isAuthenticated, async (req, res) => {
    try {
      const { caregiverId, ...updateData } = req.body;
      const coercedData = {
        ...updateData,
        effectiveFrom: coerceDate(updateData.effectiveFrom),
        effectiveTo: coerceDate(updateData.effectiveTo),
      };
      const validatedData = insertCaregiverRateSchema.partial().parse(coercedData);
      const rate = await storage.updateCaregiverRate(req.params.id, validatedData);
      res.json(rate);
    } catch (error) {
      console.error("Error updating caregiver rate:", error);
      res.status(400).json({ message: "Failed to update caregiver rate" });
    }
  });

  app.delete("/api/caregiver-rates/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteCaregiverRate(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting caregiver rate:", error);
      res.status(500).json({ message: "Failed to delete caregiver rate" });
    }
  });

  // Caregiver In-Services
  app.get("/api/caregivers/:caregiverId/in-services", isAuthenticated, async (req, res) => {
    try {
      const inServices = await storage.getCaregiverInServices(req.params.caregiverId);
      res.json(inServices);
    } catch (error) {
      console.error("Error fetching caregiver in-services:", error);
      res.status(500).json({ message: "Failed to fetch caregiver in-services" });
    }
  });

  app.post("/api/caregivers/:caregiverId/in-services", isAuthenticated, async (req, res) => {
    try {
      const { caregiverId: _, ...userBody } = req.body;
      const coercedData = {
        ...userBody,
        trainingDate: coerceDate(userBody.trainingDate),
        expirationDate: coerceDate(userBody.expirationDate),
      };
      const validatedBody = insertCaregiverInServiceSchema.omit({ caregiverId: true }).parse(coercedData);
      const inService = await storage.createCaregiverInService({
        ...validatedBody,
        caregiverId: req.params.caregiverId,
      });
      res.status(201).json(inService);
    } catch (error) {
      console.error("Error creating caregiver in-service:", error);
      res.status(400).json({ message: "Failed to create caregiver in-service" });
    }
  });

  app.put("/api/caregiver-in-services/:id", isAuthenticated, async (req, res) => {
    try {
      const { caregiverId, ...updateData } = req.body;
      const coercedData = {
        ...updateData,
        trainingDate: coerceDate(updateData.trainingDate),
        expirationDate: coerceDate(updateData.expirationDate),
      };
      const validatedData = insertCaregiverInServiceSchema.partial().parse(coercedData);
      const inService = await storage.updateCaregiverInService(req.params.id, validatedData);
      res.json(inService);
    } catch (error) {
      console.error("Error updating caregiver in-service:", error);
      res.status(400).json({ message: "Failed to update caregiver in-service" });
    }
  });

  app.delete("/api/caregiver-in-services/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteCaregiverInService(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting caregiver in-service:", error);
      res.status(500).json({ message: "Failed to delete caregiver in-service" });
    }
  });

  // Caregiver Office Moves
  app.get("/api/caregivers/:caregiverId/office-moves", isAuthenticated, async (req, res) => {
    try {
      const moves = await storage.getCaregiverOfficeMoves(req.params.caregiverId);
      res.json(moves);
    } catch (error) {
      console.error("Error fetching caregiver office moves:", error);
      res.status(500).json({ message: "Failed to fetch caregiver office moves" });
    }
  });

  app.post("/api/caregivers/:caregiverId/office-moves", isAuthenticated, async (req: any, res) => {
    try {
      const { caregiverId: _, approvedBy: __, ...userBody } = req.body;
      const coercedData = {
        ...userBody,
        moveDate: coerceDate(userBody.moveDate),
      };
      const validatedBody = insertCaregiverOfficeMoveSchema.omit({ caregiverId: true, approvedBy: true }).parse(coercedData);
      const move = await storage.createCaregiverOfficeMove({
        ...validatedBody,
        caregiverId: req.params.caregiverId,
        approvedBy: req.session?.user?.id,
      });
      res.status(201).json(move);
    } catch (error) {
      console.error("Error creating caregiver office move:", error);
      res.status(400).json({ message: "Failed to create caregiver office move" });
    }
  });

  app.put("/api/caregiver-office-moves/:id", isAuthenticated, async (req, res) => {
    try {
      const { caregiverId, approvedBy, ...updateData } = req.body;
      const coercedData = {
        ...updateData,
        moveDate: coerceDate(updateData.moveDate),
      };
      const validatedData = insertCaregiverOfficeMoveSchema.partial().parse(coercedData);
      const move = await storage.updateCaregiverOfficeMove(req.params.id, validatedData);
      res.json(move);
    } catch (error) {
      console.error("Error updating caregiver office move:", error);
      res.status(400).json({ message: "Failed to update caregiver office move" });
    }
  });

  // Caregiver Schedules
  app.get("/api/caregivers/:caregiverId/schedules", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const schedules = await storage.getCaregiverSchedules(
        req.params.caregiverId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      
      // Enrich schedules with client data
      const enrichedSchedules = await Promise.all(
        schedules.map(async (schedule) => {
          if (schedule.clientId) {
            const client = await storage.getClient(schedule.clientId);
            return { ...schedule, client };
          }
          return { ...schedule, client: null };
        })
      );
      
      res.json(enrichedSchedules);
    } catch (error) {
      console.error("Error fetching caregiver schedules:", error);
      res.status(500).json({ message: "Failed to fetch caregiver schedules" });
    }
  });

  app.post("/api/caregivers/:caregiverId/schedules", isAuthenticated, async (req: any, res) => {
    try {
      const { caregiverId: _, createdBy: __, ...userBody } = req.body;
      const coercedData = {
        ...userBody,
        scheduledDate: coerceDate(userBody.scheduledDate),
        clockInTime: coerceDate(userBody.clockInTime),
        clockOutTime: coerceDate(userBody.clockOutTime),
      };
      const validatedBody = insertCaregiverScheduleSchema.omit({ caregiverId: true, createdBy: true }).parse(coercedData);
      const schedule = await storage.createCaregiverSchedule({
        ...validatedBody,
        caregiverId: req.params.caregiverId,
        createdBy: req.session?.user?.id,
      });
      res.status(201).json(schedule);
    } catch (error) {
      console.error("Error creating caregiver schedule:", error);
      res.status(400).json({ message: "Failed to create caregiver schedule" });
    }
  });

  app.put("/api/caregiver-schedules/:id", isAuthenticated, async (req, res) => {
    try {
      const { caregiverId, createdBy, ...updateData } = req.body;
      const coercedData = {
        ...updateData,
        scheduledDate: coerceDate(updateData.scheduledDate),
        clockInTime: coerceDate(updateData.clockInTime),
        clockOutTime: coerceDate(updateData.clockOutTime),
      };
      const validatedData = insertCaregiverScheduleSchema.partial().parse(coercedData);
      const schedule = await storage.updateCaregiverSchedule(req.params.id, validatedData);
      res.json(schedule);
    } catch (error) {
      console.error("Error updating caregiver schedule:", error);
      res.status(400).json({ message: "Failed to update caregiver schedule" });
    }
  });

  app.delete("/api/caregiver-schedules/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteCaregiverSchedule(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting caregiver schedule:", error);
      res.status(500).json({ message: "Failed to delete caregiver schedule" });
    }
  });

  // ==================== EVV (Electronic Visit Verification) ROUTES ====================
  
  // Clock in with GPS location
  app.post("/api/schedules/:id/clock-in", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { latitude, longitude, distance } = req.body;
      
      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }
      
      // Verify the schedule exists
      const existingSchedule = await storage.getCaregiverSchedule(id);
      if (!existingSchedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      
      // Check if already clocked in
      if (existingSchedule.clockInTime) {
        return res.status(400).json({ message: "Already clocked in for this schedule" });
      }
      
      const schedule = await storage.clockInWithLocation(
        id,
        String(latitude),
        String(longitude),
        distance ? String(distance) : undefined
      );
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "clock_in",
        entityType: "caregiver_schedule",
        entityId: id,
        newValues: { latitude, longitude, distance, clockInTime: schedule.clockInTime },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(schedule);
    } catch (error) {
      console.error("Error clocking in:", error);
      res.status(500).json({ message: "Failed to clock in" });
    }
  });

  // Clock out with GPS location
  app.post("/api/schedules/:id/clock-out", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { latitude, longitude, distance } = req.body;
      
      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }
      
      // Verify the schedule exists
      const existingSchedule = await storage.getCaregiverSchedule(id);
      if (!existingSchedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      
      // Check if not clocked in yet
      if (!existingSchedule.clockInTime) {
        return res.status(400).json({ message: "Must clock in before clocking out" });
      }
      
      // Check if already clocked out
      if (existingSchedule.clockOutTime) {
        return res.status(400).json({ message: "Already clocked out for this schedule" });
      }
      
      const schedule = await storage.clockOutWithLocation(
        id,
        String(latitude),
        String(longitude),
        distance ? String(distance) : undefined
      );
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "clock_out",
        entityType: "caregiver_schedule",
        entityId: id,
        newValues: { latitude, longitude, distance, clockOutTime: schedule.clockOutTime, evvStatus: schedule.evvStatus },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(schedule);
    } catch (error) {
      console.error("Error clocking out:", error);
      res.status(500).json({ message: "Failed to clock out" });
    }
  });

  // Get EVV compliance statistics
  app.get("/api/evv/compliance", isAuthenticated, async (req, res) => {
    try {
      const { officeId, startDate, endDate } = req.query;
      
      const stats = await storage.getEvvComplianceStats(
        officeId && officeId !== 'all' ? String(officeId) : undefined,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching EVV compliance stats:", error);
      res.status(500).json({ message: "Failed to fetch EVV compliance statistics" });
    }
  });

  // ==================== BULK PAYSTUB UPLOAD ====================
  app.post("/api/bulk-paystub-upload", isAuthenticated, upload.single("file"), async (req: any, res) => {
    const tempFiles: string[] = [];
    try {
      const userRole = req.session?.user?.role || "caregiver";
      const allowedRoles = ["admin", "super_admin", "supervisor"];
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: "Insufficient permissions for bulk paystub upload" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileExt = path.extname(req.file.originalname).toLowerCase();
      if (fileExt !== ".pdf") {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "Only PDF files are supported for paystub extraction" });
      }

      const officeId = req.body.officeId;
      if (!officeId) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "Office ID is required" });
      }

      // Extract paystubs from PDF
      const extractedPages = await extractPaystubsFromPdf(req.file.path);
      tempFiles.push(...extractedPages.map(p => p.imagePath));

      // Get all caregivers for matching
      const caregivers = await storage.getAllCaregivers(officeId);

      // Process results
      const results: {
        pageNumber: number;
        status: "matched" | "unmatched" | "not_paystub" | "error";
        caregiverId?: string;
        caregiverName?: string;
        extractedName?: string;
        payPeriod?: { start?: string; end?: string };
        grossPay?: number;
        netPay?: number;
        message?: string;
        paycheckId?: string;
      }[] = [];

      for (const page of extractedPages) {
        const { pageNumber, data } = page;

        if (!data.isPaystub) {
          results.push({
            pageNumber,
            status: "not_paystub",
            message: "Page does not appear to be a paystub",
          });
          continue;
        }

        // Try to match employee name to caregiver
        const extractedFirstName = (data.employeeFirstName || "").toLowerCase().trim();
        const extractedLastName = (data.employeeLastName || "").toLowerCase().trim();
        const extractedFullName = (data.employeeName || "").toLowerCase().trim();

        let matchedCaregiver = null;

        // First try exact first+last name match
        for (const caregiver of caregivers) {
          const cgFirstName = (caregiver.firstName || "").toLowerCase().trim();
          const cgLastName = (caregiver.lastName || "").toLowerCase().trim();
          
          if (extractedFirstName && extractedLastName) {
            if (cgFirstName === extractedFirstName && cgLastName === extractedLastName) {
              matchedCaregiver = caregiver;
              break;
            }
          }
        }

        // If no match, try partial matching with full name
        if (!matchedCaregiver && extractedFullName) {
          for (const caregiver of caregivers) {
            const cgFullName = `${caregiver.firstName} ${caregiver.lastName}`.toLowerCase().trim();
            const cgFullNameReversed = `${caregiver.lastName} ${caregiver.firstName}`.toLowerCase().trim();
            
            if (extractedFullName === cgFullName || extractedFullName === cgFullNameReversed) {
              matchedCaregiver = caregiver;
              break;
            }
            
            // Partial match - check if names are contained
            if (extractedFullName.includes(cgFullName) || cgFullName.includes(extractedFullName)) {
              matchedCaregiver = caregiver;
              break;
            }
          }
        }

        if (!matchedCaregiver) {
          results.push({
            pageNumber,
            status: "unmatched",
            extractedName: data.employeeName || `${data.employeeFirstName} ${data.employeeLastName}`,
            payPeriod: { start: data.payPeriodStart, end: data.payPeriodEnd },
            grossPay: data.grossPay,
            netPay: data.netPay,
            message: "Could not match employee name to any caregiver",
          });
          continue;
        }

        // Create paycheck record
        try {
          const paycheck = await storage.createCaregiverPaycheck({
            caregiverId: matchedCaregiver.id,
            payPeriodStart: data.payPeriodStart ? new Date(data.payPeriodStart) : null,
            payPeriodEnd: data.payPeriodEnd ? new Date(data.payPeriodEnd) : null,
            payDate: data.payDate ? new Date(data.payDate) : null,
            regularHours: data.regularHours?.toString() || null,
            overtimeHours: data.overtimeHours?.toString() || null,
            grossPay: data.grossPay?.toString() || null,
            netPay: data.netPay?.toString() || null,
            federalTax: data.federalTax?.toString() || null,
            stateTax: data.stateTax?.toString() || null,
            socialSecurity: data.socialSecurity?.toString() || null,
            medicare: data.medicare?.toString() || null,
            otherDeductions: data.otherDeductions?.toString() || null,
            checkNumber: data.checkNumber || null,
            notes: `Extracted from bulk paystub upload (page ${pageNumber})`,
          });

          results.push({
            pageNumber,
            status: "matched",
            caregiverId: matchedCaregiver.id,
            caregiverName: `${matchedCaregiver.firstName} ${matchedCaregiver.lastName}`,
            extractedName: data.employeeName,
            payPeriod: { start: data.payPeriodStart, end: data.payPeriodEnd },
            grossPay: data.grossPay,
            netPay: data.netPay,
            paycheckId: paycheck.id,
          });
        } catch (err) {
          console.error("Error creating paycheck record:", err);
          results.push({
            pageNumber,
            status: "error",
            caregiverId: matchedCaregiver.id,
            caregiverName: `${matchedCaregiver.firstName} ${matchedCaregiver.lastName}`,
            message: "Failed to create paycheck record",
          });
        }
      }

      // Clean up
      cleanupPaystubTempFiles(tempFiles);
      fs.unlinkSync(req.file.path);

      const matched = results.filter(r => r.status === "matched").length;
      const unmatched = results.filter(r => r.status === "unmatched").length;
      const notPaystub = results.filter(r => r.status === "not_paystub").length;
      const errors = results.filter(r => r.status === "error").length;

      res.json({
        success: true,
        summary: {
          totalPages: extractedPages.length,
          matched,
          unmatched,
          notPaystub,
          errors,
        },
        results,
      });
    } catch (error) {
      console.error("Error processing bulk paystub upload:", error);
      cleanupPaystubTempFiles(tempFiles);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ message: "Failed to process paystub upload" });
    }
  });

  // ==================== MEDICATION TRACKING ====================
  // Get all medications for a client
  app.get("/api/clients/:id/medications", isAuthenticated, async (req, res) => {
    try {
      const medications = await storage.getMedicationsByClient(req.params.id);
      res.json(medications);
    } catch (error) {
      console.error("Error fetching medications:", error);
      res.status(500).json({ message: "Failed to fetch medications" });
    }
  });

  // Create a new medication for a client
  app.post("/api/clients/:id/medications", isAuthenticated, async (req: any, res) => {
    try {
      const processedBody = {
        ...req.body,
        clientId: req.params.id,
        startDate: coerceDate(req.body.startDate),
        endDate: coerceDate(req.body.endDate),
        refillDate: coerceDate(req.body.refillDate),
      };
      const validatedData = insertMedicationSchema.parse(processedBody);
      const medication = await storage.createMedication(validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "medication",
        entityId: medication.id,
        newValues: medication,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(201).json(medication);
    } catch (error) {
      console.error("Error creating medication:", error);
      res.status(400).json({ message: "Failed to create medication" });
    }
  });

  // Get a single medication
  app.get("/api/medications/:id", isAuthenticated, async (req, res) => {
    try {
      const medication = await storage.getMedication(req.params.id);
      if (!medication) {
        return res.status(404).json({ message: "Medication not found" });
      }
      res.json(medication);
    } catch (error) {
      console.error("Error fetching medication:", error);
      res.status(500).json({ message: "Failed to fetch medication" });
    }
  });

  // Update a medication
  app.patch("/api/medications/:id", isAuthenticated, async (req: any, res) => {
    try {
      const oldMedication = await storage.getMedication(req.params.id);
      if (!oldMedication) {
        return res.status(404).json({ message: "Medication not found" });
      }
      
      const processedBody = {
        ...req.body,
        startDate: coerceDate(req.body.startDate),
        endDate: coerceDate(req.body.endDate),
        refillDate: coerceDate(req.body.refillDate),
      };
      const validatedData = insertMedicationSchema.partial().parse(processedBody);
      const medication = await storage.updateMedication(req.params.id, validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "update",
        entityType: "medication",
        entityId: medication.id,
        oldValues: oldMedication,
        newValues: medication,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(medication);
    } catch (error) {
      console.error("Error updating medication:", error);
      res.status(400).json({ message: "Failed to update medication" });
    }
  });

  // Delete a medication
  app.delete("/api/medications/:id", isAuthenticated, async (req: any, res) => {
    try {
      const medication = await storage.getMedication(req.params.id);
      if (!medication) {
        return res.status(404).json({ message: "Medication not found" });
      }
      
      await storage.deleteMedication(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "delete",
        entityType: "medication",
        entityId: req.params.id,
        oldValues: medication,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting medication:", error);
      res.status(500).json({ message: "Failed to delete medication" });
    }
  });

  // Log medication adherence
  app.post("/api/medications/:id/log", isAuthenticated, async (req: any, res) => {
    try {
      const medication = await storage.getMedication(req.params.id);
      if (!medication) {
        return res.status(404).json({ message: "Medication not found" });
      }
      
      const processedBody = {
        ...req.body,
        medicationId: req.params.id,
        clientId: medication.clientId,
        scheduledTime: coerceDate(req.body.scheduledTime),
        takenTime: coerceDate(req.body.takenTime),
      };
      const validatedData = insertMedicationLogSchema.parse(processedBody);
      const log = await storage.createMedicationLog(validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "medication_log",
        entityId: log.id,
        newValues: log,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(201).json(log);
    } catch (error) {
      console.error("Error creating medication log:", error);
      res.status(400).json({ message: "Failed to create medication log" });
    }
  });

  // Get medication adherence statistics
  app.get("/api/medications/:id/adherence", isAuthenticated, async (req, res) => {
    try {
      const medication = await storage.getMedication(req.params.id);
      if (!medication) {
        return res.status(404).json({ message: "Medication not found" });
      }
      
      const adherence = await storage.getMedicationAdherence(req.params.id);
      res.json(adherence);
    } catch (error) {
      console.error("Error fetching medication adherence:", error);
      res.status(500).json({ message: "Failed to fetch medication adherence" });
    }
  });

  // Get medication logs
  app.get("/api/medications/:id/logs", isAuthenticated, async (req, res) => {
    try {
      const medication = await storage.getMedication(req.params.id);
      if (!medication) {
        return res.status(404).json({ message: "Medication not found" });
      }
      
      const logs = await storage.getMedicationLogs(req.params.id);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching medication logs:", error);
      res.status(500).json({ message: "Failed to fetch medication logs" });
    }
  });

  // Vital Signs routes
  app.get("/api/clients/:id/vitals", isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const vitals = await storage.getVitalSignsByClient(req.params.id, limit);
      res.json(vitals);
    } catch (error) {
      console.error("Error fetching vitals:", error);
      res.status(500).json({ message: "Failed to fetch vital signs" });
    }
  });

  app.post("/api/clients/:id/vitals", isAuthenticated, async (req: any, res) => {
    try {
      const processedBody = {
        ...req.body,
        clientId: req.params.id,
        recordedAt: coerceDate(req.body.recordedAt) || new Date(),
      };
      const validatedData = insertVitalSignSchema.parse(processedBody);
      const vitalSign = await storage.createVitalSign(validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "vital_sign",
        entityId: vitalSign.id,
        newValues: vitalSign,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(201).json(vitalSign);
    } catch (error) {
      console.error("Error creating vital sign:", error);
      res.status(400).json({ message: "Failed to create vital sign" });
    }
  });

  app.get("/api/clients/:id/vitals/history", isAuthenticated, async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      
      const vitals = await storage.getVitalSignsHistory(req.params.id, startDate, endDate);
      res.json(vitals);
    } catch (error) {
      console.error("Error fetching vitals history:", error);
      res.status(500).json({ message: "Failed to fetch vital signs history" });
    }
  });

  app.get("/api/clients/:id/vitals/trends", isAuthenticated, async (req, res) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();
      
      const trends = await storage.getVitalSignTrends(req.params.id, startDate, endDate);
      res.json(trends);
    } catch (error) {
      console.error("Error fetching vitals trends:", error);
      res.status(500).json({ message: "Failed to fetch vital signs trends" });
    }
  });

  // Notification Preferences routes
  app.get("/api/users/:id/notification-preferences", isAuthenticated, async (req, res) => {
    try {
      const prefs = await storage.getNotificationPreferences(req.params.id);
      if (!prefs) {
        return res.json({
          userId: req.params.id,
          enableSms: true,
          enableEmail: true,
          scheduleChangeNotifications: true,
          reminderNotifications: true,
          urgentAlertNotifications: true,
        });
      }
      res.json(prefs);
    } catch (error) {
      console.error("Error fetching notification preferences:", error);
      res.status(500).json({ message: "Failed to fetch notification preferences" });
    }
  });

  app.patch("/api/users/:id/notification-preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.params.id;
      const sessionUserId = req.session?.user?.id;
      
      if (sessionUserId !== userId && !['super_admin', 'admin'].includes(req.session?.user?.role)) {
        return res.status(403).json({ message: "Cannot update another user's notification preferences" });
      }

      const existingPrefs = await storage.getNotificationPreferences(userId);
      
      if (existingPrefs) {
        const updated = await storage.updateNotificationPreferences(userId, req.body);
        res.json(updated);
      } else {
        const validatedData = insertNotificationPreferenceSchema.parse({ ...req.body, userId });
        const created = await storage.createNotificationPreferences(validatedData);
        res.json(created);
      }
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res.status(400).json({ message: "Failed to update notification preferences" });
    }
  });

  // Notification History routes
  app.get("/api/notifications/history", isAuthenticated, async (req, res) => {
    try {
      const { recipientId, recipientType, limit } = req.query;
      const history = await storage.getNotificationHistory(
        recipientId as string | undefined,
        recipientType as string | undefined,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(history);
    } catch (error) {
      console.error("Error fetching notification history:", error);
      res.status(500).json({ message: "Failed to fetch notification history" });
    }
  });

  // Notification Template routes
  app.get("/api/notifications/templates", isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getAllNotificationTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching notification templates:", error);
      res.status(500).json({ message: "Failed to fetch notification templates" });
    }
  });

  app.post("/api/notifications/templates", isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.session?.user?.role;
      if (!['super_admin', 'admin'].includes(userRole)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const validatedData = insertNotificationTemplateSchema.parse(req.body);
      const template = await storage.createNotificationTemplate(validatedData);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating notification template:", error);
      res.status(400).json({ message: "Failed to create notification template" });
    }
  });

  app.put("/api/notifications/templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.session?.user?.role;
      if (!['super_admin', 'admin'].includes(userRole)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const template = await storage.updateNotificationTemplate(req.params.id, req.body);
      res.json(template);
    } catch (error) {
      console.error("Error updating notification template:", error);
      res.status(400).json({ message: "Failed to update notification template" });
    }
  });

  app.delete("/api/notifications/templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.session?.user?.role;
      if (!['super_admin', 'admin'].includes(userRole)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      await storage.deleteNotificationTemplate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting notification template:", error);
      res.status(400).json({ message: "Failed to delete notification template" });
    }
  });

  // Test Notification route
  app.post("/api/notifications/test", isAuthenticated, async (req: any, res) => {
    try {
      const { recipientType, recipientId, channel } = req.body;
      
      if (!recipientType || !recipientId || !channel) {
        return res.status(400).json({ message: "Missing required fields: recipientType, recipientId, channel" });
      }

      const result = await sendTestNotification(recipientType, recipientId, channel);
      res.json(result);
    } catch (error) {
      console.error("Error sending test notification:", error);
      res.status(500).json({ message: "Failed to send test notification" });
    }
  });

  // Queue Notification route
  app.post("/api/notifications/queue", isAuthenticated, async (req: any, res) => {
    try {
      const { recipientType, recipientId, body, subject, channel, templateName, scheduledFor, variables } = req.body;
      
      if (!recipientType || !recipientId || !body) {
        return res.status(400).json({ message: "Missing required fields: recipientType, recipientId, body" });
      }

      const notifications = await queueNotification({
        recipientType,
        recipientId,
        body,
        subject,
        channel,
        templateName,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
        variables,
      });
      
      res.status(201).json(notifications);
    } catch (error) {
      console.error("Error queuing notification:", error);
      res.status(500).json({ message: "Failed to queue notification" });
    }
  });

  // Process Notification Queue route
  app.post("/api/notifications/process-queue", isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.session?.user?.role;
      if (!['super_admin', 'admin'].includes(userRole)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const result = await processNotificationQueue();
      res.json(result);
    } catch (error) {
      console.error("Error processing notification queue:", error);
      res.status(500).json({ message: "Failed to process notification queue" });
    }
  });

  // Send urgent alert
  app.post("/api/notifications/urgent-alert", isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.session?.user?.role;
      if (!['super_admin', 'admin', 'office_admin', 'supervisor'].includes(userRole)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { recipientType, recipientId, message, subject } = req.body;
      
      if (!recipientType || !recipientId || !message) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const results = await sendUrgentAlert(recipientType, recipientId, message, subject);
      res.json({ success: true, results });
    } catch (error) {
      console.error("Error sending urgent alert:", error);
      res.status(500).json({ message: "Failed to send urgent alert" });
    }
  });

  // Birthday notification routes
  app.get("/api/birthday-notifications", isAuthenticated, async (req, res) => {
    try {
      const { officeId, limit } = req.query;
      const notifications = await getBirthdayNotificationHistory(
        officeId as string | undefined,
        limit ? parseInt(limit as string) : undefined
      );
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching birthday notifications:", error);
      res.status(500).json({ message: "Failed to fetch birthday notifications" });
    }
  });

  app.get("/api/birthday-notifications/upcoming", isAuthenticated, async (req, res) => {
    try {
      const { days, officeId } = req.query;
      const daysAhead = days ? parseInt(days as string) : 7;
      const upcoming = await getUpcomingBirthdays(daysAhead, officeId as string | undefined);
      res.json(upcoming);
    } catch (error) {
      console.error("Error fetching upcoming birthdays:", error);
      res.status(500).json({ message: "Failed to fetch upcoming birthdays" });
    }
  });

  app.get("/api/birthday-notifications/today", isAuthenticated, async (req, res) => {
    try {
      const { officeId } = req.query;
      const today = await storage.getTodaysBirthdays(officeId as string | undefined);
      res.json(today);
    } catch (error) {
      console.error("Error fetching today's birthdays:", error);
      res.status(500).json({ message: "Failed to fetch today's birthdays" });
    }
  });

  app.post("/api/birthday-notifications/send", isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.user?.role;
      if (!['super_admin', 'admin', 'office_admin'].includes(userRole)) {
        return res.status(403).json({ message: "Insufficient permissions to send birthday notifications" });
      }

      const { officeId } = req.body;
      const results = await sendTodaysBirthdayNotifications(officeId);
      res.json({
        success: true,
        message: `Sent ${results.length} birthday notifications`,
        results,
      });
    } catch (error) {
      console.error("Error sending birthday notifications:", error);
      res.status(500).json({ message: "Failed to send birthday notifications" });
    }
  });

  // Shift Matching routes
  app.get("/api/shift-matching/suggest", isAuthenticated, async (req, res) => {
    try {
      const { clientId, date, startTime, endTime, skills } = req.query;
      
      if (!clientId || !date || !startTime || !endTime) {
        return res.status(400).json({ 
          message: "Missing required parameters: clientId, date, startTime, endTime" 
        });
      }

      const parsedDate = new Date(date as string);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      let requiredSkills: string[] | undefined;
      if (skills) {
        requiredSkills = Array.isArray(skills) 
          ? skills.map(s => String(s))
          : [String(skills)];
      }

      const suggestions = await shiftMatchingService.suggestCaregiversForShift(
        clientId as string,
        parsedDate,
        startTime as string,
        endTime as string,
        requiredSkills
      );

      res.json(suggestions);
    } catch (error) {
      console.error("Error suggesting caregivers for shift:", error);
      if (error instanceof Error && error.message === "Client not found") {
        return res.status(404).json({ message: "Client not found" });
      }
      res.status(500).json({ message: "Failed to get shift suggestions" });
    }
  });

  app.post("/api/shift-matching/calculate-score", isAuthenticated, async (req, res) => {
    try {
      const { caregiverId, clientId, date, startTime, endTime, requiredSkills } = req.body;
      
      if (!caregiverId || !clientId || !date || !startTime || !endTime) {
        return res.status(400).json({ 
          message: "Missing required fields: caregiverId, clientId, date, startTime, endTime" 
        });
      }

      const caregiver = await storage.getCaregiver(caregiverId);
      if (!caregiver) {
        return res.status(404).json({ message: "Caregiver not found" });
      }

      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      const parsedDate = new Date(date);
      const score = await shiftMatchingService.calculateMatchScore(
        caregiver,
        client,
        parsedDate,
        startTime,
        endTime,
        requiredSkills
      );

      res.json(score);
    } catch (error) {
      console.error("Error calculating match score:", error);
      res.status(500).json({ message: "Failed to calculate match score" });
    }
  });

  app.get("/api/shift-matching/check-conflict", isAuthenticated, async (req, res) => {
    try {
      const { caregiverId, date, startTime, endTime } = req.query;
      
      if (!caregiverId || !date || !startTime || !endTime) {
        return res.status(400).json({ 
          message: "Missing required parameters: caregiverId, date, startTime, endTime" 
        });
      }

      const parsedDate = new Date(date as string);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }

      const hasConflict = await shiftMatchingService.checkScheduleConflict(
        caregiverId as string,
        parsedDate,
        startTime as string,
        endTime as string
      );

      res.json({ hasConflict });
    } catch (error) {
      console.error("Error checking schedule conflict:", error);
      res.status(500).json({ message: "Failed to check schedule conflict" });
    }
  });

  // Mileage Tracking Routes
  app.get("/api/caregivers/:id/mileage", isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const logs = await storage.getMileageLogsByCaregiver(
        req.params.id,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(logs);
    } catch (error) {
      console.error("Error fetching mileage logs:", error);
      res.status(500).json({ message: "Failed to fetch mileage logs" });
    }
  });

  app.post("/api/caregivers/:id/mileage", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertMileageLogSchema.parse({
        ...req.body,
        caregiverId: req.params.id,
        date: coerceDate(req.body.date),
      });
      const log = await storage.createMileageLog(validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "mileage_log",
        entityId: log.id,
        newValues: log,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(201).json(log);
    } catch (error) {
      console.error("Error creating mileage log:", error);
      res.status(400).json({ message: "Failed to create mileage log" });
    }
  });

  app.patch("/api/mileage/:id", isAuthenticated, async (req: any, res) => {
    try {
      const oldLog = await storage.getMileageLog(req.params.id);
      if (!oldLog) {
        return res.status(404).json({ message: "Mileage log not found" });
      }

      const validatedData = insertMileageLogSchema.partial().parse({
        ...req.body,
        date: req.body.date ? coerceDate(req.body.date) : undefined,
      });
      const log = await storage.updateMileageLog(req.params.id, validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "update",
        entityType: "mileage_log",
        entityId: log.id,
        oldValues: oldLog,
        newValues: log,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(log);
    } catch (error) {
      console.error("Error updating mileage log:", error);
      res.status(400).json({ message: "Failed to update mileage log" });
    }
  });

  app.post("/api/mileage/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.session?.user?.role;
      if (!['super_admin', 'admin', 'office_admin', 'supervisor'].includes(userRole)) {
        return res.status(403).json({ message: "Insufficient permissions to approve mileage logs" });
      }

      const oldLog = await storage.getMileageLog(req.params.id);
      if (!oldLog) {
        return res.status(404).json({ message: "Mileage log not found" });
      }

      const log = await storage.approveMileageLog(req.params.id, req.session.user.id);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "approve",
        entityType: "mileage_log",
        entityId: log.id,
        oldValues: oldLog,
        newValues: log,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(log);
    } catch (error) {
      console.error("Error approving mileage log:", error);
      res.status(500).json({ message: "Failed to approve mileage log" });
    }
  });

  app.get("/api/mileage/pending", isAuthenticated, async (req: any, res) => {
    try {
      const userRole = req.session?.user?.role;
      if (!['super_admin', 'admin', 'office_admin', 'supervisor'].includes(userRole)) {
        return res.status(403).json({ message: "Insufficient permissions to view pending mileage logs" });
      }

      const logs = await storage.getMileageLogsByStatus('pending');
      res.json(logs);
    } catch (error) {
      console.error("Error fetching pending mileage logs:", error);
      res.status(500).json({ message: "Failed to fetch pending mileage logs" });
    }
  });

  app.get("/api/mileage/totals", isAuthenticated, async (req, res) => {
    try {
      const { caregiverId, startDate, endDate } = req.query;
      
      if (!caregiverId) {
        return res.status(400).json({ message: "caregiverId is required" });
      }

      const totals = await storage.getMileageReimbursementTotals(
        caregiverId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(totals);
    } catch (error) {
      console.error("Error fetching mileage totals:", error);
      res.status(500).json({ message: "Failed to fetch mileage totals" });
    }
  });

  // Applicant Routes (Recruitment Portal)
  app.get("/api/applicants", isAuthenticated, async (req, res) => {
    try {
      const { officeId } = req.query;
      const officeFilter = officeId && officeId !== 'all' ? String(officeId) : undefined;
      const applicants = await storage.getAllApplicants(officeFilter);
      res.json(applicants);
    } catch (error) {
      console.error("Error fetching applicants:", error);
      res.status(500).json({ message: "Failed to fetch applicants" });
    }
  });

  app.get("/api/applicants/pipeline", isAuthenticated, async (req, res) => {
    try {
      const { officeId } = req.query;
      const officeFilter = officeId && officeId !== 'all' ? String(officeId) : undefined;
      const pipeline = await storage.getApplicantPipelineCounts(officeFilter);
      res.json(pipeline);
    } catch (error) {
      console.error("Error fetching applicant pipeline:", error);
      res.status(500).json({ message: "Failed to fetch applicant pipeline" });
    }
  });

  app.get("/api/applicants/by-status/:status", isAuthenticated, async (req, res) => {
    try {
      const { officeId } = req.query;
      const officeFilter = officeId && officeId !== 'all' ? String(officeId) : undefined;
      const applicants = await storage.getApplicantsByStatus(req.params.status, officeFilter);
      res.json(applicants);
    } catch (error) {
      console.error("Error fetching applicants by status:", error);
      res.status(500).json({ message: "Failed to fetch applicants by status" });
    }
  });

  app.get("/api/applicants/:id", isAuthenticated, async (req, res) => {
    try {
      const applicant = await storage.getApplicant(req.params.id);
      if (!applicant) {
        return res.status(404).json({ message: "Applicant not found" });
      }
      res.json(applicant);
    } catch (error) {
      console.error("Error fetching applicant:", error);
      res.status(500).json({ message: "Failed to fetch applicant" });
    }
  });

  app.post("/api/applicants", isAuthenticated, async (req: any, res) => {
    try {
      const processedBody = {
        ...req.body,
        dateOfBirth: coerceDate(req.body.dateOfBirth),
        applicationDate: coerceDate(req.body.applicationDate),
        lastContactDate: coerceDate(req.body.lastContactDate),
        expectedStartDate: coerceDate(req.body.expectedStartDate),
      };
      const validatedData = insertApplicantSchema.parse(processedBody);
      const applicant = await storage.createApplicant(validatedData);

      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "applicant",
        entityId: applicant.id,
        newValues: applicant,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.status(201).json(applicant);
    } catch (error) {
      console.error("Error creating applicant:", error);
      res.status(400).json({ message: "Failed to create applicant" });
    }
  });

  app.patch("/api/applicants/:id", isAuthenticated, async (req: any, res) => {
    try {
      const oldApplicant = await storage.getApplicant(req.params.id);
      if (!oldApplicant) {
        return res.status(404).json({ message: "Applicant not found" });
      }

      const processedBody = {
        ...req.body,
        dateOfBirth: coerceDate(req.body.dateOfBirth),
        applicationDate: coerceDate(req.body.applicationDate),
        lastContactDate: coerceDate(req.body.lastContactDate),
        expectedStartDate: coerceDate(req.body.expectedStartDate),
      };
      const validatedData = insertApplicantSchema.partial().parse(processedBody);
      const applicant = await storage.updateApplicant(req.params.id, validatedData);

      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "update",
        entityType: "applicant",
        entityId: applicant.id,
        oldValues: oldApplicant,
        newValues: applicant,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json(applicant);
    } catch (error) {
      console.error("Error updating applicant:", error);
      res.status(400).json({ message: "Failed to update applicant" });
    }
  });

  app.post("/api/applicants/:id/stage", isAuthenticated, async (req: any, res) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      const oldApplicant = await storage.getApplicant(req.params.id);
      if (!oldApplicant) {
        return res.status(404).json({ message: "Applicant not found" });
      }

      const applicant = await storage.moveApplicantToStage(req.params.id, status);

      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "stage_change",
        entityType: "applicant",
        entityId: applicant.id,
        oldValues: { status: oldApplicant.status },
        newValues: { status: applicant.status },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json(applicant);
    } catch (error) {
      console.error("Error moving applicant to stage:", error);
      res.status(400).json({ message: "Failed to move applicant to stage" });
    }
  });

  app.post("/api/applicants/:id/convert-to-caregiver", isAuthenticated, async (req: any, res) => {
    try {
      const applicant = await storage.getApplicant(req.params.id);
      if (!applicant) {
        return res.status(404).json({ message: "Applicant not found" });
      }

      const caregiver = await storage.convertApplicantToCaregiver(req.params.id);

      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "convert_to_caregiver",
        entityType: "applicant",
        entityId: req.params.id,
        oldValues: applicant,
        newValues: { caregiverId: caregiver.id },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.status(201).json(caregiver);
    } catch (error) {
      console.error("Error converting applicant to caregiver:", error);
      res.status(400).json({ message: "Failed to convert applicant to caregiver" });
    }
  });

  // Applicant Notes Routes
  app.get("/api/applicants/:id/notes", isAuthenticated, async (req, res) => {
    try {
      const notes = await storage.getApplicantNotes(req.params.id);
      res.json(notes);
    } catch (error) {
      console.error("Error fetching applicant notes:", error);
      res.status(500).json({ message: "Failed to fetch applicant notes" });
    }
  });

  app.post("/api/applicants/:id/notes", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertApplicantNoteSchema.parse({
        ...req.body,
        applicantId: req.params.id,
        authorId: req.session?.user?.id,
      });
      const note = await storage.createApplicantNote(validatedData);

      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "applicant_note",
        entityId: note.id,
        newValues: note,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.status(201).json(note);
    } catch (error) {
      console.error("Error creating applicant note:", error);
      res.status(400).json({ message: "Failed to create applicant note" });
    }
  });

  // Applicant Interviews Routes
  app.get("/api/applicants/:id/interviews", isAuthenticated, async (req, res) => {
    try {
      const interviews = await storage.getApplicantInterviews(req.params.id);
      res.json(interviews);
    } catch (error) {
      console.error("Error fetching applicant interviews:", error);
      res.status(500).json({ message: "Failed to fetch applicant interviews" });
    }
  });

  app.post("/api/applicants/:id/interviews", isAuthenticated, async (req: any, res) => {
    try {
      const processedBody = {
        ...req.body,
        applicantId: req.params.id,
        scheduledDate: coerceDate(req.body.scheduledDate),
        completedDate: coerceDate(req.body.completedDate),
      };
      const validatedData = insertApplicantInterviewSchema.parse(processedBody);
      const interview = await storage.createApplicantInterview(validatedData);

      await storage.updateApplicant(req.params.id, { status: 'interview_scheduled' });

      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "applicant_interview",
        entityId: interview.id,
        newValues: interview,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.status(201).json(interview);
    } catch (error) {
      console.error("Error creating applicant interview:", error);
      res.status(400).json({ message: "Failed to create applicant interview" });
    }
  });

  app.patch("/api/applicants/:id/interviews/:interviewId", isAuthenticated, async (req: any, res) => {
    try {
      const oldInterview = await storage.getApplicantInterview(req.params.interviewId);
      if (!oldInterview) {
        return res.status(404).json({ message: "Interview not found" });
      }

      const processedBody = {
        ...req.body,
        scheduledDate: coerceDate(req.body.scheduledDate),
        completedDate: coerceDate(req.body.completedDate),
      };
      const validatedData = insertApplicantInterviewSchema.partial().parse(processedBody);
      const interview = await storage.updateApplicantInterview(req.params.interviewId, validatedData);

      if (validatedData.status === 'completed') {
        await storage.updateApplicant(req.params.id, { status: 'interview_completed' });
      }

      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "update",
        entityType: "applicant_interview",
        entityId: interview.id,
        oldValues: oldInterview,
        newValues: interview,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json(interview);
    } catch (error) {
      console.error("Error updating applicant interview:", error);
      res.status(400).json({ message: "Failed to update applicant interview" });
    }
  });

  // Background Check Routes
  app.get("/api/applicants/:id/background-checks", isAuthenticated, async (req, res) => {
    try {
      const checks = await storage.getBackgroundChecksByApplicant(req.params.id);
      res.json(checks);
    } catch (error) {
      console.error("Error fetching applicant background checks:", error);
      res.status(500).json({ message: "Failed to fetch background checks" });
    }
  });

  app.post("/api/applicants/:id/background-checks", isAuthenticated, async (req: any, res) => {
    try {
      const processedBody = {
        ...req.body,
        applicantId: req.params.id,
        requestedDate: coerceDate(req.body.requestedDate) || new Date(),
        submittedDate: coerceDate(req.body.submittedDate),
        expectedCompletionDate: coerceDate(req.body.expectedCompletionDate),
        completedDate: coerceDate(req.body.completedDate),
        expirationDate: coerceDate(req.body.expirationDate),
        requestedBy: req.session?.user?.id,
      };
      const validatedData = insertBackgroundCheckSchema.parse(processedBody);
      const check = await storage.createBackgroundCheck(validatedData);

      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "background_check",
        entityId: check.id,
        newValues: check,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.status(201).json(check);
    } catch (error) {
      console.error("Error creating applicant background check:", error);
      res.status(400).json({ message: "Failed to create background check" });
    }
  });

  app.get("/api/caregivers/:id/background-checks", isAuthenticated, async (req, res) => {
    try {
      const checks = await storage.getBackgroundChecksByCaregiver(req.params.id);
      res.json(checks);
    } catch (error) {
      console.error("Error fetching caregiver background checks:", error);
      res.status(500).json({ message: "Failed to fetch background checks" });
    }
  });

  app.post("/api/caregivers/:id/background-checks", isAuthenticated, async (req: any, res) => {
    try {
      const processedBody = {
        ...req.body,
        caregiverId: req.params.id,
        requestedDate: coerceDate(req.body.requestedDate) || new Date(),
        submittedDate: coerceDate(req.body.submittedDate),
        expectedCompletionDate: coerceDate(req.body.expectedCompletionDate),
        completedDate: coerceDate(req.body.completedDate),
        expirationDate: coerceDate(req.body.expirationDate),
        requestedBy: req.session?.user?.id,
      };
      const validatedData = insertBackgroundCheckSchema.parse(processedBody);
      const check = await storage.createBackgroundCheck(validatedData);

      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "background_check",
        entityId: check.id,
        newValues: check,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.status(201).json(check);
    } catch (error) {
      console.error("Error creating caregiver background check:", error);
      res.status(400).json({ message: "Failed to create background check" });
    }
  });

  app.patch("/api/background-checks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const oldCheck = await storage.getBackgroundCheck(req.params.id);
      if (!oldCheck) {
        return res.status(404).json({ message: "Background check not found" });
      }

      const processedBody = {
        ...req.body,
        submittedDate: coerceDate(req.body.submittedDate),
        expectedCompletionDate: coerceDate(req.body.expectedCompletionDate),
        completedDate: coerceDate(req.body.completedDate),
        expirationDate: coerceDate(req.body.expirationDate),
      };
      const validatedData = insertBackgroundCheckSchema.partial().parse(processedBody);
      const check = await storage.updateBackgroundCheck(req.params.id, validatedData);

      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "update",
        entityType: "background_check",
        entityId: check.id,
        oldValues: oldCheck,
        newValues: check,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json(check);
    } catch (error) {
      console.error("Error updating background check:", error);
      res.status(400).json({ message: "Failed to update background check" });
    }
  });

  app.get("/api/background-checks/pending", isAuthenticated, async (req, res) => {
    try {
      const checks = await storage.getPendingBackgroundChecks();
      res.json(checks);
    } catch (error) {
      console.error("Error fetching pending background checks:", error);
      res.status(500).json({ message: "Failed to fetch pending background checks" });
    }
  });

  app.get("/api/background-checks/expiring", isAuthenticated, async (req, res) => {
    try {
      const daysAhead = parseInt(req.query.days as string) || 30;
      const checks = await storage.getExpiringBackgroundChecks(daysAhead);
      res.json(checks);
    } catch (error) {
      console.error("Error fetching expiring background checks:", error);
      res.status(500).json({ message: "Failed to fetch expiring background checks" });
    }
  });

  app.get("/api/background-checks/by-status/:status", isAuthenticated, async (req, res) => {
    try {
      const checks = await storage.getBackgroundChecksByStatus(req.params.status);
      res.json(checks);
    } catch (error) {
      console.error("Error fetching background checks by status:", error);
      res.status(500).json({ message: "Failed to fetch background checks" });
    }
  });

  app.post("/api/background-checks/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const { applicantId, caregiverId, checkTypes } = req.body;

      if (!checkTypes || !Array.isArray(checkTypes) || checkTypes.length === 0) {
        return res.status(400).json({ message: "checkTypes must be a non-empty array" });
      }

      if (!applicantId && !caregiverId) {
        return res.status(400).json({ message: "Either applicantId or caregiverId is required" });
      }

      const checks = await storage.bulkCreateBackgroundChecks(
        applicantId || null,
        caregiverId || null,
        checkTypes,
        req.session?.user?.id
      );

      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "bulk_create",
        entityType: "background_check",
        entityId: checks.map(c => c.id).join(","),
        newValues: { checkTypes, applicantId, caregiverId },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.status(201).json(checks);
    } catch (error) {
      console.error("Error bulk creating background checks:", error);
      res.status(400).json({ message: "Failed to bulk create background checks" });
    }
  });

  // ==================== SHIFT DIFFERENTIALS ROUTES ====================

  // Shift Differentials routes
  app.get("/api/shift-differentials", isAuthenticated, async (req, res) => {
    try {
      const { officeId, mcoId } = req.query;
      const officeFilter = officeId && officeId !== 'all' ? String(officeId) : undefined;
      const mcoFilter = mcoId && mcoId !== 'all' ? String(mcoId) : undefined;
      const differentials = await storage.getShiftDifferentials(officeFilter, mcoFilter);
      res.json(differentials);
    } catch (error) {
      console.error("Error fetching shift differentials:", error);
      res.status(500).json({ message: "Failed to fetch shift differentials" });
    }
  });

  app.get("/api/shift-differentials/calculate", isAuthenticated, async (req, res) => {
    try {
      const { caregiverId, date, startTime, endTime, baseRate } = req.query;
      
      if (!caregiverId || !date || !startTime || !endTime || !baseRate) {
        return res.status(400).json({ message: "caregiverId, date, startTime, endTime, and baseRate are required" });
      }
      
      const result = await storage.calculateShiftDifferential(
        String(caregiverId),
        new Date(String(date)),
        String(startTime),
        String(endTime),
        parseFloat(String(baseRate))
      );
      
      res.json(result);
    } catch (error) {
      console.error("Error calculating shift differential:", error);
      res.status(500).json({ message: "Failed to calculate shift differential" });
    }
  });

  app.get("/api/shift-differentials/:id", isAuthenticated, async (req, res) => {
    try {
      const differential = await storage.getShiftDifferential(req.params.id);
      if (!differential) {
        return res.status(404).json({ message: "Shift differential not found" });
      }
      res.json(differential);
    } catch (error) {
      console.error("Error fetching shift differential:", error);
      res.status(500).json({ message: "Failed to fetch shift differential" });
    }
  });

  app.post("/api/shift-differentials", isAuthenticated, async (req: any, res) => {
    try {
      const processedBody = {
        ...req.body,
        effectiveDate: coerceDate(req.body.effectiveDate),
        endDate: coerceDate(req.body.endDate),
      };
      const validatedData = insertShiftDifferentialSchema.parse(processedBody);
      const differential = await storage.createShiftDifferential(validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "shift_differential",
        entityId: differential.id,
        newValues: differential,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(201).json(differential);
    } catch (error) {
      console.error("Error creating shift differential:", error);
      res.status(400).json({ message: "Failed to create shift differential" });
    }
  });

  app.patch("/api/shift-differentials/:id", isAuthenticated, async (req: any, res) => {
    try {
      const oldDifferential = await storage.getShiftDifferential(req.params.id);
      if (!oldDifferential) {
        return res.status(404).json({ message: "Shift differential not found" });
      }
      
      const processedBody = {
        ...req.body,
        effectiveDate: coerceDate(req.body.effectiveDate),
        endDate: coerceDate(req.body.endDate),
      };
      const validatedData = insertShiftDifferentialSchema.partial().parse(processedBody);
      const differential = await storage.updateShiftDifferential(req.params.id, validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "update",
        entityType: "shift_differential",
        entityId: differential.id,
        oldValues: oldDifferential,
        newValues: differential,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(differential);
    } catch (error) {
      console.error("Error updating shift differential:", error);
      res.status(400).json({ message: "Failed to update shift differential" });
    }
  });

  app.delete("/api/shift-differentials/:id", isAuthenticated, async (req: any, res) => {
    try {
      const differential = await storage.getShiftDifferential(req.params.id);
      if (!differential) {
        return res.status(404).json({ message: "Shift differential not found" });
      }
      
      await storage.deleteShiftDifferential(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "delete",
        entityType: "shift_differential",
        entityId: req.params.id,
        oldValues: differential,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting shift differential:", error);
      res.status(500).json({ message: "Failed to delete shift differential" });
    }
  });

  // ==================== HOLIDAYS ROUTES ====================

  app.get("/api/holidays", isAuthenticated, async (req, res) => {
    try {
      const { officeId } = req.query;
      const officeFilter = officeId && officeId !== 'all' ? String(officeId) : undefined;
      const holidays = await storage.getHolidays(officeFilter);
      res.json(holidays);
    } catch (error) {
      console.error("Error fetching holidays:", error);
      res.status(500).json({ message: "Failed to fetch holidays" });
    }
  });

  app.get("/api/holidays/check", isAuthenticated, async (req, res) => {
    try {
      const { date, officeId } = req.query;
      
      if (!date) {
        return res.status(400).json({ message: "date is required" });
      }
      
      const isHoliday = await storage.isHolidayDate(
        new Date(String(date)),
        officeId && officeId !== 'all' ? String(officeId) : undefined
      );
      
      res.json({ isHoliday });
    } catch (error) {
      console.error("Error checking holiday date:", error);
      res.status(500).json({ message: "Failed to check holiday date" });
    }
  });

  app.get("/api/holidays/:id", isAuthenticated, async (req, res) => {
    try {
      const holiday = await storage.getHoliday(req.params.id);
      if (!holiday) {
        return res.status(404).json({ message: "Holiday not found" });
      }
      res.json(holiday);
    } catch (error) {
      console.error("Error fetching holiday:", error);
      res.status(500).json({ message: "Failed to fetch holiday" });
    }
  });

  app.post("/api/holidays", isAuthenticated, async (req: any, res) => {
    try {
      const processedBody = {
        ...req.body,
        date: coerceDate(req.body.date),
        observedDate: coerceDate(req.body.observedDate),
      };
      const validatedData = insertHolidaySchema.parse(processedBody);
      const holiday = await storage.createHoliday(validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "holiday",
        entityId: holiday.id,
        newValues: holiday,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(201).json(holiday);
    } catch (error) {
      console.error("Error creating holiday:", error);
      res.status(400).json({ message: "Failed to create holiday" });
    }
  });

  app.patch("/api/holidays/:id", isAuthenticated, async (req: any, res) => {
    try {
      const oldHoliday = await storage.getHoliday(req.params.id);
      if (!oldHoliday) {
        return res.status(404).json({ message: "Holiday not found" });
      }
      
      const processedBody = {
        ...req.body,
        date: coerceDate(req.body.date),
        observedDate: coerceDate(req.body.observedDate),
      };
      const validatedData = insertHolidaySchema.partial().parse(processedBody);
      const holiday = await storage.updateHoliday(req.params.id, validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "update",
        entityType: "holiday",
        entityId: holiday.id,
        oldValues: oldHoliday,
        newValues: holiday,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(holiday);
    } catch (error) {
      console.error("Error updating holiday:", error);
      res.status(400).json({ message: "Failed to update holiday" });
    }
  });

  app.delete("/api/holidays/:id", isAuthenticated, async (req: any, res) => {
    try {
      const holiday = await storage.getHoliday(req.params.id);
      if (!holiday) {
        return res.status(404).json({ message: "Holiday not found" });
      }
      
      await storage.deleteHoliday(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "delete",
        entityType: "holiday",
        entityId: req.params.id,
        oldValues: holiday,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting holiday:", error);
      res.status(500).json({ message: "Failed to delete holiday" });
    }
  });

  // ==================== PERFORMANCE REVIEWS ROUTES ====================

  app.get("/api/performance-reviews", isAuthenticated, async (req, res) => {
    try {
      const reviews = await storage.getAllPerformanceReviews();
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching performance reviews:", error);
      res.status(500).json({ message: "Failed to fetch performance reviews" });
    }
  });

  app.get("/api/performance-reviews/upcoming", isAuthenticated, async (req, res) => {
    try {
      const daysAhead = parseInt(req.query.daysAhead as string) || 30;
      const reviews = await storage.getUpcomingReviews(daysAhead);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching upcoming reviews:", error);
      res.status(500).json({ message: "Failed to fetch upcoming reviews" });
    }
  });

  app.get("/api/performance-reviews/:id", isAuthenticated, async (req, res) => {
    try {
      const review = await storage.getPerformanceReview(req.params.id);
      if (!review) {
        return res.status(404).json({ message: "Performance review not found" });
      }
      res.json(review);
    } catch (error) {
      console.error("Error fetching performance review:", error);
      res.status(500).json({ message: "Failed to fetch performance review" });
    }
  });

  app.post("/api/performance-reviews", isAuthenticated, async (req: any, res) => {
    try {
      const processedBody = {
        ...req.body,
        reviewPeriodStart: coerceDate(req.body.reviewPeriodStart),
        reviewPeriodEnd: coerceDate(req.body.reviewPeriodEnd),
        scheduledDate: coerceDate(req.body.scheduledDate),
        completedDate: coerceDate(req.body.completedDate),
      };
      const validatedData = insertPerformanceReviewSchema.parse(processedBody);
      const review = await storage.createPerformanceReview(validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "performance_review",
        entityId: review.id,
        newValues: review,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(201).json(review);
    } catch (error) {
      console.error("Error creating performance review:", error);
      res.status(400).json({ message: "Failed to create performance review" });
    }
  });

  app.patch("/api/performance-reviews/:id", isAuthenticated, async (req: any, res) => {
    try {
      const oldReview = await storage.getPerformanceReview(req.params.id);
      if (!oldReview) {
        return res.status(404).json({ message: "Performance review not found" });
      }
      
      const processedBody = {
        ...req.body,
        reviewPeriodStart: coerceDate(req.body.reviewPeriodStart),
        reviewPeriodEnd: coerceDate(req.body.reviewPeriodEnd),
        scheduledDate: coerceDate(req.body.scheduledDate),
        completedDate: coerceDate(req.body.completedDate),
      };
      const validatedData = insertPerformanceReviewSchema.partial().parse(processedBody);
      const review = await storage.updatePerformanceReview(req.params.id, validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "update",
        entityType: "performance_review",
        entityId: review.id,
        oldValues: oldReview,
        newValues: review,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(review);
    } catch (error) {
      console.error("Error updating performance review:", error);
      res.status(400).json({ message: "Failed to update performance review" });
    }
  });

  app.get("/api/performance-reviews/:id/metrics", isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.getPerformanceMetrics(req.params.id);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching performance metrics:", error);
      res.status(500).json({ message: "Failed to fetch performance metrics" });
    }
  });

  app.post("/api/performance-reviews/:id/metrics", isAuthenticated, async (req: any, res) => {
    try {
      const review = await storage.getPerformanceReview(req.params.id);
      if (!review) {
        return res.status(404).json({ message: "Performance review not found" });
      }
      
      const validatedData = insertPerformanceMetricSchema.parse({
        ...req.body,
        reviewId: req.params.id,
      });
      const metric = await storage.createPerformanceMetric(validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "performance_metric",
        entityId: metric.id,
        newValues: metric,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(201).json(metric);
    } catch (error) {
      console.error("Error creating performance metric:", error);
      res.status(400).json({ message: "Failed to create performance metric" });
    }
  });

  app.get("/api/performance-reviews/:id/calculate-rating", isAuthenticated, async (req, res) => {
    try {
      const overallRating = await storage.calculateOverallRating(req.params.id);
      res.json({ overallRating });
    } catch (error) {
      console.error("Error calculating overall rating:", error);
      res.status(500).json({ message: "Failed to calculate overall rating" });
    }
  });

  app.post("/api/performance-reviews/:id/acknowledge", isAuthenticated, async (req: any, res) => {
    try {
      const review = await storage.getPerformanceReview(req.params.id);
      if (!review) {
        return res.status(404).json({ message: "Performance review not found" });
      }
      
      const caregiverId = req.body.caregiverId || req.session?.user?.id;
      const updatedReview = await storage.acknowledgeReview(req.params.id, caregiverId);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "acknowledge",
        entityType: "performance_review",
        entityId: updatedReview.id,
        oldValues: review,
        newValues: updatedReview,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(updatedReview);
    } catch (error) {
      console.error("Error acknowledging performance review:", error);
      res.status(400).json({ message: "Failed to acknowledge performance review" });
    }
  });

  app.get("/api/caregivers/:id/performance-reviews", isAuthenticated, async (req, res) => {
    try {
      const reviews = await storage.getPerformanceReviewsByCaregiver(req.params.id);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching caregiver performance reviews:", error);
      res.status(500).json({ message: "Failed to fetch caregiver performance reviews" });
    }
  });

  // ==================== TIME-OFF REQUESTS & PTO MANAGEMENT ====================

  // Get all time-off requests
  app.get("/api/time-off-requests", isAuthenticated, async (req, res) => {
    try {
      const requests = await storage.getAllTimeOffRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching time-off requests:", error);
      res.status(500).json({ message: "Failed to fetch time-off requests" });
    }
  });

  // Get all pending time-off requests (for approval workflow)
  app.get("/api/time-off-requests/pending", isAuthenticated, async (req, res) => {
    try {
      const requests = await storage.getTimeOffRequestsByStatus("pending");
      res.json(requests);
    } catch (error) {
      console.error("Error fetching pending time-off requests:", error);
      res.status(500).json({ message: "Failed to fetch pending time-off requests" });
    }
  });

  // Create a new time-off request
  app.post("/api/time-off-requests", isAuthenticated, async (req: any, res) => {
    try {
      const processedBody = {
        ...req.body,
        startDate: coerceDate(req.body.startDate),
        endDate: coerceDate(req.body.endDate),
      };
      const validatedData = insertTimeOffRequestSchema.parse(processedBody);
      const request = await storage.createTimeOffRequest(validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "time_off_request",
        entityId: request.id,
        newValues: request,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating time-off request:", error);
      res.status(400).json({ message: "Failed to create time-off request" });
    }
  });

  // Get a specific time-off request
  app.get("/api/time-off-requests/:id", isAuthenticated, async (req, res) => {
    try {
      const request = await storage.getTimeOffRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ message: "Time-off request not found" });
      }
      res.json(request);
    } catch (error) {
      console.error("Error fetching time-off request:", error);
      res.status(500).json({ message: "Failed to fetch time-off request" });
    }
  });

  // Update a time-off request
  app.patch("/api/time-off-requests/:id", isAuthenticated, async (req: any, res) => {
    try {
      const oldRequest = await storage.getTimeOffRequest(req.params.id);
      if (!oldRequest) {
        return res.status(404).json({ message: "Time-off request not found" });
      }
      
      const processedBody = {
        ...req.body,
        startDate: req.body.startDate ? coerceDate(req.body.startDate) : undefined,
        endDate: req.body.endDate ? coerceDate(req.body.endDate) : undefined,
      };
      const validatedData = insertTimeOffRequestSchema.partial().parse(processedBody);
      const request = await storage.updateTimeOffRequest(req.params.id, validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "update",
        entityType: "time_off_request",
        entityId: request.id,
        oldValues: oldRequest,
        newValues: request,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(request);
    } catch (error) {
      console.error("Error updating time-off request:", error);
      res.status(400).json({ message: "Failed to update time-off request" });
    }
  });

  // Approve a time-off request
  app.post("/api/time-off-requests/:id/approve", isAuthenticated, async (req: any, res) => {
    try {
      const oldRequest = await storage.getTimeOffRequest(req.params.id);
      if (!oldRequest) {
        return res.status(404).json({ message: "Time-off request not found" });
      }
      
      const reviewerId = req.session?.user?.id;
      const notes = req.body.notes;
      const request = await storage.approveTimeOffRequest(req.params.id, reviewerId, notes);
      
      await storage.createAuditLog({
        userId: reviewerId,
        action: "approve",
        entityType: "time_off_request",
        entityId: request.id,
        oldValues: oldRequest,
        newValues: request,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(request);
    } catch (error) {
      console.error("Error approving time-off request:", error);
      res.status(400).json({ message: "Failed to approve time-off request" });
    }
  });

  // Deny a time-off request
  app.post("/api/time-off-requests/:id/deny", isAuthenticated, async (req: any, res) => {
    try {
      const oldRequest = await storage.getTimeOffRequest(req.params.id);
      if (!oldRequest) {
        return res.status(404).json({ message: "Time-off request not found" });
      }
      
      const reviewerId = req.session?.user?.id;
      const notes = req.body.notes;
      const request = await storage.denyTimeOffRequest(req.params.id, reviewerId, notes);
      
      await storage.createAuditLog({
        userId: reviewerId,
        action: "deny",
        entityType: "time_off_request",
        entityId: request.id,
        oldValues: oldRequest,
        newValues: request,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(request);
    } catch (error) {
      console.error("Error denying time-off request:", error);
      res.status(400).json({ message: "Failed to deny time-off request" });
    }
  });

  // Cancel a time-off request
  app.post("/api/time-off-requests/:id/cancel", isAuthenticated, async (req: any, res) => {
    try {
      const oldRequest = await storage.getTimeOffRequest(req.params.id);
      if (!oldRequest) {
        return res.status(404).json({ message: "Time-off request not found" });
      }
      
      const request = await storage.cancelTimeOffRequest(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "cancel",
        entityType: "time_off_request",
        entityId: request.id,
        oldValues: oldRequest,
        newValues: request,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(request);
    } catch (error) {
      console.error("Error cancelling time-off request:", error);
      res.status(400).json({ message: "Failed to cancel time-off request" });
    }
  });

  // Get time-off requests for a specific caregiver
  app.get("/api/caregivers/:id/time-off-requests", isAuthenticated, async (req, res) => {
    try {
      const requests = await storage.getTimeOffRequestsByCaregiver(req.params.id);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching caregiver time-off requests:", error);
      res.status(500).json({ message: "Failed to fetch caregiver time-off requests" });
    }
  });

  // Get PTO balance for a specific caregiver
  app.get("/api/caregivers/:id/pto-balance", isAuthenticated, async (req, res) => {
    try {
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const balances = await storage.getPtoBalance(req.params.id, year);
      
      // Calculate used hours for each PTO type
      const enhancedBalances = await Promise.all(
        balances.map(async (balance) => {
          const usedHours = await storage.calculatePtoUsed(req.params.id, year, balance.ptoType);
          return {
            ...balance,
            calculatedUsed: usedHours,
          };
        })
      );
      
      res.json(enhancedBalances);
    } catch (error) {
      console.error("Error fetching caregiver PTO balance:", error);
      res.status(500).json({ message: "Failed to fetch caregiver PTO balance" });
    }
  });

  // Create or update PTO balance
  app.post("/api/caregivers/:id/pto-balance", isAuthenticated, async (req: any, res) => {
    try {
      const year = req.body.year || new Date().getFullYear();
      const ptoType = req.body.ptoType;
      
      // Check if balance already exists
      const existingBalance = await storage.getPtoBalanceByType(req.params.id, year, ptoType);
      
      let balance;
      if (existingBalance) {
        balance = await storage.updatePtoBalance(existingBalance.id, req.body);
      } else {
        const validatedData = insertPtoBalanceSchema.parse({
          ...req.body,
          caregiverId: req.params.id,
          year,
        });
        balance = await storage.createPtoBalance(validatedData);
      }
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: existingBalance ? "update" : "create",
        entityType: "pto_balance",
        entityId: balance.id,
        oldValues: existingBalance,
        newValues: balance,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(existingBalance ? 200 : 201).json(balance);
    } catch (error) {
      console.error("Error creating/updating PTO balance:", error);
      res.status(400).json({ message: "Failed to create/update PTO balance" });
    }
  });

  // ==================== CLIENT SATISFACTION SURVEYS ====================

  // Survey Templates routes
  app.get("/api/survey-templates", isAuthenticated, async (req, res) => {
    try {
      const isActive = req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined;
      const templates = await storage.getSurveyTemplates(isActive);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching survey templates:", error);
      res.status(500).json({ message: "Failed to fetch survey templates" });
    }
  });

  app.get("/api/survey-templates/:id", isAuthenticated, async (req, res) => {
    try {
      const template = await storage.getSurveyTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Survey template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching survey template:", error);
      res.status(500).json({ message: "Failed to fetch survey template" });
    }
  });

  app.post("/api/survey-templates", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertSurveyTemplateSchema.parse(req.body);
      const template = await storage.createSurveyTemplate(validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "survey_template",
        entityId: template.id,
        newValues: template,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating survey template:", error);
      res.status(400).json({ message: "Failed to create survey template" });
    }
  });

  app.patch("/api/survey-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const oldTemplate = await storage.getSurveyTemplate(req.params.id);
      if (!oldTemplate) {
        return res.status(404).json({ message: "Survey template not found" });
      }
      
      const validatedData = insertSurveyTemplateSchema.partial().parse(req.body);
      const template = await storage.updateSurveyTemplate(req.params.id, validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "update",
        entityType: "survey_template",
        entityId: template.id,
        oldValues: oldTemplate,
        newValues: template,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(template);
    } catch (error) {
      console.error("Error updating survey template:", error);
      res.status(400).json({ message: "Failed to update survey template" });
    }
  });

  app.delete("/api/survey-templates/:id", isAuthenticated, async (req: any, res) => {
    try {
      const template = await storage.getSurveyTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Survey template not found" });
      }
      
      await storage.deleteSurveyTemplate(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "delete",
        entityType: "survey_template",
        entityId: req.params.id,
        oldValues: template,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting survey template:", error);
      res.status(500).json({ message: "Failed to delete survey template" });
    }
  });

  // Survey Response routes
  app.get("/api/surveys", isAuthenticated, async (req, res) => {
    try {
      const { officeId } = req.query;
      const officeFilter = officeId && officeId !== 'all' ? String(officeId) : undefined;
      const surveys = await storage.getSurveyResponses(officeFilter);
      res.json(surveys);
    } catch (error) {
      console.error("Error fetching surveys:", error);
      res.status(500).json({ message: "Failed to fetch surveys" });
    }
  });

  app.get("/api/surveys/stats", isAuthenticated, async (req, res) => {
    try {
      const { officeId, startDate, endDate } = req.query;
      const officeFilter = officeId && officeId !== 'all' ? String(officeId) : undefined;
      const start = startDate ? new Date(String(startDate)) : undefined;
      const end = endDate ? new Date(String(endDate)) : undefined;
      
      const stats = await storage.getSatisfactionStats(officeFilter, start, end);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching survey stats:", error);
      res.status(500).json({ message: "Failed to fetch survey statistics" });
    }
  });

  app.get("/api/surveys/by-client/:clientId", isAuthenticated, async (req, res) => {
    try {
      const surveys = await storage.getSurveyResponsesByClient(req.params.clientId);
      res.json(surveys);
    } catch (error) {
      console.error("Error fetching client surveys:", error);
      res.status(500).json({ message: "Failed to fetch client surveys" });
    }
  });

  app.get("/api/surveys/by-caregiver/:caregiverId", isAuthenticated, async (req, res) => {
    try {
      const surveys = await storage.getSurveyResponsesByCaregiver(req.params.caregiverId);
      res.json(surveys);
    } catch (error) {
      console.error("Error fetching caregiver surveys:", error);
      res.status(500).json({ message: "Failed to fetch caregiver surveys" });
    }
  });

  // Public route - get survey by access token (no auth required)
  app.get("/api/surveys/token/:token", async (req, res) => {
    try {
      const survey = await storage.getSurveyResponseByToken(req.params.token);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      // Check if survey has expired
      if (survey.expiresAt && new Date(survey.expiresAt) < new Date()) {
        return res.status(410).json({ message: "This survey has expired" });
      }
      
      // Check if survey is already completed
      if (survey.status === 'completed') {
        return res.status(400).json({ message: "This survey has already been completed" });
      }
      
      // Get the template to return the questions
      const template = await storage.getSurveyTemplate(survey.templateId);
      
      res.json({
        survey: {
          id: survey.id,
          respondentName: survey.respondentName,
          status: survey.status,
          expiresAt: survey.expiresAt,
          isAnonymous: survey.isAnonymous,
        },
        template: template ? {
          id: template.id,
          name: template.name,
          description: template.description,
          questions: template.questions,
        } : null,
      });
    } catch (error) {
      console.error("Error fetching survey by token:", error);
      res.status(500).json({ message: "Failed to fetch survey" });
    }
  });

  // Public route - submit survey (no auth required)
  app.post("/api/surveys/token/:token/submit", async (req, res) => {
    try {
      const survey = await storage.getSurveyResponseByToken(req.params.token);
      if (!survey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      // Check if survey has expired
      if (survey.expiresAt && new Date(survey.expiresAt) < new Date()) {
        return res.status(410).json({ message: "This survey has expired" });
      }
      
      // Check if survey is already completed
      if (survey.status === 'completed') {
        return res.status(400).json({ message: "This survey has already been completed" });
      }
      
      const { responses, overallRating, comments } = req.body;
      
      const completed = await storage.completeSurvey(survey.id, responses, overallRating, comments);
      
      res.json({ message: "Survey submitted successfully", survey: completed });
    } catch (error) {
      console.error("Error submitting survey:", error);
      res.status(500).json({ message: "Failed to submit survey" });
    }
  });

  // Send a survey (create a survey response)
  app.post("/api/surveys", isAuthenticated, async (req: any, res) => {
    try {
      // Generate a unique access token for the survey
      const accessToken = crypto.randomBytes(32).toString('hex');
      
      const processedBody = {
        ...req.body,
        accessToken,
        sentAt: new Date(),
        status: 'pending',
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days
      };
      
      const validatedData = insertSurveyResponseSchema.parse(processedBody);
      const survey = await storage.createSurveyResponse(validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "survey_response",
        entityId: survey.id,
        newValues: survey,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(201).json({
        ...survey,
        surveyLink: `/survey/${accessToken}`,
      });
    } catch (error) {
      console.error("Error creating survey:", error);
      res.status(400).json({ message: "Failed to create survey" });
    }
  });

  // Send bulk surveys to multiple clients
  app.post("/api/surveys/send-bulk", isAuthenticated, async (req: any, res) => {
    try {
      const { templateId, clientIds, respondentType, officeId, expiresInDays = 30 } = req.body;
      
      if (!templateId || !clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
        return res.status(400).json({ message: "templateId and clientIds are required" });
      }
      
      const template = await storage.getSurveyTemplate(templateId);
      if (!template) {
        return res.status(404).json({ message: "Survey template not found" });
      }
      
      const results: { clientId: string; success: boolean; survey?: any; error?: string }[] = [];
      
      for (const clientId of clientIds) {
        try {
          const client = await storage.getClient(clientId);
          if (!client) {
            results.push({ clientId, success: false, error: "Client not found" });
            continue;
          }
          
          const accessToken = crypto.randomBytes(32).toString('hex');
          
          const surveyData = {
            templateId,
            respondentType: respondentType || 'client',
            respondentId: clientId,
            respondentName: `${client.firstName} ${client.lastName}`,
            respondentEmail: client.email,
            clientId,
            officeId: officeId || client.officeId,
            accessToken,
            sentAt: new Date(),
            status: 'pending' as const,
            expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000),
          };
          
          const survey = await storage.createSurveyResponse(surveyData);
          
          results.push({
            clientId,
            success: true,
            survey: {
              id: survey.id,
              surveyLink: `/survey/${accessToken}`,
            },
          });
        } catch (error: any) {
          results.push({ clientId, success: false, error: error.message || "Failed to send survey" });
        }
      }
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "bulk_send",
        entityType: "survey_response",
        entityId: templateId,
        newValues: { templateId, clientCount: clientIds.length, successCount: results.filter(r => r.success).length },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json({
        totalSent: results.filter(r => r.success).length,
        totalFailed: results.filter(r => !r.success).length,
        results,
      });
    } catch (error) {
      console.error("Error sending bulk surveys:", error);
      res.status(500).json({ message: "Failed to send bulk surveys" });
    }
  });

  // Update a survey response
  app.patch("/api/surveys/:id", isAuthenticated, async (req: any, res) => {
    try {
      const oldSurvey = await storage.getSurveyResponse(req.params.id);
      if (!oldSurvey) {
        return res.status(404).json({ message: "Survey not found" });
      }
      
      const validatedData = insertSurveyResponseSchema.partial().parse(req.body);
      const survey = await storage.updateSurveyResponse(req.params.id, validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "update",
        entityType: "survey_response",
        entityId: survey.id,
        oldValues: oldSurvey,
        newValues: survey,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(survey);
    } catch (error) {
      console.error("Error updating survey:", error);
      res.status(400).json({ message: "Failed to update survey" });
    }
  });

  // ==================== CLAIMS MANAGEMENT ====================

  // Get all claims
  app.get("/api/claims", isAuthenticated, async (req, res) => {
    try {
      const { officeId, status, startDate, endDate } = req.query;
      const officeFilter = officeId && officeId !== 'all' ? String(officeId) : undefined;
      
      let claims;
      if (status) {
        claims = await storage.getClaimsByStatus(String(status));
        if (officeFilter) {
          claims = claims.filter(c => c.officeId === officeFilter);
        }
      } else if (startDate && endDate) {
        claims = await storage.getClaimsByDateRange(
          new Date(String(startDate)),
          new Date(String(endDate)),
          officeFilter
        );
      } else {
        claims = await storage.getAllClaims(officeFilter);
      }
      
      res.json(claims);
    } catch (error) {
      console.error("Error fetching claims:", error);
      res.status(500).json({ message: "Failed to fetch claims" });
    }
  });

  // Get claims aging report
  app.get("/api/claims/aging", isAuthenticated, async (req, res) => {
    try {
      const { officeId } = req.query;
      const officeFilter = officeId && officeId !== 'all' ? String(officeId) : undefined;
      const report = await storage.getClaimsAgingReport(officeFilter);
      res.json(report);
    } catch (error) {
      console.error("Error fetching claims aging report:", error);
      res.status(500).json({ message: "Failed to fetch claims aging report" });
    }
  });

  // Get claims summary
  app.get("/api/claims/summary", isAuthenticated, async (req, res) => {
    try {
      const { officeId, startDate, endDate } = req.query;
      const officeFilter = officeId && officeId !== 'all' ? String(officeId) : undefined;
      const start = startDate ? new Date(String(startDate)) : undefined;
      const end = endDate ? new Date(String(endDate)) : undefined;
      
      const summary = await storage.getClaimsSummary(officeFilter, start, end);
      res.json(summary);
    } catch (error) {
      console.error("Error fetching claims summary:", error);
      res.status(500).json({ message: "Failed to fetch claims summary" });
    }
  });

  // Get claims by client
  app.get("/api/claims/by-client/:clientId", isAuthenticated, async (req, res) => {
    try {
      const claims = await storage.getClaimsByClient(req.params.clientId);
      res.json(claims);
    } catch (error) {
      console.error("Error fetching client claims:", error);
      res.status(500).json({ message: "Failed to fetch client claims" });
    }
  });

  // Create a new claim
  app.post("/api/claims", isAuthenticated, async (req: any, res) => {
    try {
      const processedBody = {
        ...req.body,
        serviceDate: req.body.serviceDate ? new Date(req.body.serviceDate) : undefined,
        serviceEndDate: req.body.serviceEndDate ? new Date(req.body.serviceEndDate) : undefined,
        createdBy: req.session?.user?.id,
      };
      
      const validatedData = insertClaimSchema.parse(processedBody);
      const claim = await storage.createClaim(validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "claim",
        entityId: claim.id,
        newValues: claim,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(201).json(claim);
    } catch (error) {
      console.error("Error creating claim:", error);
      res.status(400).json({ message: "Failed to create claim" });
    }
  });

  // Get a specific claim
  app.get("/api/claims/:id", isAuthenticated, async (req, res) => {
    try {
      const claim = await storage.getClaim(req.params.id);
      if (!claim) {
        return res.status(404).json({ message: "Claim not found" });
      }
      res.json(claim);
    } catch (error) {
      console.error("Error fetching claim:", error);
      res.status(500).json({ message: "Failed to fetch claim" });
    }
  });

  // Update a claim
  app.patch("/api/claims/:id", isAuthenticated, async (req: any, res) => {
    try {
      const oldClaim = await storage.getClaim(req.params.id);
      if (!oldClaim) {
        return res.status(404).json({ message: "Claim not found" });
      }
      
      const processedBody = {
        ...req.body,
        serviceDate: req.body.serviceDate ? new Date(req.body.serviceDate) : undefined,
        serviceEndDate: req.body.serviceEndDate ? new Date(req.body.serviceEndDate) : undefined,
        submittedAt: req.body.submittedAt ? new Date(req.body.submittedAt) : undefined,
        processedAt: req.body.processedAt ? new Date(req.body.processedAt) : undefined,
        paidAt: req.body.paidAt ? new Date(req.body.paidAt) : undefined,
      };
      
      const validatedData = insertClaimSchema.partial().parse(processedBody);
      const claim = await storage.updateClaim(req.params.id, validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "update",
        entityType: "claim",
        entityId: claim.id,
        oldValues: oldClaim,
        newValues: claim,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(claim);
    } catch (error) {
      console.error("Error updating claim:", error);
      res.status(400).json({ message: "Failed to update claim" });
    }
  });

  // Submit a claim
  app.post("/api/claims/:id/submit", isAuthenticated, async (req: any, res) => {
    try {
      const oldClaim = await storage.getClaim(req.params.id);
      if (!oldClaim) {
        return res.status(404).json({ message: "Claim not found" });
      }
      
      if (oldClaim.status !== 'draft') {
        return res.status(400).json({ message: "Only draft claims can be submitted" });
      }
      
      const claim = await storage.submitClaim(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "submit",
        entityType: "claim",
        entityId: claim.id,
        oldValues: oldClaim,
        newValues: claim,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(claim);
    } catch (error) {
      console.error("Error submitting claim:", error);
      res.status(400).json({ message: "Failed to submit claim" });
    }
  });

  // Void a claim
  app.post("/api/claims/:id/void", isAuthenticated, async (req: any, res) => {
    try {
      const oldClaim = await storage.getClaim(req.params.id);
      if (!oldClaim) {
        return res.status(404).json({ message: "Claim not found" });
      }
      
      const { reason } = req.body;
      if (!reason) {
        return res.status(400).json({ message: "Void reason is required" });
      }
      
      const claim = await storage.voidClaim(req.params.id, reason);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "void",
        entityType: "claim",
        entityId: claim.id,
        oldValues: oldClaim,
        newValues: claim,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(claim);
    } catch (error) {
      console.error("Error voiding claim:", error);
      res.status(400).json({ message: "Failed to void claim" });
    }
  });

  // Resubmit a claim
  app.post("/api/claims/:id/resubmit", isAuthenticated, async (req: any, res) => {
    try {
      const originalClaim = await storage.getClaim(req.params.id);
      if (!originalClaim) {
        return res.status(404).json({ message: "Claim not found" });
      }
      
      if (!['denied', 'partial'].includes(originalClaim.status || '')) {
        return res.status(400).json({ message: "Only denied or partial claims can be resubmitted" });
      }
      
      const newClaim = await storage.resubmitClaim(req.params.id, req.session?.user?.id);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "resubmit",
        entityType: "claim",
        entityId: newClaim.id,
        oldValues: { originalClaimId: req.params.id },
        newValues: newClaim,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(201).json(newClaim);
    } catch (error) {
      console.error("Error resubmitting claim:", error);
      res.status(400).json({ message: "Failed to resubmit claim" });
    }
  });

  // Get line items for a claim
  app.get("/api/claims/:id/line-items", isAuthenticated, async (req, res) => {
    try {
      const claim = await storage.getClaim(req.params.id);
      if (!claim) {
        return res.status(404).json({ message: "Claim not found" });
      }
      
      const lineItems = await storage.getClaimLineItems(req.params.id);
      res.json(lineItems);
    } catch (error) {
      console.error("Error fetching claim line items:", error);
      res.status(500).json({ message: "Failed to fetch claim line items" });
    }
  });

  // Add a line item to a claim
  app.post("/api/claims/:id/line-items", isAuthenticated, async (req: any, res) => {
    try {
      const claim = await storage.getClaim(req.params.id);
      if (!claim) {
        return res.status(404).json({ message: "Claim not found" });
      }
      
      const validatedData = insertClaimLineItemSchema.parse({
        ...req.body,
        claimId: req.params.id,
      });
      
      const lineItem = await storage.createClaimLineItem(validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "claim_line_item",
        entityId: lineItem.id,
        newValues: lineItem,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(201).json(lineItem);
    } catch (error) {
      console.error("Error creating claim line item:", error);
      res.status(400).json({ message: "Failed to create claim line item" });
    }
  });

  // Delete a claim line item
  app.delete("/api/claims/:claimId/line-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteClaimLineItem(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "delete",
        entityType: "claim_line_item",
        entityId: req.params.id,
        oldValues: { claimId: req.params.claimId },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting claim line item:", error);
      res.status(500).json({ message: "Failed to delete claim line item" });
    }
  });

  // Analytics routes
  function parseDateRange(req: any): DateRange {
    const { startDate, endDate } = req.query;
    return {
      startDate: startDate ? new Date(String(startDate)) : undefined,
      endDate: endDate ? new Date(String(endDate)) : undefined,
    };
  }

  function parseOfficeId(req: any): string | undefined {
    const { officeId } = req.query;
    return officeId && officeId !== 'all' ? String(officeId) : undefined;
  }

  // Get all KPIs combined
  app.get("/api/analytics/kpis", isAuthenticated, async (req, res) => {
    try {
      const officeId = parseOfficeId(req);
      const dateRange = parseDateRange(req);
      const kpis = await getAllKPIs(officeId, dateRange);
      res.json(kpis);
    } catch (error) {
      console.error("Error fetching analytics KPIs:", error);
      res.status(500).json({ message: "Failed to fetch analytics KPIs" });
    }
  });

  // Get operational KPIs
  app.get("/api/analytics/operational", isAuthenticated, async (req, res) => {
    try {
      const officeId = parseOfficeId(req);
      const dateRange = parseDateRange(req);
      const kpis = await getOperationalKPIs(officeId, dateRange);
      res.json(kpis);
    } catch (error) {
      console.error("Error fetching operational KPIs:", error);
      res.status(500).json({ message: "Failed to fetch operational KPIs" });
    }
  });

  // Get financial KPIs
  app.get("/api/analytics/financial", isAuthenticated, async (req, res) => {
    try {
      const officeId = parseOfficeId(req);
      const dateRange = parseDateRange(req);
      const kpis = await getFinancialKPIs(officeId, dateRange);
      res.json(kpis);
    } catch (error) {
      console.error("Error fetching financial KPIs:", error);
      res.status(500).json({ message: "Failed to fetch financial KPIs" });
    }
  });

  // Get compliance KPIs
  app.get("/api/analytics/compliance", isAuthenticated, async (req, res) => {
    try {
      const officeId = parseOfficeId(req);
      const dateRange = parseDateRange(req);
      const kpis = await getComplianceKPIs(officeId, dateRange);
      res.json(kpis);
    } catch (error) {
      console.error("Error fetching compliance KPIs:", error);
      res.status(500).json({ message: "Failed to fetch compliance KPIs" });
    }
  });

  // Get staffing KPIs
  app.get("/api/analytics/staffing", isAuthenticated, async (req, res) => {
    try {
      const officeId = parseOfficeId(req);
      const dateRange = parseDateRange(req);
      const kpis = await getStaffingKPIs(officeId, dateRange);
      res.json(kpis);
    } catch (error) {
      console.error("Error fetching staffing KPIs:", error);
      res.status(500).json({ message: "Failed to fetch staffing KPIs" });
    }
  });

  // Get trend data for specific metric
  app.get("/api/analytics/trends/:metric", isAuthenticated, async (req, res) => {
    try {
      const { metric } = req.params;
      const officeId = parseOfficeId(req);
      const months = req.query.months ? parseInt(String(req.query.months)) : 12;
      
      const validMetrics = ['clients', 'caregivers', 'visits', 'hours', 'revenue', 'collections'];
      if (!validMetrics.includes(metric)) {
        return res.status(400).json({ message: `Invalid metric. Valid options: ${validMetrics.join(', ')}` });
      }
      
      const trends = await getTrendData(metric, officeId, months);
      res.json(trends);
    } catch (error) {
      console.error("Error fetching trend data:", error);
      res.status(500).json({ message: "Failed to fetch trend data" });
    }
  });

  // Get forecast for specific metric
  app.get("/api/analytics/forecast/:metric", isAuthenticated, async (req, res) => {
    try {
      const { metric } = req.params;
      const officeId = parseOfficeId(req);
      const forecastMonths = req.query.forecastMonths ? parseInt(String(req.query.forecastMonths)) : 3;
      
      const validMetrics = ['clients', 'caregivers', 'visits', 'hours', 'revenue', 'collections'];
      if (!validMetrics.includes(metric)) {
        return res.status(400).json({ message: `Invalid metric. Valid options: ${validMetrics.join(', ')}` });
      }
      
      const forecast = await getForecasting(metric, officeId, forecastMonths);
      res.json(forecast);
    } catch (error) {
      console.error("Error fetching forecast data:", error);
      res.status(500).json({ message: "Failed to fetch forecast data" });
    }
  });

  // Get combined dashboard analytics data
  app.get("/api/analytics/dashboard", isAuthenticated, async (req, res) => {
    try {
      const officeId = parseOfficeId(req);
      const dateRange = parseDateRange(req);
      const dashboard = await getDashboardAnalytics(officeId, dateRange);
      res.json(dashboard);
    } catch (error) {
      console.error("Error fetching dashboard analytics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard analytics" });
    }
  });

  // ==================== REFERRAL SOURCE TRACKING ROUTES ====================

  // Get all referral sources
  app.get("/api/referral-sources", isAuthenticated, async (req, res) => {
    try {
      const { officeId } = req.query;
      const officeFilter = officeId && officeId !== 'all' ? String(officeId) : undefined;
      const sources = await storage.getReferralSources(officeFilter);
      res.json(sources);
    } catch (error) {
      console.error("Error fetching referral sources:", error);
      res.status(500).json({ message: "Failed to fetch referral sources" });
    }
  });

  // Get top performing referral sources
  app.get("/api/referral-sources/top", isAuthenticated, async (req, res) => {
    try {
      const { officeId, limit } = req.query;
      const officeFilter = officeId && officeId !== 'all' ? String(officeId) : undefined;
      const limitNum = limit ? parseInt(String(limit)) : 10;
      const topSources = await storage.getTopReferralSources(officeFilter, limitNum);
      res.json(topSources);
    } catch (error) {
      console.error("Error fetching top referral sources:", error);
      res.status(500).json({ message: "Failed to fetch top referral sources" });
    }
  });

  // Get single referral source
  app.get("/api/referral-sources/:id", isAuthenticated, async (req, res) => {
    try {
      const source = await storage.getReferralSource(req.params.id);
      if (!source) {
        return res.status(404).json({ message: "Referral source not found" });
      }
      res.json(source);
    } catch (error) {
      console.error("Error fetching referral source:", error);
      res.status(500).json({ message: "Failed to fetch referral source" });
    }
  });

  // Get referrals for a specific source
  app.get("/api/referral-sources/:id/referrals", isAuthenticated, async (req, res) => {
    try {
      const source = await storage.getReferralSource(req.params.id);
      if (!source) {
        return res.status(404).json({ message: "Referral source not found" });
      }
      const referrals = await storage.getReferralsBySource(req.params.id);
      res.json(referrals);
    } catch (error) {
      console.error("Error fetching referrals for source:", error);
      res.status(500).json({ message: "Failed to fetch referrals for source" });
    }
  });

  // Create referral source
  app.post("/api/referral-sources", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertReferralSourceSchema.parse(req.body);
      const source = await storage.createReferralSource(validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "referral_source",
        entityId: source.id,
        newValues: source,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(201).json(source);
    } catch (error) {
      console.error("Error creating referral source:", error);
      res.status(400).json({ message: "Failed to create referral source" });
    }
  });

  // Update referral source
  app.patch("/api/referral-sources/:id", isAuthenticated, async (req: any, res) => {
    try {
      const oldSource = await storage.getReferralSource(req.params.id);
      if (!oldSource) {
        return res.status(404).json({ message: "Referral source not found" });
      }
      
      const validatedData = insertReferralSourceSchema.partial().parse(req.body);
      const source = await storage.updateReferralSource(req.params.id, validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "update",
        entityType: "referral_source",
        entityId: source.id,
        oldValues: oldSource,
        newValues: source,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(source);
    } catch (error) {
      console.error("Error updating referral source:", error);
      res.status(400).json({ message: "Failed to update referral source" });
    }
  });

  // Delete referral source
  app.delete("/api/referral-sources/:id", isAuthenticated, async (req: any, res) => {
    try {
      const source = await storage.getReferralSource(req.params.id);
      if (!source) {
        return res.status(404).json({ message: "Referral source not found" });
      }
      
      await storage.deleteReferralSource(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "delete",
        entityType: "referral_source",
        entityId: req.params.id,
        oldValues: source,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting referral source:", error);
      res.status(500).json({ message: "Failed to delete referral source" });
    }
  });

  // Get all client referrals
  app.get("/api/client-referrals", isAuthenticated, async (req, res) => {
    try {
      const { officeId } = req.query;
      const officeFilter = officeId && officeId !== 'all' ? String(officeId) : undefined;
      const referrals = await storage.getClientReferrals(officeFilter);
      res.json(referrals);
    } catch (error) {
      console.error("Error fetching client referrals:", error);
      res.status(500).json({ message: "Failed to fetch client referrals" });
    }
  });

  // Get single client referral
  app.get("/api/client-referrals/:id", isAuthenticated, async (req, res) => {
    try {
      const referral = await storage.getClientReferral(req.params.id);
      if (!referral) {
        return res.status(404).json({ message: "Client referral not found" });
      }
      res.json(referral);
    } catch (error) {
      console.error("Error fetching client referral:", error);
      res.status(500).json({ message: "Failed to fetch client referral" });
    }
  });

  // Create client referral
  app.post("/api/client-referrals", isAuthenticated, async (req: any, res) => {
    try {
      const processedBody = {
        ...req.body,
        referralDate: req.body.referralDate ? new Date(req.body.referralDate) : undefined,
        conversionDate: req.body.conversionDate ? new Date(req.body.conversionDate) : undefined,
      };
      
      const validatedData = insertClientReferralSchema.parse(processedBody);
      const referral = await storage.createClientReferral(validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "create",
        entityType: "client_referral",
        entityId: referral.id,
        newValues: referral,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(201).json(referral);
    } catch (error) {
      console.error("Error creating client referral:", error);
      res.status(400).json({ message: "Failed to create client referral" });
    }
  });

  // Update client referral
  app.patch("/api/client-referrals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const oldReferral = await storage.getClientReferral(req.params.id);
      if (!oldReferral) {
        return res.status(404).json({ message: "Client referral not found" });
      }
      
      const processedBody = {
        ...req.body,
        referralDate: req.body.referralDate ? new Date(req.body.referralDate) : undefined,
        conversionDate: req.body.conversionDate ? new Date(req.body.conversionDate) : undefined,
      };
      
      const validatedData = insertClientReferralSchema.partial().parse(processedBody);
      const referral = await storage.updateClientReferral(req.params.id, validatedData);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "update",
        entityType: "client_referral",
        entityId: referral.id,
        oldValues: oldReferral,
        newValues: referral,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(referral);
    } catch (error) {
      console.error("Error updating client referral:", error);
      res.status(400).json({ message: "Failed to update client referral" });
    }
  });

  // Convert client referral
  app.post("/api/client-referrals/:id/convert", isAuthenticated, async (req: any, res) => {
    try {
      const oldReferral = await storage.getClientReferral(req.params.id);
      if (!oldReferral) {
        return res.status(404).json({ message: "Client referral not found" });
      }
      
      if (oldReferral.status === 'converted') {
        return res.status(400).json({ message: "Referral is already converted" });
      }
      
      const referral = await storage.convertReferral(req.params.id);
      
      await storage.createAuditLog({
        userId: req.session?.user?.id,
        action: "convert",
        entityType: "client_referral",
        entityId: referral.id,
        oldValues: oldReferral,
        newValues: referral,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.json(referral);
    } catch (error) {
      console.error("Error converting client referral:", error);
      res.status(400).json({ message: "Failed to convert client referral" });
    }
  });

  // Get referral statistics
  app.get("/api/referral-stats", isAuthenticated, async (req, res) => {
    try {
      const { officeId, startDate, endDate } = req.query;
      const officeFilter = officeId && officeId !== 'all' ? String(officeId) : undefined;
      const start = startDate ? new Date(String(startDate)) : undefined;
      const end = endDate ? new Date(String(endDate)) : undefined;
      
      const stats = await storage.getReferralStats(officeFilter, start, end);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching referral stats:", error);
      res.status(500).json({ message: "Failed to fetch referral stats" });
    }
  });

  // ==================== HHAX INTEGRATION ====================
  // All HHAX routes require admin, supervisor, or super_admin roles
  
  // Test HHAX SFTP connection
  app.get("/api/hhax/test-connection", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.session?.user;
      if (!user || (user.role !== "admin" && user.role !== "supervisor" && user.role !== "super_admin")) {
        return res.status(403).json({ message: "Unauthorized: Admin, supervisor, or super_admin role required" });
      }
      
      const { hhaxSftpService } = await import('./hhax-sftp-service');
      const result = await hhaxSftpService.testConnection();
      res.json(result);
    } catch (error: any) {
      console.error("Error testing HHAX connection:", error);
      res.status(500).json({ success: false, message: error.message || "Connection test failed" });
    }
  });

  // List available files in HHAX Outbox
  app.get("/api/hhax/files", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.session?.user;
      if (!user || (user.role !== "admin" && user.role !== "supervisor" && user.role !== "super_admin")) {
        return res.status(403).json({ message: "Unauthorized: Admin, supervisor, or super_admin role required" });
      }
      
      const { hhaxSftpService } = await import('./hhax-sftp-service');
      const files = await hhaxSftpService.listOutboxFiles();
      res.json(files);
    } catch (error: any) {
      console.error("Error listing HHAX files:", error);
      res.status(500).json({ message: error.message || "Failed to list files" });
    }
  });

  // Get HHAX office mappings
  app.get("/api/hhax/office-mappings", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.session?.user;
      if (!user || (user.role !== "admin" && user.role !== "supervisor" && user.role !== "super_admin")) {
        return res.status(403).json({ message: "Unauthorized: Admin, supervisor, or super_admin role required" });
      }
      
      const mappings = await storage.getHhaxOfficeMappings();
      res.json(mappings);
    } catch (error) {
      console.error("Error fetching HHAX office mappings:", error);
      res.status(500).json({ message: "Failed to fetch office mappings" });
    }
  });

  // Create HHAX office mapping
  app.post("/api/hhax/office-mappings", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.session?.user;
      if (!user || (user.role !== "admin" && user.role !== "supervisor" && user.role !== "super_admin")) {
        return res.status(403).json({ message: "Unauthorized: Admin, supervisor, or super_admin role required" });
      }
      
      const validatedData = insertHhaxOfficeMappingSchema.parse(req.body);
      const mapping = await storage.createHhaxOfficeMapping(validatedData);
      res.status(201).json(mapping);
    } catch (error) {
      console.error("Error creating HHAX office mapping:", error);
      res.status(400).json({ message: "Failed to create office mapping" });
    }
  });

  // Update HHAX office mapping
  app.patch("/api/hhax/office-mappings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.session?.user;
      if (!user || (user.role !== "admin" && user.role !== "supervisor" && user.role !== "super_admin")) {
        return res.status(403).json({ message: "Unauthorized: Admin, supervisor, or super_admin role required" });
      }
      
      const validatedData = insertHhaxOfficeMappingSchema.partial().parse(req.body);
      const mapping = await storage.updateHhaxOfficeMapping(req.params.id, validatedData);
      res.json(mapping);
    } catch (error) {
      console.error("Error updating HHAX office mapping:", error);
      res.status(400).json({ message: "Failed to update office mapping" });
    }
  });

  // Delete HHAX office mapping
  app.delete("/api/hhax/office-mappings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.session?.user;
      if (!user || (user.role !== "admin" && user.role !== "supervisor" && user.role !== "super_admin")) {
        return res.status(403).json({ message: "Unauthorized: Admin, supervisor, or super_admin role required" });
      }
      
      await storage.deleteHhaxOfficeMapping(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting HHAX office mapping:", error);
      res.status(400).json({ message: "Failed to delete office mapping" });
    }
  });

  // Get HHAX sync logs
  app.get("/api/hhax/sync-logs", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.session?.user;
      if (!user || (user.role !== "admin" && user.role !== "supervisor" && user.role !== "super_admin")) {
        return res.status(403).json({ message: "Unauthorized: Admin, supervisor, or super_admin role required" });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getHhaxSyncLogs(limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching HHAX sync logs:", error);
      res.status(500).json({ message: "Failed to fetch sync logs" });
    }
  });

  // Import caregivers from HHAX
  app.post("/api/hhax/import/caregivers", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.session?.user;
      if (!user || (user.role !== "admin" && user.role !== "supervisor" && user.role !== "super_admin")) {
        return res.status(403).json({ message: "Unauthorized: Admin, supervisor, or super_admin role required" });
      }
      
      const { hhaxSftpService } = await import('./hhax-sftp-service');
      const { fileName } = req.body;
      
      const syncLogData = insertHhaxSyncLogSchema.parse({
        syncType: 'caregivers',
        status: 'in_progress',
        fileName: fileName || null,
        initiatedBy: user.id,
      });
      const syncLog = await storage.createHhaxSyncLog(syncLogData);
      
      const result = await hhaxSftpService.importCaregivers(fileName);
      
      await storage.updateHhaxSyncLog(syncLog.id, {
        status: result.success ? 'completed' : 'failed',
        recordsTotal: result.recordsTotal,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        recordsSkipped: result.recordsSkipped,
        recordsFailed: result.recordsFailed,
        errorDetails: result.errors.length > 0 ? result.errors : null,
        completedAt: new Date(),
      });
      
      res.json({ syncLogId: syncLog.id, ...result });
    } catch (error: any) {
      console.error("Error importing caregivers from HHAX:", error);
      res.status(500).json({ message: error.message || "Failed to import caregivers" });
    }
  });

  // Import clients from HHAX
  app.post("/api/hhax/import/clients", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.session?.user;
      if (!user || (user.role !== "admin" && user.role !== "supervisor" && user.role !== "super_admin")) {
        return res.status(403).json({ message: "Unauthorized: Admin, supervisor, or super_admin role required" });
      }
      
      const { hhaxSftpService } = await import('./hhax-sftp-service');
      const { fileName } = req.body;
      
      const syncLogData = insertHhaxSyncLogSchema.parse({
        syncType: 'clients',
        status: 'in_progress',
        fileName: fileName || null,
        initiatedBy: user.id,
      });
      const syncLog = await storage.createHhaxSyncLog(syncLogData);
      
      const result = await hhaxSftpService.importClients(fileName);
      
      await storage.updateHhaxSyncLog(syncLog.id, {
        status: result.success ? 'completed' : 'failed',
        recordsTotal: result.recordsTotal,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        recordsSkipped: result.recordsSkipped,
        recordsFailed: result.recordsFailed,
        errorDetails: result.errors.length > 0 ? result.errors : null,
        completedAt: new Date(),
      });
      
      res.json({ syncLogId: syncLog.id, ...result });
    } catch (error: any) {
      console.error("Error importing clients from HHAX:", error);
      res.status(500).json({ message: error.message || "Failed to import clients" });
    }
  });

  // Import schedules from HHAX
  app.post("/api/hhax/import/schedules", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.session?.user;
      if (!user || (user.role !== "admin" && user.role !== "supervisor" && user.role !== "super_admin")) {
        return res.status(403).json({ message: "Unauthorized: Admin, supervisor, or super_admin role required" });
      }
      
      const { hhaxSftpService } = await import('./hhax-sftp-service');
      const { fileName } = req.body;
      
      const syncLogData = insertHhaxSyncLogSchema.parse({
        syncType: 'schedules',
        status: 'in_progress',
        fileName: fileName || null,
        initiatedBy: user.id,
      });
      const syncLog = await storage.createHhaxSyncLog(syncLogData);
      
      const result = await hhaxSftpService.importSchedules(fileName);
      
      await storage.updateHhaxSyncLog(syncLog.id, {
        status: result.success ? 'completed' : 'failed',
        recordsTotal: result.recordsTotal,
        recordsCreated: result.recordsCreated,
        recordsUpdated: result.recordsUpdated,
        recordsSkipped: result.recordsSkipped,
        recordsFailed: result.recordsFailed,
        errorDetails: result.errors.length > 0 ? result.errors : null,
        completedAt: new Date(),
      });
      
      res.json({ syncLogId: syncLog.id, ...result });
    } catch (error: any) {
      console.error("Error importing schedules from HHAX:", error);
      res.status(500).json({ message: error.message || "Failed to import schedules" });
    }
  });

  // Run full HHAX sync (all data types)
  app.post("/api/hhax/sync-all", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.session?.user;
      if (!user || (user.role !== "admin" && user.role !== "supervisor" && user.role !== "super_admin")) {
        return res.status(403).json({ message: "Unauthorized: Admin, supervisor, or super_admin role required" });
      }
      
      const { hhaxSftpService } = await import('./hhax-sftp-service');
      
      const syncLogData = insertHhaxSyncLogSchema.parse({
        syncType: 'clients',
        status: 'in_progress',
        initiatedBy: user.id,
      });
      const syncLog = await storage.createHhaxSyncLog(syncLogData);
      
      const results = await hhaxSftpService.runFullSync(syncLog.id, user.id);
      
      const totalRecords = results.caregivers.recordsTotal + results.clients.recordsTotal + results.schedules.recordsTotal;
      const totalCreated = results.caregivers.recordsCreated + results.clients.recordsCreated + results.schedules.recordsCreated;
      const totalUpdated = results.caregivers.recordsUpdated + results.clients.recordsUpdated + results.schedules.recordsUpdated;
      const totalFailed = results.caregivers.recordsFailed + results.clients.recordsFailed + results.schedules.recordsFailed;
      const allErrors = [...results.caregivers.errors, ...results.clients.errors, ...results.schedules.errors];
      
      await storage.updateHhaxSyncLog(syncLog.id, {
        status: allErrors.length === 0 ? 'completed' : 'partial',
        recordsTotal: totalRecords,
        recordsCreated: totalCreated,
        recordsUpdated: totalUpdated,
        recordsFailed: totalFailed,
        errorDetails: allErrors.length > 0 ? allErrors : null,
        completedAt: new Date(),
      });
      
      res.json({ syncLogId: syncLog.id, results });
    } catch (error: any) {
      console.error("Error running full HHAX sync:", error);
      res.status(500).json({ message: error.message || "Failed to run full sync" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
