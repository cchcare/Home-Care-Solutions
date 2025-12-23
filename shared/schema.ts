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

// Gender enum for caregivers and clients
export const genderEnum = pgEnum("gender", ["male", "female", "non_binary", "prefer_not_to_say"]);

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
  mcoId: varchar("mco_id"),
  status: varchar("status").default("active"),
  serviceStartDate: timestamp("service_start_date"),
  coordinatorId: varchar("coordinator_id").references(() => users.id),
  memberId: varchar("member_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Caregiver management
export const caregivers = pgTable("caregivers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  employeeId: varchar("employee_id").unique(),
  gender: genderEnum("gender"),
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
export const communicationTypeEnum = pgEnum("communication_type", ["internal", "email", "sms"]);
export const deliveryStatusEnum = pgEnum("delivery_status", ["pending", "sent", "delivered", "failed", "bounced"]);

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").references(() => users.id),
  recipientId: varchar("recipient_id").references(() => users.id), // nullable for external communications
  subject: varchar("subject"),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  senderStatus: messageStatusEnum("sender_status").default("read"), // sender's view: read, archived
  recipientStatus: messageStatusEnum("recipient_status").default("unread"), // recipient's view: unread, read, archived
  messageType: varchar("message_type").default("message"), // message, announcement, alert
  priority: varchar("priority").default("normal"), // low, normal, high, urgent
  communicationType: communicationTypeEnum("communication_type").default("internal"), // internal, email, sms
  recipientEmail: varchar("recipient_email"), // for email communications
  recipientPhone: varchar("recipient_phone"), // for SMS communications
  deliveryStatus: deliveryStatusEnum("delivery_status").default("pending"), // for email/SMS tracking
  deliveryAttempts: integer("delivery_attempts").default(0),
  lastDeliveryAttempt: timestamp("last_delivery_attempt"),
  externalId: varchar("external_id"), // SendGrid message ID or Twilio SID
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

// Client-Caregiver assignment relationship
export const clientCaregiverAssignments = pgTable("client_caregiver_assignments", {
  clientId: varchar("client_id").notNull().references(() => clients.id),
  caregiverId: varchar("caregiver_id").notNull().references(() => caregivers.id),
  assignedDate: timestamp("assigned_date").defaultNow(),
  endDate: timestamp("end_date"),
  isPrimary: boolean("is_primary").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Composite primary key ensures unique client-caregiver relationships
  pk: primaryKey({ columns: [table.clientId, table.caregiverId] }),
}));

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
  caregiverAssignments: many(clientCaregiverAssignments),
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
  clientAssignments: many(clientCaregiverAssignments),
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

export const clientCaregiverAssignmentsRelations = relations(clientCaregiverAssignments, ({ one }) => ({
  client: one(clients, {
    fields: [clientCaregiverAssignments.clientId],
    references: [clients.id],
  }),
  caregiver: one(caregivers, {
    fields: [clientCaregiverAssignments.caregiverId],
    references: [caregivers.id],
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

export type ClientCaregiverAssignment = typeof clientCaregiverAssignments.$inferSelect;
export type InsertClientCaregiverAssignment = typeof clientCaregiverAssignments.$inferInsert;
export const insertClientCaregiverAssignmentSchema = createInsertSchema(clientCaregiverAssignments);

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

// Scheduling system
export const masterWeekTemplates = pgTable("master_week_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  clientId: varchar("client_id").references(() => clients.id),
  createdBy: varchar("created_by").references(() => users.id),
  startDate: timestamp("start_date"), // When to start applying this template
  endDate: timestamp("end_date"), // When to stop applying this template
  isActive: boolean("is_active").default(true),
  autoRollover: boolean("auto_rollover").default(false), // Automatic midnight updates
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const masterWeekSlots = pgTable("master_week_slots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").references(() => masterWeekTemplates.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, etc.
  startTime: varchar("start_time").notNull(), // HH:MM format
  endTime: varchar("end_time").notNull(), // HH:MM format
  caregiverId: varchar("caregiver_id").references(() => caregivers.id),
  serviceType: varchar("service_type"), // Personal care, medication reminder, etc.
  notes: text("notes"),
  isRecurring: boolean("is_recurring").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clientSchedules = pgTable("client_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id),
  scheduledDate: timestamp("scheduled_date").notNull(),
  startTime: varchar("start_time").notNull(), // HH:MM format
  endTime: varchar("end_time").notNull(), // HH:MM format
  serviceType: varchar("service_type"),
  status: varchar("status").default("scheduled"), // scheduled, in_progress, completed, cancelled
  notes: text("notes"),
  masterWeekSlotId: varchar("master_week_slot_id").references(() => masterWeekSlots.id), // Link to template if auto-generated
  createdBy: varchar("created_by").references(() => users.id),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const scheduleChangeLog = pgTable("schedule_change_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scheduleId: varchar("schedule_id").references(() => clientSchedules.id),
  changeType: varchar("change_type").notNull(), // created, updated, cancelled, completed
  oldValues: jsonb("old_values"), // Previous schedule data
  newValues: jsonb("new_values"), // New schedule data
  changedBy: varchar("changed_by").references(() => users.id),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Type exports for scheduling system
export type MasterWeekTemplate = typeof masterWeekTemplates.$inferSelect;
export type InsertMasterWeekTemplate = typeof masterWeekTemplates.$inferInsert;
export const insertMasterWeekTemplateSchema = createInsertSchema(masterWeekTemplates);

export type MasterWeekSlot = typeof masterWeekSlots.$inferSelect;
export type InsertMasterWeekSlot = typeof masterWeekSlots.$inferInsert;
export const insertMasterWeekSlotSchema = createInsertSchema(masterWeekSlots);

export type ClientSchedule = typeof clientSchedules.$inferSelect;
export type InsertClientSchedule = typeof clientSchedules.$inferInsert;
export const insertClientScheduleSchema = createInsertSchema(clientSchedules);

export type ScheduleChangeLog = typeof scheduleChangeLog.$inferSelect;
export type InsertScheduleChangeLog = typeof scheduleChangeLog.$inferInsert;
export const insertScheduleChangeLogSchema = createInsertSchema(scheduleChangeLog);

// AI Issue Detection System
export const aiIssueSeverityEnum = pgEnum("ai_issue_severity", ["low", "medium", "high", "critical"]);
export const aiIssueStatusEnum = pgEnum("ai_issue_status", ["open", "in_progress", "resolved", "dismissed"]);
export const aiIssueCategoryEnum = pgEnum("ai_issue_category", [
  "compliance", 
  "data_quality", 
  "scheduling", 
  "certification", 
  "documentation", 
  "incident_pattern",
  "care_plan",
  "other"
]);

export const aiDetectedIssues = pgTable("ai_detected_issues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: aiIssueCategoryEnum("category").notNull(),
  severity: aiIssueSeverityEnum("severity").notNull(),
  status: aiIssueStatusEnum("status").default("open"),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  affectedEntityType: varchar("affected_entity_type"), // client, caregiver, task, etc.
  affectedEntityId: varchar("affected_entity_id"),
  suggestedAction: text("suggested_action"),
  autoFixAvailable: boolean("auto_fix_available").default(false),
  autoFixApplied: boolean("auto_fix_applied").default(false),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  resolutionNotes: text("resolution_notes"),
  aiConfidence: numeric("ai_confidence", { precision: 5, scale: 2 }), // 0-100
  rawAiResponse: jsonb("raw_ai_response"), // store full AI response for audit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Type exports for AI issues
export type AiDetectedIssue = typeof aiDetectedIssues.$inferSelect;
export type InsertAiDetectedIssue = typeof aiDetectedIssues.$inferInsert;
export const insertAiDetectedIssueSchema = createInsertSchema(aiDetectedIssues);

// EVV (Electronic Visit Verification) Data Tracking
export const evvData = pgTable("evv_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  mco: varchar("mco").notNull(), // Managed Care Organization name
  percentage: numeric("percentage", { precision: 5, scale: 2 }).notNull(), // EVV compliance percentage
  totalVisits: integer("total_visits"), // Total scheduled visits
  evvCompliantVisits: integer("evv_compliant_visits"), // Visits with proper EVV
  notes: text("notes"),
  officeId: varchar("office_id").references(() => offices.id),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const evvDataRelations = relations(evvData, ({ one }) => ({
  office: one(offices, {
    fields: [evvData.officeId],
    references: [offices.id],
  }),
  createdByUser: one(users, {
    fields: [evvData.createdBy],
    references: [users.id],
  }),
}));

// Type exports for EVV data
export type EvvData = typeof evvData.$inferSelect;
export type InsertEvvData = typeof evvData.$inferInsert;
export const insertEvvDataSchema = createInsertSchema(evvData);

// ==================== ADMIN SETTINGS TABLES ====================

// MCO Types - Categories of Managed Care Organizations
export const mcoTypes = pgTable("mco_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const mcoTypesRelations = relations(mcoTypes, ({ many }) => ({
  mcos: many(mcos),
}));

// MCOs - Managed Care Organizations for billing
export const mcos = pgTable("mcos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  typeId: varchar("type_id").references(() => mcoTypes.id),
  payerId: varchar("payer_id"),
  contactName: varchar("contact_name"),
  contactEmail: varchar("contact_email"),
  contactPhone: varchar("contact_phone"),
  address: text("address"),
  billingRequirements: text("billing_requirements"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const mcosRelations = relations(mcos, ({ one }) => ({
  type: one(mcoTypes, {
    fields: [mcos.typeId],
    references: [mcoTypes.id],
  }),
}));

// System Settings - Key/value configuration
export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").notNull().unique(),
  value: jsonb("value"),
  description: text("description"),
  scope: varchar("scope").default("global"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Entity Field Configurations - Customizable fields for clients/caregivers
export const entityTypeEnum = pgEnum("entity_type", ["client", "caregiver"]);
export const fieldTypeEnum = pgEnum("field_type", ["text", "number", "date", "select", "boolean", "textarea"]);

export const entityFieldConfigs = pgTable("entity_field_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: entityTypeEnum("entity_type").notNull(),
  fieldKey: varchar("field_key").notNull(),
  label: varchar("label").notNull(),
  fieldType: fieldTypeEnum("field_type").notNull(),
  isRequired: boolean("is_required").default(false),
  isEnabled: boolean("is_enabled").default(true),
  displayOrder: integer("display_order").default(0),
  options: jsonb("options"),
  validationRules: jsonb("validation_rules"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client Communications - Messages between office and client
export const clientCommunications = pgTable("client_communications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  officeId: varchar("office_id").references(() => offices.id),
  authorUserId: varchar("author_user_id").references(() => users.id),
  message: text("message").notNull(),
  communicationType: varchar("communication_type").default("note"), // note, call, email, visit
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const clientCommunicationsRelations = relations(clientCommunications, ({ one }) => ({
  client: one(clients, {
    fields: [clientCommunications.clientId],
    references: [clients.id],
  }),
  office: one(offices, {
    fields: [clientCommunications.officeId],
    references: [offices.id],
  }),
  author: one(users, {
    fields: [clientCommunications.authorUserId],
    references: [users.id],
  }),
}));

// Office MCO Billing Rates - Rates set by MCO at office level
export const officeMcoBillingRates = pgTable("office_mco_billing_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  officeId: varchar("office_id").references(() => offices.id).notNull(),
  mcoId: varchar("mco_id").references(() => mcos.id).notNull(),
  serviceCode: varchar("service_code").notNull(),
  serviceName: varchar("service_name"),
  rate: numeric("rate", { precision: 10, scale: 2 }).notNull(),
  rateType: varchar("rate_type").default("hourly"), // hourly, per_visit, daily
  effectiveFrom: timestamp("effective_from"),
  effectiveTo: timestamp("effective_to"),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const officeMcoBillingRatesRelations = relations(officeMcoBillingRates, ({ one }) => ({
  office: one(offices, {
    fields: [officeMcoBillingRates.officeId],
    references: [offices.id],
  }),
  mco: one(mcos, {
    fields: [officeMcoBillingRates.mcoId],
    references: [mcos.id],
  }),
}));

// Type exports for Client Communications
export type ClientCommunication = typeof clientCommunications.$inferSelect;
export type InsertClientCommunication = typeof clientCommunications.$inferInsert;
export const insertClientCommunicationSchema = createInsertSchema(clientCommunications).omit({ id: true, createdAt: true, updatedAt: true });

// Type exports for Office MCO Billing Rates
export type OfficeMcoBillingRate = typeof officeMcoBillingRates.$inferSelect;
export type InsertOfficeMcoBillingRate = typeof officeMcoBillingRates.$inferInsert;
export const insertOfficeMcoBillingRateSchema = createInsertSchema(officeMcoBillingRates).omit({ id: true, createdAt: true, updatedAt: true });

// Type exports for MCO Types
export type McoType = typeof mcoTypes.$inferSelect;
export type InsertMcoType = typeof mcoTypes.$inferInsert;
export const insertMcoTypeSchema = createInsertSchema(mcoTypes).omit({ id: true, createdAt: true, updatedAt: true });

// Type exports for MCOs
export type Mco = typeof mcos.$inferSelect;
export type InsertMco = typeof mcos.$inferInsert;
export const insertMcoSchema = createInsertSchema(mcos).omit({ id: true, createdAt: true, updatedAt: true });

// Type exports for System Settings
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;
export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({ id: true, createdAt: true, updatedAt: true });

// Type exports for Entity Field Configs
export type EntityFieldConfig = typeof entityFieldConfigs.$inferSelect;
export type InsertEntityFieldConfig = typeof entityFieldConfigs.$inferInsert;
export const insertEntityFieldConfigSchema = createInsertSchema(entityFieldConfigs).omit({ id: true, createdAt: true, updatedAt: true });

// ==================== BILLING & PAYROLL TABLES ====================

// Payroll frequency enum
export const payrollFrequencyEnum = pgEnum("payroll_frequency", ["weekly", "biweekly", "semi_monthly", "monthly"]);
export const payrollStatusEnum = pgEnum("payroll_status", ["draft", "approved", "paid", "cancelled"]);
export const billingStatusEnum = pgEnum("billing_status", ["pending", "invoiced", "paid", "overdue", "cancelled"]);

// Office Payroll Configuration - Admin sets payroll dates per office
export const officePayrollConfigs = pgTable("office_payroll_configs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  officeId: varchar("office_id").references(() => offices.id).notNull().unique(),
  payrollFrequency: payrollFrequencyEnum("payroll_frequency").default("biweekly"),
  defaultPaycheckDay: integer("default_paycheck_day"), // Day of month (1-31) or day of week (0-6)
  customPayrollDates: jsonb("custom_payroll_dates"), // Array of specific dates for the year
  companyName: varchar("company_name"),
  companyLogo: varchar("company_logo"), // URL to logo
  lastGeneratedAt: timestamp("last_generated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const officePayrollConfigsRelations = relations(officePayrollConfigs, ({ one }) => ({
  office: one(offices, {
    fields: [officePayrollConfigs.officeId],
    references: [offices.id],
  }),
}));

// Payroll Runs - Each payroll cycle
export const payrollRuns = pgTable("payroll_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  officeId: varchar("office_id").references(() => offices.id).notNull(),
  payPeriodStart: timestamp("pay_period_start").notNull(),
  payPeriodEnd: timestamp("pay_period_end").notNull(),
  paycheckDate: timestamp("paycheck_date").notNull(),
  status: payrollStatusEnum("status").default("draft"),
  totalGross: numeric("total_gross", { precision: 12, scale: 2 }).default("0"),
  totalDeductions: numeric("total_deductions", { precision: 12, scale: 2 }).default("0"),
  totalNet: numeric("total_net", { precision: 12, scale: 2 }).default("0"),
  employeeCount: integer("employee_count").default(0),
  notes: text("notes"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const payrollRunsRelations = relations(payrollRuns, ({ one, many }) => ({
  office: one(offices, {
    fields: [payrollRuns.officeId],
    references: [offices.id],
  }),
  approvedByUser: one(users, {
    fields: [payrollRuns.approvedBy],
    references: [users.id],
  }),
  lineItems: many(payrollLineItems),
}));

// Payroll Line Items - Individual caregiver payments
export const payrollLineItems = pgTable("payroll_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  payrollRunId: varchar("payroll_run_id").references(() => payrollRuns.id).notNull(),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id).notNull(),
  hoursWorked: numeric("hours_worked", { precision: 8, scale: 2 }).default("0"),
  hourlyRate: numeric("hourly_rate", { precision: 8, scale: 2 }),
  grossPay: numeric("gross_pay", { precision: 10, scale: 2 }).default("0"),
  deductions: jsonb("deductions"), // {tax: X, insurance: Y, etc}
  netPay: numeric("net_pay", { precision: 10, scale: 2 }).default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payrollLineItemsRelations = relations(payrollLineItems, ({ one }) => ({
  payrollRun: one(payrollRuns, {
    fields: [payrollLineItems.payrollRunId],
    references: [payrollRuns.id],
  }),
  caregiver: one(caregivers, {
    fields: [payrollLineItems.caregiverId],
    references: [caregivers.id],
  }),
}));

// Billing Records - Track invoices and payments
export const billingRecords = pgTable("billing_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  officeId: varchar("office_id").references(() => offices.id).notNull(),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id),
  mcoId: varchar("mco_id").references(() => mcos.id),
  invoiceNumber: varchar("invoice_number"),
  servicePeriodStart: timestamp("service_period_start").notNull(),
  servicePeriodEnd: timestamp("service_period_end").notNull(),
  serviceCode: varchar("service_code"),
  hoursOrUnits: numeric("hours_or_units", { precision: 8, scale: 2 }),
  rate: numeric("rate", { precision: 10, scale: 2 }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: billingStatusEnum("status").default("pending"),
  invoicedAt: timestamp("invoiced_at"),
  paidAt: timestamp("paid_at"),
  dueDate: timestamp("due_date"),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const billingRecordsRelations = relations(billingRecords, ({ one }) => ({
  office: one(offices, {
    fields: [billingRecords.officeId],
    references: [offices.id],
  }),
  client: one(clients, {
    fields: [billingRecords.clientId],
    references: [clients.id],
  }),
  caregiver: one(caregivers, {
    fields: [billingRecords.caregiverId],
    references: [caregivers.id],
  }),
  mco: one(mcos, {
    fields: [billingRecords.mcoId],
    references: [mcos.id],
  }),
}));

// ==================== PA SURVEY CHECKLIST TABLES ====================

// PA Survey Checklist Items - Master template of required items
export const paSurveyChecklistItems = pgTable("pa_survey_checklist_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  section: varchar("section").notNull(), // e.g., "Personnel", "Client Care", "Documentation"
  title: varchar("title").notNull(),
  description: text("description"),
  regulationRef: varchar("regulation_ref"), // PA regulation reference number
  sortOrder: integer("sort_order").default(0),
  isRequired: boolean("is_required").default(true),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// PA Survey status enum
export const paSurveyStatusEnum = pgEnum("pa_survey_status", ["not_started", "in_progress", "complete", "not_applicable"]);

// Office PA Survey Statuses - Per-office tracking of checklist completion
export const officePaSurveyStatuses = pgTable("office_pa_survey_statuses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  officeId: varchar("office_id").references(() => offices.id).notNull(),
  checklistItemId: varchar("checklist_item_id").references(() => paSurveyChecklistItems.id).notNull(),
  status: paSurveyStatusEnum("status").default("not_started"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  completedBy: varchar("completed_by").references(() => users.id),
  notes: text("notes"),
  documentIds: jsonb("document_ids"), // Array of related document IDs
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const officePaSurveyStatusesRelations = relations(officePaSurveyStatuses, ({ one }) => ({
  office: one(offices, {
    fields: [officePaSurveyStatuses.officeId],
    references: [offices.id],
  }),
  checklistItem: one(paSurveyChecklistItems, {
    fields: [officePaSurveyStatuses.checklistItemId],
    references: [paSurveyChecklistItems.id],
  }),
  assignedToUser: one(users, {
    fields: [officePaSurveyStatuses.assignedTo],
    references: [users.id],
  }),
}));

// Type exports for Payroll
export type OfficePayrollConfig = typeof officePayrollConfigs.$inferSelect;
export type InsertOfficePayrollConfig = typeof officePayrollConfigs.$inferInsert;
export const insertOfficePayrollConfigSchema = createInsertSchema(officePayrollConfigs).omit({ id: true, createdAt: true, updatedAt: true });

export type PayrollRun = typeof payrollRuns.$inferSelect;
export type InsertPayrollRun = typeof payrollRuns.$inferInsert;
export const insertPayrollRunSchema = createInsertSchema(payrollRuns).omit({ id: true, createdAt: true, updatedAt: true });

export type PayrollLineItem = typeof payrollLineItems.$inferSelect;
export type InsertPayrollLineItem = typeof payrollLineItems.$inferInsert;
export const insertPayrollLineItemSchema = createInsertSchema(payrollLineItems).omit({ id: true, createdAt: true });

export type BillingRecord = typeof billingRecords.$inferSelect;
export type InsertBillingRecord = typeof billingRecords.$inferInsert;
export const insertBillingRecordSchema = createInsertSchema(billingRecords).omit({ id: true, createdAt: true, updatedAt: true });

// Type exports for PA Survey
export type PaSurveyChecklistItem = typeof paSurveyChecklistItems.$inferSelect;
export type InsertPaSurveyChecklistItem = typeof paSurveyChecklistItems.$inferInsert;
export const insertPaSurveyChecklistItemSchema = createInsertSchema(paSurveyChecklistItems).omit({ id: true, createdAt: true, updatedAt: true });

export type OfficePaSurveyStatus = typeof officePaSurveyStatuses.$inferSelect;
export type InsertOfficePaSurveyStatus = typeof officePaSurveyStatuses.$inferInsert;
export const insertOfficePaSurveyStatusSchema = createInsertSchema(officePaSurveyStatuses).omit({ id: true, createdAt: true, updatedAt: true });
