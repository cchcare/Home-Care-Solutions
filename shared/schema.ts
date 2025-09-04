import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  pgEnum,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum - keeping base roles for system functionality
export const roleEnum = pgEnum("role", ["super_admin", "admin", "office_admin", "supervisor", "caregiver", "family", "custom"]);

// Office/Location management
export const offices = pgTable("offices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  address: text("address"),
  phone: varchar("phone"),
  email: varchar("email"),
  managerUserId: varchar("manager_user_id"),
  timezone: varchar("timezone").default("America/New_York"),
  isActive: boolean("is_active").default(true),
  settings: jsonb("settings"), // office-specific configuration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  middleName: varchar("middle_name"),
  lastName: varchar("last_name"),
  dateOfBirth: timestamp("date_of_birth"),
  profileImageUrl: varchar("profile_image_url"),
  role: roleEnum("role").default("caregiver"),
  primaryOfficeId: varchar("primary_office_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client management
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  dateOfBirth: timestamp("date_of_birth"),
  phone: varchar("phone"),
  address: text("address"),
  emergencyContactName: varchar("emergency_contact_name"),
  emergencyContactPhone: varchar("emergency_contact_phone"),
  emergencyContactRelation: varchar("emergency_contact_relation"),
  primaryDiagnosis: text("primary_diagnosis"),
  allergies: text("allergies"),
  medications: text("medications"),
  primaryPhysician: varchar("primary_physician"),
  primaryCaregiverId: varchar("primary_caregiver_id"),
  officeId: varchar("office_id").references(() => offices.id),
  status: varchar("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Caregiver management
export const caregivers = pgTable("caregivers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  employeeId: varchar("employee_id").unique(),
  hireDate: timestamp("hire_date"),
  startDate: timestamp("start_date"),
  experienceYears: integer("experience_years"),
  hourlyWage: numeric("hourly_wage", { precision: 10, scale: 2 }),
  specializations: text("specializations").array(),
  officeId: varchar("office_id").references(() => offices.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Certifications and training
export const certifications = pgTable("certifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id),
  certificationType: varchar("certification_type").notNull(),
  issueDate: timestamp("issue_date"),
  expirationDate: timestamp("expiration_date"),
  issuingOrganization: varchar("issuing_organization"),
  certificateNumber: varchar("certificate_number"),
  status: varchar("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Care plans
export const carePlans = pgTable("care_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id),
  createdBy: varchar("created_by").references(() => users.id),
  title: varchar("title").notNull(),
  description: text("description"),
  goals: text("goals").array(),
  interventions: text("interventions").array(),
  status: varchar("status").default("active"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  nextAssessmentDate: timestamp("next_assessment_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Progress notes
export const progressNotes = pgTable("progress_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id),
  visitDate: timestamp("visit_date"),
  visitDuration: integer("visit_duration"), // in minutes
  notes: text("notes").notNull(),
  vitals: jsonb("vitals"), // blood pressure, temperature, etc.
  servicesProvided: text("services_provided").array(),
  clientCondition: varchar("client_condition"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Document storage
export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  fileName: varchar("file_name").notNull(),
  originalName: varchar("original_name").notNull(),
  fileType: varchar("file_type"),
  fileSize: integer("file_size"),
  documentType: varchar("document_type"), // insurance_card, id_card, care_plan, etc.
  isSignatureRequired: boolean("is_signature_required").default(false),
  isSigned: boolean("is_signed").default(false),
  signedBy: varchar("signed_by").references(() => users.id),
  signedAt: timestamp("signed_at"),
  encryptionKey: varchar("encryption_key"), // for HIPAA compliance
  createdAt: timestamp("created_at").defaultNow(),
});

// Incident reports
export const incidentReports = pgTable("incident_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: varchar("entity_type").notNull(), // client, caregiver, staff
  entityId: varchar("entity_id").notNull(), // ID of the affected person
  clientId: varchar("client_id").references(() => clients.id), // For client incidents or incidents involving clients
  caregiverId: varchar("caregiver_id").references(() => caregivers.id), // For caregiver incidents
  reportedBy: varchar("reported_by").references(() => users.id),
  incidentDate: timestamp("incident_date").notNull(),
  incidentType: varchar("incident_type").notNull(), // fall, medication_error, injury, behavioral, etc.
  incidentCategory: varchar("incident_category").notNull(), // safety, medical, behavioral, environmental
  location: varchar("location"), // where the incident occurred
  description: text("description").notNull(),
  injuries: text("injuries"), // description of any injuries
  witnessesPresent: boolean("witnesses_present").default(false),
  witnessNames: text("witness_names"), // comma-separated list of witnesses
  severity: varchar("severity").notNull(), // low, medium, high, critical
  immediateActions: text("immediate_actions"), // actions taken immediately
  actionsTaken: text("actions_taken"), // additional actions taken
  preventiveMeasures: text("preventive_measures"), // measures to prevent recurrence
  followUpRequired: boolean("follow_up_required").default(false),
  followUpDate: timestamp("follow_up_date"),
  followUpNotes: text("follow_up_notes"),
  notifiedFamily: boolean("notified_family").default(false),
  notifiedDoctor: boolean("notified_doctor").default(false),
  notifiedAgency: boolean("notified_agency").default(false),
  status: varchar("status").default("open"), // open, under_investigation, resolved, closed
  resolution: text("resolution"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tasks and workflows
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignedTo: varchar("assigned_to").references(() => users.id),
  createdBy: varchar("created_by").references(() => users.id),
  clientId: varchar("client_id").references(() => clients.id),
  title: varchar("title").notNull(),
  description: text("description"),
  priority: varchar("priority").default("medium"), // low, medium, high, critical
  dueDate: timestamp("due_date"),
  status: varchar("status").default("pending"), // pending, in_progress, completed, overdue
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Internal messaging
export const messageStatusEnum = pgEnum("message_status", ["unread", "read", "archived"]);

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").references(() => users.id),
  recipientId: varchar("recipient_id").references(() => users.id),
  subject: varchar("subject"),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  senderStatus: messageStatusEnum("sender_status").default("read"), // sender's view: read, archived
  recipientStatus: messageStatusEnum("recipient_status").default("unread"), // recipient's view: unread, read, archived
  messageType: varchar("message_type").default("message"), // message, announcement, alert
  priority: varchar("priority").default("normal"), // low, normal, high, urgent
  relatedClientId: varchar("related_client_id").references(() => clients.id),
  attachmentUrl: varchar("attachment_url"),
  parentMessageId: varchar("parent_message_id"), // for threaded conversations
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Compliance checklists
export const complianceItems = pgTable("compliance_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id),
  itemType: varchar("item_type").notNull(), // background_check, hipaa_training, cpr_cert, etc.
  status: varchar("status").default("pending"), // pending, compliant, expired, non_compliant
  dueDate: timestamp("due_date"),
  completedDate: timestamp("completed_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Family members
export const familyMembers = pgTable("family_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  relationshipType: varchar("relationship_type").notNull(), // spouse, child, parent, sibling, guardian, other
  isEmergencyContact: boolean("is_emergency_contact").default(false),
  isPrimaryContact: boolean("is_primary_contact").default(false),
  canReceiveUpdates: boolean("can_receive_updates").default(true),
  canUpdateClientInfo: boolean("can_update_client_info").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client-Family relationship
export const clientFamilyMembers = pgTable("client_family_members", {
  clientId: varchar("client_id").notNull().references(() => clients.id),
  familyMemberId: varchar("family_member_id").notNull().references(() => familyMembers.id),
  accessLevel: varchar("access_level").default("view_only"), // view_only, limited_edit, full_edit
  canViewCarePlans: boolean("can_view_care_plans").default(true),
  canViewProgressNotes: boolean("can_view_progress_notes").default(true),
  canViewDocuments: boolean("can_view_documents").default(false),
  canViewIncidentReports: boolean("can_view_incident_reports").default(true),
  canReceiveAlerts: boolean("can_receive_alerts").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Composite primary key ensures unique client-family member relationships
  pk: primaryKey({ columns: [table.clientId, table.familyMemberId] }),
}));

// Family portal updates/requests
export const familyUpdates = pgTable("family_updates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id),
  submittedBy: varchar("submitted_by").references(() => users.id), // family member user ID
  updateType: varchar("update_type").notNull(), // emergency_contact, preferences, medical_info, notes
  requestedChanges: jsonb("requested_changes").notNull(), // what they want to change
  currentValues: jsonb("current_values"), // current values for comparison
  status: varchar("status").default("pending"), // pending, approved, rejected, partially_approved
  reviewedBy: varchar("reviewed_by").references(() => users.id), // staff member who reviewed
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  appliedAt: timestamp("applied_at"), // when changes were actually applied
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit logs
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action").notNull(), // create, read, update, delete, login, logout
  entityType: varchar("entity_type"), // client, caregiver, document, etc.
  entityId: varchar("entity_id"),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const officesRelations = relations(offices, ({ one, many }) => ({
  manager: one(users, {
    fields: [offices.managerUserId],
    references: [users.id],
  }),
  users: many(users),
  clients: many(clients),
  caregivers: many(caregivers),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  primaryOffice: one(offices, {
    fields: [users.primaryOfficeId],
    references: [offices.id],
  }),
  caregivers: many(caregivers),
  createdCarePlans: many(carePlans),
  uploadedDocuments: many(documents),
  sentMessages: many(messages, { relationName: "sentMessages" }),
  receivedMessages: many(messages, { relationName: "receivedMessages" }),
  assignedTasks: many(tasks, { relationName: "assignedTasks" }),
  createdTasks: many(tasks, { relationName: "createdTasks" }),
  auditLogs: many(auditLogs),
  managedOffices: many(offices),
  familyMember: one(familyMembers),
  submittedFamilyUpdates: many(familyUpdates, { relationName: "submittedFamilyUpdates" }),
  reviewedFamilyUpdates: many(familyUpdates, { relationName: "reviewedFamilyUpdates" }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  primaryCaregiver: one(caregivers, {
    fields: [clients.primaryCaregiverId],
    references: [caregivers.id],
  }),
  office: one(offices, {
    fields: [clients.officeId],
    references: [offices.id],
  }),
  carePlans: many(carePlans),
  progressNotes: many(progressNotes),
  documents: many(documents),
  incidentReports: many(incidentReports),
  tasks: many(tasks),
  relatedMessages: many(messages),
  familyMembers: many(clientFamilyMembers),
  familyUpdates: many(familyUpdates),
}));

export const caregiversRelations = relations(caregivers, ({ one, many }) => ({
  user: one(users, {
    fields: [caregivers.userId],
    references: [users.id],
  }),
  office: one(offices, {
    fields: [caregivers.officeId],
    references: [offices.id],
  }),
  clients: many(clients),
  certifications: many(certifications),
  progressNotes: many(progressNotes),
  documents: many(documents),
  complianceItems: many(complianceItems),
  incidentReports: many(incidentReports),
}));

export const carePlansRelations = relations(carePlans, ({ one }) => ({
  client: one(clients, {
    fields: [carePlans.clientId],
    references: [clients.id],
  }),
  createdBy: one(users, {
    fields: [carePlans.createdBy],
    references: [users.id],
  }),
}));

export const progressNotesRelations = relations(progressNotes, ({ one }) => ({
  client: one(clients, {
    fields: [progressNotes.clientId],
    references: [clients.id],
  }),
  caregiver: one(caregivers, {
    fields: [progressNotes.caregiverId],
    references: [caregivers.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  client: one(clients, {
    fields: [documents.clientId],
    references: [clients.id],
  }),
  caregiver: one(caregivers, {
    fields: [documents.caregiverId],
    references: [caregivers.id],
  }),
  uploadedBy: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
  signedBy: one(users, {
    fields: [documents.signedBy],
    references: [users.id],
  }),
}));

export const incidentReportsRelations = relations(incidentReports, ({ one }) => ({
  client: one(clients, {
    fields: [incidentReports.clientId],
    references: [clients.id],
  }),
  caregiver: one(caregivers, {
    fields: [incidentReports.caregiverId],
    references: [caregivers.id],
  }),
  reportedBy: one(users, {
    fields: [incidentReports.reportedBy],
    references: [users.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  assignedTo: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
    relationName: "assignedTasks",
  }),
  createdBy: one(users, {
    fields: [tasks.createdBy],
    references: [users.id],
    relationName: "createdTasks",
  }),
  client: one(clients, {
    fields: [tasks.clientId],
    references: [clients.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sentMessages",
  }),
  recipient: one(users, {
    fields: [messages.recipientId],
    references: [users.id],
    relationName: "receivedMessages",
  }),
  relatedClient: one(clients, {
    fields: [messages.relatedClientId],
    references: [clients.id],
  }),
}));

export const certificationsRelations = relations(certifications, ({ one }) => ({
  caregiver: one(caregivers, {
    fields: [certifications.caregiverId],
    references: [caregivers.id],
  }),
}));

export const complianceItemsRelations = relations(complianceItems, ({ one }) => ({
  caregiver: one(caregivers, {
    fields: [complianceItems.caregiverId],
    references: [caregivers.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const familyMembersRelations = relations(familyMembers, ({ one, many }) => ({
  user: one(users, {
    fields: [familyMembers.userId],
    references: [users.id],
  }),
  clientRelationships: many(clientFamilyMembers),
}));

export const clientFamilyMembersRelations = relations(clientFamilyMembers, ({ one }) => ({
  client: one(clients, {
    fields: [clientFamilyMembers.clientId],
    references: [clients.id],
  }),
  familyMember: one(familyMembers, {
    fields: [clientFamilyMembers.familyMemberId],
    references: [familyMembers.id],
  }),
}));

export const familyUpdatesRelations = relations(familyUpdates, ({ one }) => ({
  client: one(clients, {
    fields: [familyUpdates.clientId],
    references: [clients.id],
  }),
  submittedBy: one(users, {
    fields: [familyUpdates.submittedBy],
    references: [users.id],
    relationName: "submittedFamilyUpdates",
  }),
  reviewedBy: one(users, {
    fields: [familyUpdates.reviewedBy],
    references: [users.id],
    relationName: "reviewedFamilyUpdates",
  }),
}));


// Training and certification management
export const trainingTypeEnum = pgEnum("training_type", ["orientation", "annual", "certification", "continuing_education", "safety", "hipaa", "other"]);
export const trainingStatusEnum = pgEnum("training_status", ["not_started", "in_progress", "completed", "expired", "failed"]);

export const trainings = pgTable("trainings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  trainingType: trainingTypeEnum("training_type").notNull(),
  durationHours: integer("duration_hours"),
  expirationMonths: integer("expiration_months"), // how many months until it expires
  isRequired: boolean("is_required").default(false),
  materialUrl: varchar("material_url"), // file path for training materials
  officeId: varchar("office_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const trainingRecords = pgTable("training_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caregiverId: varchar("caregiver_id").notNull(),
  trainingId: varchar("training_id").notNull(),
  status: trainingStatusEnum("status").default("not_started"),
  startDate: timestamp("start_date"),
  completionDate: timestamp("completion_date"),
  expirationDate: timestamp("expiration_date"),
  score: integer("score"), // percentage score for tests
  certificateUrl: varchar("certificate_url"), // file path for certificates
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enhanced file management
export const fileTypeEnum = pgEnum("file_type", ["document", "image", "video", "audio", "other"]);
export const fileCategoryEnum = pgEnum("file_category", ["client_document", "training_material", "certificate", "insurance", "identification", "care_plan", "medical_record", "other"]);

export const files = pgTable("files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileName: varchar("file_name").notNull(),
  originalName: varchar("original_name").notNull(),
  fileType: fileTypeEnum("file_type").notNull(),
  category: fileCategoryEnum("category").notNull(),
  filePath: varchar("file_path").notNull(), // object storage path
  fileSize: integer("file_size"), // in bytes
  mimeType: varchar("mime_type"),
  uploadedBy: varchar("uploaded_by").notNull(), // user ID
  relatedEntityType: varchar("related_entity_type"), // 'client', 'caregiver', 'training'
  relatedEntityId: varchar("related_entity_id"),
  officeId: varchar("office_id"),
  isConfidential: boolean("is_confidential").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


export const trainingsRelations = relations(trainings, ({ one, many }) => ({
  office: one(offices, {
    fields: [trainings.officeId],
    references: [offices.id],
  }),
  trainingRecords: many(trainingRecords),
}));

export const trainingRecordsRelations = relations(trainingRecords, ({ one }) => ({
  caregiver: one(caregivers, {
    fields: [trainingRecords.caregiverId],
    references: [caregivers.id],
  }),
  training: one(trainings, {
    fields: [trainingRecords.trainingId],
    references: [trainings.id],
  }),
}));

export const filesRelations = relations(files, ({ one }) => ({
  uploadedByUser: one(users, {
    fields: [files.uploadedBy],
    references: [users.id],
  }),
  office: one(offices, {
    fields: [files.officeId],
    references: [offices.id],
  }),
}));

// Schema types
export type Office = typeof offices.$inferSelect;
export type InsertOffice = typeof offices.$inferInsert;
export const insertOfficeSchema = createInsertSchema(offices);

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;
export const insertClientSchema = createInsertSchema(clients);

export type Caregiver = typeof caregivers.$inferSelect;
export type InsertCaregiver = typeof caregivers.$inferInsert;
export const insertCaregiverSchema = createInsertSchema(caregivers);

export type CarePlan = typeof carePlans.$inferSelect;
export type InsertCarePlan = typeof carePlans.$inferInsert;
export const insertCarePlanSchema = createInsertSchema(carePlans);

export type ProgressNote = typeof progressNotes.$inferSelect;
export type InsertProgressNote = typeof progressNotes.$inferInsert;
export const insertProgressNoteSchema = createInsertSchema(progressNotes);

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;
export const insertDocumentSchema = createInsertSchema(documents);

export type IncidentReport = typeof incidentReports.$inferSelect;
export type InsertIncidentReport = typeof incidentReports.$inferInsert;
export const insertIncidentReportSchema = createInsertSchema(incidentReports);

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;
export const insertTaskSchema = createInsertSchema(tasks);

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export const insertMessageSchema = createInsertSchema(messages);

export type Certification = typeof certifications.$inferSelect;
export type InsertCertification = typeof certifications.$inferInsert;
export const insertCertificationSchema = createInsertSchema(certifications);

export type ComplianceItem = typeof complianceItems.$inferSelect;
export type InsertComplianceItem = typeof complianceItems.$inferInsert;
export const insertComplianceItemSchema = createInsertSchema(complianceItems);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export const insertAuditLogSchema = createInsertSchema(auditLogs);


export type Training = typeof trainings.$inferSelect;
export type InsertTraining = typeof trainings.$inferInsert;
export const insertTrainingSchema = createInsertSchema(trainings);

export type TrainingRecord = typeof trainingRecords.$inferSelect;
export type InsertTrainingRecord = typeof trainingRecords.$inferInsert;
export const insertTrainingRecordSchema = createInsertSchema(trainingRecords);

export type File = typeof files.$inferSelect;
export type InsertFile = typeof files.$inferInsert;
export const insertFileSchema = createInsertSchema(files);

export const insertUserSchema = createInsertSchema(users);

export type FamilyMember = typeof familyMembers.$inferSelect;
export type InsertFamilyMember = typeof familyMembers.$inferInsert;
export const insertFamilyMemberSchema = createInsertSchema(familyMembers);

export type ClientFamilyMember = typeof clientFamilyMembers.$inferSelect;
export type InsertClientFamilyMember = typeof clientFamilyMembers.$inferInsert;
export const insertClientFamilyMemberSchema = createInsertSchema(clientFamilyMembers);

export type FamilyUpdate = typeof familyUpdates.$inferSelect;
export type InsertFamilyUpdate = typeof familyUpdates.$inferInsert;
export const insertFamilyUpdateSchema = createInsertSchema(familyUpdates);

// Custom Roles and Permissions System
export const customRoles = pgTable("custom_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  displayName: varchar("display_name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  officeId: varchar("office_id").references(() => offices.id), // office-specific roles
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const permissions = pgTable("permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  displayName: varchar("display_name").notNull(),
  description: text("description"),
  category: varchar("category").notNull(), // client_management, caregiver_management, etc.
  resource: varchar("resource").notNull(), // clients, caregivers, tasks, etc.
  action: varchar("action").notNull(), // create, read, update, delete, assign, etc.
  isSystemPermission: boolean("is_system_permission").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rolePermissions = pgTable("role_permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roleId: varchar("role_id").references(() => customRoles.id, { onDelete: "cascade" }),
  permissionId: varchar("permission_id").references(() => permissions.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userCustomRoles = pgTable("user_custom_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  roleId: varchar("role_id").references(() => customRoles.id, { onDelete: "cascade" }),
  assignedBy: varchar("assigned_by").references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
});

// Type exports for role and permission system
export type CustomRole = typeof customRoles.$inferSelect;
export type InsertCustomRole = typeof customRoles.$inferInsert;
export const insertCustomRoleSchema = createInsertSchema(customRoles);

export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = typeof permissions.$inferInsert;
export const insertPermissionSchema = createInsertSchema(permissions);

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;
export const insertRolePermissionSchema = createInsertSchema(rolePermissions);

export type UserCustomRole = typeof userCustomRoles.$inferSelect;
export type InsertUserCustomRole = typeof userCustomRoles.$inferInsert;
export const insertUserCustomRoleSchema = createInsertSchema(userCustomRoles);
