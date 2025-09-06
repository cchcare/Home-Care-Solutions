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
          
          // Validate the data
          const validatedData = insertClientSchema.parse(clientData);
          
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
      // Extract user info and client assignments from the request body
      const { email, firstName, middleName, lastName, dateOfBirth, clientIds, ...caregiverData } = req.body;
      
      // Convert date strings to Date objects if they're strings
      const processedDateOfBirth = dateOfBirth && typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth;
      const processedHireDate = caregiverData.hireDate && typeof caregiverData.hireDate === 'string' ? new Date(caregiverData.hireDate) : caregiverData.hireDate;
      const processedStartDate = caregiverData.startDate && typeof caregiverData.startDate === 'string' ? new Date(caregiverData.startDate) : caregiverData.startDate;
      
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
      
      // Only allow updating certain fields for self-profile
      const allowedFields = new Set(['firstName', 'lastName', 'profileImageUrl']);
      
      const sanitizedData: any = {};
      Object.keys(req.body).forEach(key => {
        // Prevent prototype pollution by blocking dangerous keys
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          return;
        }
        if (allowedFields.has(key)) {
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

  const httpServer = createServer(app);
  return httpServer;
}
