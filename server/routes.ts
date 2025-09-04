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
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
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
      const { search } = req.query;
      let clients;
      
      if (search) {
        clients = await storage.searchClients(search as string);
      } else {
        clients = await storage.getAllClients();
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
      const validatedData = insertClientSchema.parse(req.body);
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
      const validatedData = insertClientSchema.partial().parse(req.body);
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

  // Caregiver routes
  app.get("/api/caregivers", isAuthenticated, async (req, res) => {
    try {
      const caregivers = await storage.getAllCaregivers();
      res.json(caregivers);
    } catch (error) {
      console.error("Error fetching caregivers:", error);
      res.status(500).json({ message: "Failed to fetch caregivers" });
    }
  });

  app.post("/api/caregivers", isAuthenticated, async (req: any, res) => {
    try {
      // Extract user info from the request body
      const { email, firstName, middleName, lastName, dateOfBirth, ...caregiverData } = req.body;
      
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
        ...caregiverData,
        userId: user.id
      });
      
      const caregiver = await storage.createCaregiver(validatedCaregiverData);
      
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
          userDateOfBirth: dateOfBirth
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
      const messages = await storage.getMessagesByUser(req.user.claims.sub);
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
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(400).json({ message: "Failed to create message" });
    }
  });

  app.put("/api/messages/:id/read", isAuthenticated, async (req, res) => {
    try {
      await storage.markMessageAsRead(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Failed to mark message as read" });
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

  // User management routes (admin and supervisor only)
  const requireAdminOrSupervisor = async (req: any, res: any, next: any) => {
    try {
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      if (!user || (user.role !== "admin" && user.role !== "supervisor")) {
        return res.status(403).json({ message: "Access denied. Admin or supervisor role required." });
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
      
      // Only allow updating certain fields for self-profile
      const allowedFields = { 
        firstName: true, 
        lastName: true, 
        profileImageUrl: true 
      };
      
      const sanitizedData: any = {};
      Object.keys(req.body).forEach(key => {
        if (allowedFields[key as keyof typeof allowedFields]) {
          sanitizedData[key] = req.body[key];
        }
      });
      
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

  const httpServer = createServer(app);
  return httpServer;
}
