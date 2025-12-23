import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import multer from "multer";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import {
  insertOfficeSchema,
  insertClientSchema,
  insertCaregiverSchema,
  insertCarePlanSchema,
  insertProgressNoteSchema,
  insertDocumentSchema,
  insertIncidentReportSchema,
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
} from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";

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

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Ensure uploads directory exists
  if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads", { recursive: true });
  }

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
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
      const stats = await storage.getMonthlyStats(year);
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
        userId: req.user.claims.sub,
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
        userId: req.user.claims.sub,
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
        userId: req.user.claims.sub,
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
        userId: req.user.claims.sub,
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
        dateOfBirth: req.body.dateOfBirth && typeof req.body.dateOfBirth === 'string' ? new Date(req.body.dateOfBirth) : req.body.dateOfBirth,
      };
      const validatedData = insertClientSchema.partial().parse(processedBody);
      const client = await storage.updateClient(req.params.id, validatedData);
      
      // Log audit trail
      await storage.createAuditLog({
        userId: req.user.claims.sub,
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
        userId: req.user.claims.sub,
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
            userId: req.user.claims.sub,
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
      
      // Enrich caregivers with user data (firstName, lastName)
      const enrichedCaregivers = await Promise.all(
        caregivers.map(async (caregiver) => {
          if (caregiver.userId) {
            const user = await storage.getUser(caregiver.userId);
            return {
              ...caregiver,
              firstName: user?.firstName || null,
              lastName: user?.lastName || null,
              email: user?.email || null,
            };
          }
          return { ...caregiver, firstName: null, lastName: null, email: null };
        })
      );
      
      res.json(enrichedCaregivers);
    } catch (error) {
      console.error("Error fetching caregivers:", error);
      res.status(500).json({ message: "Failed to fetch caregivers" });
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
        userId: req.user.claims.sub,
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
            userId: req.user.claims.sub,
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
        createdBy: req.user.claims.sub,
      });
      const carePlan = await storage.createCarePlan(validatedData);
      res.status(201).json(carePlan);
    } catch (error) {
      console.error("Error creating care plan:", error);
      res.status(400).json({ message: "Failed to create care plan" });
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
        uploadedBy: req.user.claims.sub,
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
      const documents = await storage.getAllDocuments();
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

  app.get("/api/clients/:clientId/caregivers", isAuthenticated, async (req, res) => {
    try {
      const caregivers = await storage.getAssignedCaregiversByClient(req.params.clientId);
      res.json(caregivers);
    } catch (error) {
      console.error("Error fetching assigned caregivers:", error);
      res.status(500).json({ message: "Failed to fetch assigned caregivers" });
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
        authorUserId: req.user.claims.sub,
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
        createdBy: req.user.claims.sub,
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
      const reports = await storage.getAllIncidentReports();
      res.json(reports);
    } catch (error) {
      console.error("Error fetching incident reports:", error);
      res.status(500).json({ message: "Failed to fetch incident reports" });
    }
  });

  app.post("/api/incident-reports", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertIncidentReportSchema.parse({
        ...req.body,
        reportedBy: req.user.claims.sub,
      });
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
      const { userId } = req.query;
      let tasks;
      
      if (userId) {
        tasks = await storage.getTasksByUser(userId as string);
      } else {
        tasks = await storage.getAllTasks();
      }
      
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertTaskSchema.parse({
        ...req.body,
        createdBy: req.user.claims.sub,
      });
      const task = await storage.createTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(400).json({ message: "Failed to create task" });
    }
  });

  app.put("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertTaskSchema.partial().parse(req.body);
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
      const { type = 'received', status } = req.query;
      const userId = req.user.claims.sub;
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
        senderId: req.user.claims.sub,
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
      const userId = req.user.claims.sub;
      await storage.updateMessageStatus(req.params.id, userId, 'read');
      res.status(204).send();
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  app.put("/api/messages/:id/unread", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.updateMessageStatus(req.params.id, userId, 'unread');
      res.status(204).send();
    } catch (error) {
      console.error("Error marking message as unread:", error);
      res.status(500).json({ message: "Failed to mark message as unread" });
    }
  });

  app.put("/api/messages/:id/archive", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      
      const userId = req.user.claims.sub;
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
      const complianceItems = await storage.getAllComplianceItems();
      res.json(complianceItems);
    } catch (error) {
      console.error("Error fetching compliance items:", error);
      res.status(500).json({ message: "Failed to fetch compliance items" });
    }
  });

  app.post("/api/compliance", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertComplianceItemSchema.parse(req.body);
      const item = await storage.createComplianceItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating compliance item:", error);
      res.status(400).json({ message: "Failed to create compliance item" });
    }
  });

  app.put("/api/compliance/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertComplianceItemSchema.partial().parse(req.body);
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
      const trainings = await storage.getAllTrainings();
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
      const validatedData = insertTrainingRecordSchema.parse(req.body);
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
    const userId = req.user?.claims?.sub;
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
      const userId = req.user?.claims?.sub;
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
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      if (!user || (user.role !== "admin" && user.role !== "supervisor" && user.role !== "super_admin")) {
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
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      if (!user || user.role !== "super_admin") {
        return res.status(403).json({ message: "Access denied. Super admin role required." });
      }
      next();
    } catch (error) {
      return res.status(500).json({ message: "Failed to verify permissions" });
    }
  };

  app.post("/api/users", isAuthenticated, requireAdminOrSupervisor, async (req: any, res) => {
    try {
      const validatedData = insertUserSchema.omit({ id: true, createdAt: true, updatedAt: true }).parse(req.body);
      const user = await storage.createUser(validatedData);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ message: "Failed to create user" });
    }
  });

  // Allow users to update their own profile (limited fields)
  app.put("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
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
            userId: req.user.claims.sub,
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
      const incidents = await storage.getAllIncidentReports();
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
        reportedBy: req.user.claims.sub,
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

  // Family Portal API Routes
  
  // Family member management routes
  app.get("/api/family-members/me", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
        createdBy: req.user?.claims?.sub,
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
      const validatedData = insertMasterWeekTemplateSchema.partial().parse(req.body);
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
        createdBy: req.user?.claims?.sub,
      });
      const schedule = await storage.createClientSchedule(validatedData);
      
      // Log the creation
      await storage.createScheduleChangeLog({
        scheduleId: schedule.id,
        changeType: 'created',
        newValues: schedule,
        changedBy: req.user?.claims?.sub,
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
        changedBy: req.user?.claims?.sub,
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
        changedBy: req.user?.claims?.sub,
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
      const { weekStartDate } = req.body;
      if (!weekStartDate) {
        return res.status(400).json({ message: "Week start date is required" });
      }

      const schedules = await storage.applyMasterWeekToSchedules(req.params.id, new Date(weekStartDate));
      
      // Log the rollover
      for (const schedule of schedules) {
        await storage.createScheduleChangeLog({
          scheduleId: schedule.id,
          changeType: 'created',
          newValues: schedule,
          changedBy: req.user?.claims?.sub,
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
      await aiIssueService.resolveIssue(req.params.id, req.user.claims.sub, req.body.resolutionNotes);
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
      await aiIssueService.dismissIssue(req.params.id, req.user.claims.sub, req.body.reason);
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
      const result = await aiIssueService.applyAutoFix(req.params.id, req.user.claims.sub);
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

  // EVV Data routes
  app.get("/api/evv-data", isAuthenticated, async (req, res) => {
    try {
      const { month, year } = req.query;
      let evvDataItems;
      
      if (month && year) {
        evvDataItems = await storage.getEvvDataByMonthYear(
          parseInt(month as string, 10),
          parseInt(year as string, 10)
        );
      } else {
        evvDataItems = await storage.getAllEvvData();
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
      const validatedData = insertEvvDataSchema.parse({
        ...req.body,
        createdBy: req.user.claims.sub,
      });
      const evvDataItem = await storage.createEvvData(validatedData);
      
      await storage.createAuditLog({
        userId: req.user.claims.sub,
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
      
      const validatedData = insertEvvDataSchema.partial().parse(req.body);
      const evvDataItem = await storage.updateEvvData(req.params.id, validatedData);
      
      await storage.createAuditLog({
        userId: req.user.claims.sub,
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
        userId: req.user.claims.sub,
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
        userId: req.user.claims.sub,
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
        userId: req.user.claims.sub,
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
        userId: req.user.claims.sub,
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
        userId: req.user.claims.sub,
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
        userId: req.user.claims.sub,
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
        userId: req.user.claims.sub,
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
        userId: req.user.claims.sub,
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
        userId: req.user.claims.sub,
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
        userId: req.user.claims.sub,
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
        userId: req.user.claims.sub,
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
        userId: req.user.claims.sub,
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
        userId: req.user.claims.sub,
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
        userId: req.user.claims.sub,
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
        userId: req.user.claims.sub,
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
  app.get("/api/billing", isAuthenticated, async (req, res) => {
    try {
      const officeId = req.query.officeId as string | undefined;
      const records = await storage.getBillingRecords(officeId);
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
      const record = await storage.createBillingRecord({
        ...req.body,
        createdBy: req.user.claims.sub,
      });
      res.status(201).json(record);
    } catch (error) {
      console.error("Error creating billing record:", error);
      res.status(400).json({ message: "Failed to create billing record" });
    }
  });

  app.put("/api/billing/:id", isAuthenticated, async (req, res) => {
    try {
      const record = await storage.updateBillingRecord(req.params.id, req.body);
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
        effectiveDate: req.body.effectiveDate ? new Date(req.body.effectiveDate) : null,
        endDate: req.body.endDate ? new Date(req.body.endDate) : null,
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
        effectiveDate: req.body.effectiveDate ? new Date(req.body.effectiveDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
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
      const run = await storage.createPayrollRun({
        ...req.body,
        createdBy: req.user.claims.sub,
      });
      res.status(201).json(run);
    } catch (error) {
      console.error("Error creating payroll run:", error);
      res.status(400).json({ message: "Failed to create payroll run" });
    }
  });

  app.put("/api/payroll/:id", isAuthenticated, async (req: any, res) => {
    try {
      const updateData = { ...req.body };
      if (req.body.status === "approved") {
        updateData.approvedBy = req.user.claims.sub;
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
        updatedBy: req.user.claims.sub,
      };
      
      if (req.body.status === 'complete') {
        updateData.completedAt = new Date();
        updateData.completedBy = req.user.claims.sub;
      }
      
      const status = await storage.upsertOfficePaSurveyStatus(updateData);
      res.json(status);
    } catch (error) {
      console.error("Error updating office PA survey status:", error);
      res.status(400).json({ message: "Failed to update survey status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
