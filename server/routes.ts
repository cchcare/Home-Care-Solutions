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
  insertSampleSchema,
  insertTrainingSchema,
  insertTrainingRecordSchema,
  insertFileSchema,
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
      const validatedData = insertCaregiverSchema.parse(req.body);
      const caregiver = await storage.createCaregiver(validatedData);
      
      await storage.createAuditLog({
        userId: req.user.claims.sub,
        action: "create",
        entityType: "caregiver",
        entityId: caregiver.id,
        newValues: caregiver,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
      
      res.status(201).json(caregiver);
    } catch (error) {
      console.error("Error creating caregiver:", error);
      res.status(400).json({ message: "Failed to create caregiver" });
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

  // Sample management routes
  app.get("/api/samples", isAuthenticated, async (req, res) => {
    try {
      const samples = await storage.getAllSamples();
      res.json(samples);
    } catch (error) {
      console.error("Error fetching samples:", error);
      res.status(500).json({ message: "Failed to fetch samples" });
    }
  });

  app.post("/api/samples", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertSampleSchema.parse(req.body);
      const sample = await storage.createSample(validatedData);
      res.status(201).json(sample);
    } catch (error) {
      console.error("Error creating sample:", error);
      res.status(400).json({ message: "Failed to create sample" });
    }
  });

  app.get("/api/samples/:id", isAuthenticated, async (req, res) => {
    try {
      const sample = await storage.getSample(req.params.id);
      if (!sample) {
        return res.status(404).json({ message: "Sample not found" });
      }
      res.json(sample);
    } catch (error) {
      console.error("Error fetching sample:", error);
      res.status(500).json({ message: "Failed to fetch sample" });
    }
  });

  app.put("/api/samples/:id", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertSampleSchema.parse(req.body);
      const sample = await storage.updateSample(req.params.id, validatedData);
      res.json(sample);
    } catch (error) {
      console.error("Error updating sample:", error);
      res.status(400).json({ message: "Failed to update sample" });
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

  const httpServer = createServer(app);
  return httpServer;
}
