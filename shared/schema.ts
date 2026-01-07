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
  organizationId: varchar("organization_id"),
  name: varchar("name").notNull(),
  address: text("address"),
  city: varchar("city"),
  state: varchar("state"),
  zipCode: varchar("zip_code"),
  phone: varchar("phone"),
  email: varchar("email"),
  website: varchar("website"),
  logoFileName: varchar("logo_file_name"),
  managerUserId: varchar("manager_user_id"),
  timezone: varchar("timezone").default("America/New_York"),
  isActive: boolean("is_active").default(true),
  settings: jsonb("settings"), // office-specific configuration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_offices_organization").on(table.organizationId),
]);

// Coordinators reference table - shared between caregivers and clients
export const coordinators = pgTable("coordinators", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  officeId: varchar("office_id").references(() => offices.id),
  title: varchar("title"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id"),
  email: varchar("email"),
  username: varchar("username").unique(),
  passwordHash: varchar("password_hash"),
  mustResetPassword: boolean("must_reset_password").default(false),
  lastLoginAt: timestamp("last_login_at"),
  resetToken: varchar("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  firstName: varchar("first_name"),
  middleName: varchar("middle_name"),
  lastName: varchar("last_name"),
  dateOfBirth: timestamp("date_of_birth"),
  profileImageUrl: varchar("profile_image_url"),
  role: roleEnum("role").default("caregiver"),
  primaryOfficeId: varchar("primary_office_id"),
  address: text("address"),
  address2: varchar("address_2"),
  city: varchar("city"),
  state: varchar("state"),
  zipCode: varchar("zip_code"),
  isActive: boolean("is_active").default(true),
  // Mobile SMS login fields
  mobilePhone: varchar("mobile_phone"),
  mobileVerified: boolean("mobile_verified").default(false),
  smsVerificationCode: varchar("sms_verification_code"),
  smsCodeExpiry: timestamp("sms_code_expiry"),
  // Google OAuth linking
  googleId: varchar("google_id"),
  googleLinkedAt: timestamp("google_linked_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_users_organization").on(table.organizationId),
  index("idx_users_google_id").on(table.googleId),
]);

// Client management
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  dateOfBirth: timestamp("date_of_birth"),
  phone: varchar("phone"),
  email: varchar("email"),
  address: text("address"),
  address2: varchar("address_2"),
  city: varchar("city"),
  state: varchar("state"),
  zipCode: varchar("zip_code"),
  hhaxAdmissionId: varchar("hhax_admission_id").unique(),
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
  lastServiceDate: timestamp("last_service_date"),
  coordinatorId: varchar("coordinator_id").references(() => coordinators.id),
  memberId: varchar("member_id"),
  // SNAP (Supplemental Nutrition Assistance Program) tracking
  snapRenewalDate: timestamp("snap_renewal_date"),
  snapExpiryDate: timestamp("snap_expiry_date"),
  snapStatus: varchar("snap_status").default("unknown"), // active, pending, expired, not_enrolled, unknown
  snapNotes: text("snap_notes"),
  // Medicaid tracking
  medicaidRenewalDate: timestamp("medicaid_renewal_date"),
  medicaidExpiryDate: timestamp("medicaid_expiry_date"),
  medicaidStatus: varchar("medicaid_status").default("unknown"), // active, pending, expired, not_enrolled, unknown
  medicaidNotes: text("medicaid_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Caregiver management
export const caregivers = pgTable("caregivers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  firstName: varchar("first_name"),
  middleName: varchar("middle_name"),
  lastName: varchar("last_name"),
  dateOfBirth: timestamp("date_of_birth"),
  email: varchar("email"),
  phone: varchar("phone"),
  employeeId: varchar("employee_id").unique(),
  assignmentId: varchar("assignment_id").unique(), // External assignment ID for billing import matching
  gender: genderEnum("gender"),
  hireDate: timestamp("hire_date"),
  startDate: timestamp("start_date"),
  experienceYears: integer("experience_years"),
  hourlyWage: numeric("hourly_wage", { precision: 10, scale: 2 }),
  specializations: text("specializations").array(),
  officeId: varchar("office_id").references(() => offices.id),
  coordinatorId: varchar("coordinator_id").references(() => coordinators.id),
  mcoId: varchar("mco_id"),
  address: text("address"),
  address2: varchar("address_2"),
  city: varchar("city"),
  state: varchar("state"),
  zipCode: varchar("zip_code"),
  county: varchar("county"),
  hhaxCaregiverCode: varchar("hhax_caregiver_code").unique(),
  adpCode: varchar("adp_code"),
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

// Care plan goals - structured goals for care plans
export const carePlanGoalPriorityEnum = pgEnum("care_plan_goal_priority", ["high", "medium", "low"]);
export const carePlanGoalStatusEnum = pgEnum("care_plan_goal_status", ["active", "achieved", "discontinued"]);

export const carePlanGoals = pgTable("care_plan_goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  carePlanId: varchar("care_plan_id").references(() => carePlans.id, { onDelete: "cascade" }).notNull(),
  goalText: text("goal_text").notNull(),
  targetDate: timestamp("target_date"),
  priority: carePlanGoalPriorityEnum("priority").default("medium"),
  status: carePlanGoalStatusEnum("status").default("active"),
  progressNotes: text("progress_notes"),
  achievedDate: timestamp("achieved_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Care plan interventions - structured interventions for care plans
export const carePlanInterventionFrequencyEnum = pgEnum("care_plan_intervention_frequency", ["daily", "weekly", "monthly", "as_needed"]);
export const carePlanInterventionAssignedToTypeEnum = pgEnum("care_plan_intervention_assigned_to_type", ["caregiver", "nurse", "therapist"]);
export const carePlanInterventionStatusEnum = pgEnum("care_plan_intervention_status", ["active", "paused", "completed", "discontinued"]);

export const carePlanInterventions = pgTable("care_plan_interventions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  carePlanId: varchar("care_plan_id").references(() => carePlans.id, { onDelete: "cascade" }).notNull(),
  interventionText: text("intervention_text").notNull(),
  frequency: carePlanInterventionFrequencyEnum("frequency").default("daily"),
  assignedToType: carePlanInterventionAssignedToTypeEnum("assigned_to_type"),
  assignedToId: varchar("assigned_to_id"),
  status: carePlanInterventionStatusEnum("status").default("active"),
  lastPerformedAt: timestamp("last_performed_at"),
  createdAt: timestamp("created_at").defaultNow(),
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
  userId: varchar("user_id").references(() => users.id), // For staff/user documents
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  officeId: varchar("office_id").references(() => offices.id),
  fileName: varchar("file_name").notNull(),
  originalName: varchar("original_name").notNull(),
  fileType: varchar("file_type"),
  fileSize: integer("file_size"),
  documentType: varchar("document_type"), // insurance_card, id_card, care_plan, letter_template, etc.
  templateId: varchar("template_id"), // Reference to letter template if generated from template
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
  officeId: varchar("office_id").references(() => offices.id),
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

// Incident Follow-ups - action items and resolution tracking for incidents
export const incidentFollowUpPriorityEnum = pgEnum("incident_follow_up_priority", ["high", "medium", "low"]);
export const incidentFollowUpStatusEnum = pgEnum("incident_follow_up_status", ["pending", "in_progress", "completed", "overdue"]);

export const incidentFollowUps = pgTable("incident_follow_ups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  incidentId: varchar("incident_id").references(() => incidentReports.id).notNull(),
  actionRequired: text("action_required").notNull(),
  assignedToId: varchar("assigned_to_id").references(() => users.id),
  dueDate: timestamp("due_date"),
  priority: incidentFollowUpPriorityEnum("priority").default("medium"),
  status: incidentFollowUpStatusEnum("status").default("pending"),
  completedAt: timestamp("completed_at"),
  completedBy: varchar("completed_by").references(() => users.id),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tasks and workflows
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignedTo: varchar("assigned_to").references(() => users.id),
  createdBy: varchar("created_by").references(() => users.id),
  clientId: varchar("client_id").references(() => clients.id),
  officeId: varchar("office_id").references(() => offices.id),
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
  officeId: varchar("office_id").references(() => offices.id),
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

// Birthday notifications tracking
export const birthdayNotifications = pgTable("birthday_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientType: varchar("recipient_type").notNull(), // 'client' or 'caregiver'
  recipientId: varchar("recipient_id").notNull(),
  recipientName: varchar("recipient_name").notNull(),
  channel: varchar("channel").notNull(), // 'sms', 'email', or 'both'
  smsStatus: varchar("sms_status"), // 'sent', 'failed', 'skipped'
  emailStatus: varchar("email_status"), // 'sent', 'failed', 'skipped'
  smsError: text("sms_error"),
  emailError: text("email_error"),
  birthdayDate: timestamp("birthday_date").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  officeId: varchar("office_id").references(() => offices.id),
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

export const carePlansRelations = relations(carePlans, ({ one, many }) => ({
  client: one(clients, {
    fields: [carePlans.clientId],
    references: [clients.id],
  }),
  createdBy: one(users, {
    fields: [carePlans.createdBy],
    references: [users.id],
  }),
  goals: many(carePlanGoals),
  interventions: many(carePlanInterventions),
}));

export const carePlanGoalsRelations = relations(carePlanGoals, ({ one }) => ({
  carePlan: one(carePlans, {
    fields: [carePlanGoals.carePlanId],
    references: [carePlans.id],
  }),
}));

export const carePlanInterventionsRelations = relations(carePlanInterventions, ({ one }) => ({
  carePlan: one(carePlans, {
    fields: [carePlanInterventions.carePlanId],
    references: [carePlans.id],
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

export const incidentReportsRelations = relations(incidentReports, ({ one, many }) => ({
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
  followUps: many(incidentFollowUps),
}));

export const incidentFollowUpsRelations = relations(incidentFollowUps, ({ one }) => ({
  incident: one(incidentReports, {
    fields: [incidentFollowUps.incidentId],
    references: [incidentReports.id],
  }),
  assignedTo: one(users, {
    fields: [incidentFollowUps.assignedToId],
    references: [users.id],
    relationName: "assignedFollowUps",
  }),
  completedByUser: one(users, {
    fields: [incidentFollowUps.completedBy],
    references: [users.id],
    relationName: "completedFollowUps",
  }),
  createdByUser: one(users, {
    fields: [incidentFollowUps.createdBy],
    references: [users.id],
    relationName: "createdFollowUps",
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

// Office Dashboard Links - custom quick links for 3rd party applications
export const officeDashboardLinks = pgTable("office_dashboard_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  officeId: varchar("office_id").notNull().references(() => offices.id),
  title: varchar("title").notNull(),
  url: text("url").notNull(),
  description: text("description"),
  icon: varchar("icon"), // lucide icon name
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_dashboard_links_office").on(table.officeId),
]);

export const officeDashboardLinksRelations = relations(officeDashboardLinks, ({ one }) => ({
  office: one(offices, {
    fields: [officeDashboardLinks.officeId],
    references: [offices.id],
  }),
}));

// Schema types
export type Office = typeof offices.$inferSelect;
export type InsertOffice = typeof offices.$inferInsert;
export const insertOfficeSchema = createInsertSchema(offices);

export type OfficeDashboardLink = typeof officeDashboardLinks.$inferSelect;
export type InsertOfficeDashboardLink = typeof officeDashboardLinks.$inferInsert;
export const insertOfficeDashboardLinkSchema = createInsertSchema(officeDashboardLinks).omit({ id: true, createdAt: true, updatedAt: true });

export type Coordinator = typeof coordinators.$inferSelect;
export type InsertCoordinator = typeof coordinators.$inferInsert;
export const insertCoordinatorSchema = createInsertSchema(coordinators);

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

export type CarePlanGoal = typeof carePlanGoals.$inferSelect;
export type InsertCarePlanGoal = typeof carePlanGoals.$inferInsert;
export const insertCarePlanGoalSchema = createInsertSchema(carePlanGoals);

export type CarePlanIntervention = typeof carePlanInterventions.$inferSelect;
export type InsertCarePlanIntervention = typeof carePlanInterventions.$inferInsert;
export const insertCarePlanInterventionSchema = createInsertSchema(carePlanInterventions);

export type ProgressNote = typeof progressNotes.$inferSelect;
export type InsertProgressNote = typeof progressNotes.$inferInsert;
export const insertProgressNoteSchema = createInsertSchema(progressNotes);

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;
export const insertDocumentSchema = createInsertSchema(documents);

export type IncidentReport = typeof incidentReports.$inferSelect;
export type InsertIncidentReport = typeof incidentReports.$inferInsert;
export const insertIncidentReportSchema = createInsertSchema(incidentReports);

export type IncidentFollowUp = typeof incidentFollowUps.$inferSelect;
export type InsertIncidentFollowUp = typeof incidentFollowUps.$inferInsert;
export const insertIncidentFollowUpSchema = createInsertSchema(incidentFollowUps).omit({ id: true, createdAt: true, updatedAt: true });

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

export type BirthdayNotification = typeof birthdayNotifications.$inferSelect;
export type InsertBirthdayNotification = typeof birthdayNotifications.$inferInsert;
export const insertBirthdayNotificationSchema = createInsertSchema(birthdayNotifications).omit({ id: true, sentAt: true });

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
  recurrenceWeeks: integer("recurrence_weeks").default(1), // Every N weeks
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
  scheduleType: varchar("schedule_type").default("daily_fixed"), // daily_fixed, weekly, etc.
  payCode: varchar("pay_code"),
  poc: varchar("poc"), // Point of Contact
  primaryBillTo: varchar("primary_bill_to"), // e.g., LTC - FC (RQ2)
  serviceCode: varchar("service_code"), // e.g., S5125
  budgetNumber: varchar("budget_number"),
  rateType: varchar("rate_type").default("hourly"), // hourly, fixed, etc.
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }),
  includeMileage: boolean("include_mileage").default(false),
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
  scheduleType: varchar("schedule_type"),
  payCode: varchar("pay_code"),
  poc: varchar("poc"),
  primaryBillTo: varchar("primary_bill_to"),
  serviceCode: varchar("service_code"),
  budgetNumber: varchar("budget_number"),
  rateType: varchar("rate_type"),
  hourlyRate: numeric("hourly_rate", { precision: 10, scale: 2 }),
  totalHours: numeric("total_hours", { precision: 10, scale: 2 }),
  billingAmount: numeric("billing_amount", { precision: 10, scale: 2 }),
  includeMileage: boolean("include_mileage").default(false),
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

// MCOs - Managed Care Organizations for billing (per office)
export const mcos = pgTable("mcos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  officeId: varchar("office_id").references(() => offices.id),
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
  office: one(offices, {
    fields: [mcos.officeId],
    references: [offices.id],
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

// Payroll Holidays - Custom and managed holidays for payroll calendar
export const payrollHolidays = pgTable("payroll_holidays", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  officeId: varchar("office_id").references(() => offices.id).notNull(),
  name: varchar("name").notNull(),
  date: timestamp("date").notNull(),
  isDefault: boolean("is_default").default(false), // true for US federal holidays
  year: integer("year").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payrollHolidaysRelations = relations(payrollHolidays, ({ one }) => ({
  office: one(offices, {
    fields: [payrollHolidays.officeId],
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
  regularHours: numeric("regular_hours", { precision: 8, scale: 2 }).default("0"),
  overtimeHours: numeric("overtime_hours", { precision: 8, scale: 2 }).default("0"),
  week1RegularHours: numeric("week1_regular_hours", { precision: 8, scale: 2 }).default("0"),
  week1OvertimeHours: numeric("week1_overtime_hours", { precision: 8, scale: 2 }).default("0"),
  week2RegularHours: numeric("week2_regular_hours", { precision: 8, scale: 2 }).default("0"),
  week2OvertimeHours: numeric("week2_overtime_hours", { precision: 8, scale: 2 }).default("0"),
  hourlyRate: numeric("hourly_rate", { precision: 8, scale: 2 }),
  grossPay: numeric("gross_pay", { precision: 10, scale: 2 }).default("0"),
  deductions: jsonb("deductions"), // {tax: X, insurance: Y, etc}
  netPay: numeric("net_pay", { precision: 10, scale: 2 }).default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Caregiver Time Entries - Imported billing hours for payroll calculation
export const caregiverTimeEntries = pgTable("caregiver_time_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  payrollRunId: varchar("payroll_run_id").references(() => payrollRuns.id).notNull(),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id).notNull(),
  clientId: varchar("client_id").references(() => clients.id),
  entryDate: timestamp("entry_date").notNull(),
  hoursWorked: numeric("hours_worked", { precision: 8, scale: 2 }).notNull(),
  weekNumber: integer("week_number").notNull(), // 1 or 2 within the pay period
  sourceRowNumber: integer("source_row_number"), // Row from imported spreadsheet
  importBatchId: varchar("import_batch_id"), // Track which import created this entry
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const caregiverTimeEntriesRelations = relations(caregiverTimeEntries, ({ one }) => ({
  payrollRun: one(payrollRuns, {
    fields: [caregiverTimeEntries.payrollRunId],
    references: [payrollRuns.id],
  }),
  caregiver: one(caregivers, {
    fields: [caregiverTimeEntries.caregiverId],
    references: [caregivers.id],
  }),
  client: one(clients, {
    fields: [caregiverTimeEntries.clientId],
    references: [clients.id],
  }),
}));

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
  officeId: varchar("office_id").references(() => offices.id),
  mcoId: varchar("mco_id").references(() => mcos.id),
  serviceStartDate: timestamp("service_start_date").notNull(),
  serviceEndDate: timestamp("service_end_date").notNull(),
  serviceCode: varchar("service_code"),
  hours: numeric("hours", { precision: 8, scale: 2 }),
  rate: numeric("rate", { precision: 10, scale: 2 }),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
  billDate: timestamp("bill_date").notNull(),
  dueDate: timestamp("due_date"),
  status: varchar("status").default("pending"), // pending, invoiced, paid, overdue, cancelled
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const billingRecordsRelations = relations(billingRecords, ({ one }) => ({
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

export type PayrollHoliday = typeof payrollHolidays.$inferSelect;
export type InsertPayrollHoliday = typeof payrollHolidays.$inferInsert;
export const insertPayrollHolidaySchema = createInsertSchema(payrollHolidays).omit({ id: true, createdAt: true });

export type PayrollRun = typeof payrollRuns.$inferSelect;
export type InsertPayrollRun = typeof payrollRuns.$inferInsert;
export const insertPayrollRunSchema = createInsertSchema(payrollRuns).omit({ id: true, createdAt: true, updatedAt: true });

export type PayrollLineItem = typeof payrollLineItems.$inferSelect;
export type InsertPayrollLineItem = typeof payrollLineItems.$inferInsert;
export const insertPayrollLineItemSchema = createInsertSchema(payrollLineItems).omit({ id: true, createdAt: true });

export type CaregiverTimeEntry = typeof caregiverTimeEntries.$inferSelect;
export type InsertCaregiverTimeEntry = typeof caregiverTimeEntries.$inferInsert;
export const insertCaregiverTimeEntrySchema = createInsertSchema(caregiverTimeEntries).omit({ id: true, createdAt: true });

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

// ==================== CAREGIVER PROFILE TABLES ====================

// Caregiver Notes - Notes section
export const caregiverNotes = pgTable("caregiver_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id).notNull(),
  authorId: varchar("author_id").references(() => users.id),
  noteType: varchar("note_type").default("general"), // general, performance, disciplinary, commendation
  subject: varchar("subject"),
  content: text("content").notNull(),
  isPrivate: boolean("is_private").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Caregiver Preferences - Preferences section
export const caregiverPreferences = pgTable("caregiver_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id).notNull(),
  preferenceType: varchar("preference_type").notNull(), // work_area, client_type, schedule, language, etc.
  preferenceValue: text("preference_value").notNull(),
  priority: integer("priority").default(1), // 1=high, 2=medium, 3=low
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Caregiver Absences/Restrictions - Absence/Restriction section
export const caregiverAbsences = pgTable("caregiver_absences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id).notNull(),
  absenceType: varchar("absence_type").notNull(), // vacation, sick, personal, fmla, restriction, unavailable
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isAllDay: boolean("is_all_day").default(true),
  startTime: varchar("start_time"), // HH:MM if not all day
  endTime: varchar("end_time"), // HH:MM if not all day
  reason: text("reason"),
  status: varchar("status").default("approved"), // pending, approved, denied
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Caregiver Availability - Availability section (Weekly recurring pattern)
export const caregiverAvailability = pgTable("caregiver_availability", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Sunday, 6=Saturday
  startTime: varchar("start_time").notNull(), // HH:MM format
  endTime: varchar("end_time").notNull(), // HH:MM format
  isAvailable: boolean("is_available").default(true),
  effectiveFrom: timestamp("effective_from"),
  effectiveTo: timestamp("effective_to"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Caregiver Availability Exceptions - Specific date overrides
export const availabilityExceptionReasonEnum = pgEnum("availability_exception_reason", ["vacation", "sick", "personal", "training", "other"]);

export const caregiverAvailabilityExceptions = pgTable("caregiver_availability_exceptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id).notNull(),
  date: timestamp("date").notNull(), // Specific date for the exception
  isAvailable: boolean("is_available").default(false), // Usually false for exceptions (time off)
  reason: availabilityExceptionReasonEnum("reason"),
  startTime: varchar("start_time"), // Nullable for full day off, HH:MM for partial day
  endTime: varchar("end_time"), // Nullable for full day off, HH:MM for partial day
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Caregiver Payroll Info - Payroll Info section
export const caregiverPayrollInfo = pgTable("caregiver_payroll_info", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id).notNull(),
  paymentMethod: varchar("payment_method").default("direct_deposit"), // direct_deposit, check, paycard
  bankName: varchar("bank_name"),
  accountType: varchar("account_type"), // checking, savings
  accountNumberLast4: varchar("account_number_last4"),
  routingNumberLast4: varchar("routing_number_last4"),
  taxFilingStatus: varchar("tax_filing_status"), // single, married_filing_jointly, married_filing_separately, head_of_household
  federalWithholding: integer("federal_withholding").default(0),
  stateWithholding: integer("state_withholding").default(0),
  additionalWithholding: numeric("additional_withholding", { precision: 10, scale: 2 }),
  ssn_last4: varchar("ssn_last4"),
  w4OnFile: boolean("w4_on_file").default(false),
  i9OnFile: boolean("i9_on_file").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Caregiver Expenses - Expenses section
export const caregiverExpenses = pgTable("caregiver_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id).notNull(),
  expenseDate: timestamp("expense_date").notNull(),
  expenseType: varchar("expense_type").notNull(), // mileage, supplies, training, uniform, other
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  clientId: varchar("client_id").references(() => clients.id), // if expense is client-related
  receiptDocumentId: varchar("receipt_document_id").references(() => documents.id),
  status: varchar("status").default("pending"), // pending, approved, denied, paid
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  paidAt: timestamp("paid_at"),
  mileage: numeric("mileage", { precision: 10, scale: 2 }), // for mileage expenses
  mileageRate: numeric("mileage_rate", { precision: 10, scale: 4 }), // per mile rate
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Caregiver Paychecks - Pay Check section
export const caregiverPaychecks = pgTable("caregiver_paychecks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id).notNull(),
  payrollRunId: varchar("payroll_run_id").references(() => payrollRuns.id),
  payPeriodStart: timestamp("pay_period_start").notNull(),
  payPeriodEnd: timestamp("pay_period_end").notNull(),
  payDate: timestamp("pay_date").notNull(),
  regularHours: numeric("regular_hours", { precision: 10, scale: 2 }).default("0"),
  overtimeHours: numeric("overtime_hours", { precision: 10, scale: 2 }).default("0"),
  holidayHours: numeric("holiday_hours", { precision: 10, scale: 2 }).default("0"),
  grossPay: numeric("gross_pay", { precision: 10, scale: 2 }).notNull(),
  federalTax: numeric("federal_tax", { precision: 10, scale: 2 }).default("0"),
  stateTax: numeric("state_tax", { precision: 10, scale: 2 }).default("0"),
  socialSecurity: numeric("social_security", { precision: 10, scale: 2 }).default("0"),
  medicare: numeric("medicare", { precision: 10, scale: 2 }).default("0"),
  otherDeductions: numeric("other_deductions", { precision: 10, scale: 2 }).default("0"),
  netPay: numeric("net_pay", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status").default("pending"), // pending, processed, paid
  checkNumber: varchar("check_number"),
  paystubDocumentId: varchar("paystub_document_id").references(() => documents.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Caregiver Rates - Rates section (different from base hourly wage)
export const caregiverRates = pgTable("caregiver_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id).notNull(),
  serviceType: varchar("service_type").notNull(), // personal_care, companion, respite, live_in, etc.
  rate: numeric("rate", { precision: 10, scale: 2 }).notNull(),
  rateType: varchar("rate_type").default("hourly"), // hourly, daily, per_visit
  effectiveFrom: timestamp("effective_from"),
  effectiveTo: timestamp("effective_to"),
  clientId: varchar("client_id").references(() => clients.id), // if rate is client-specific
  mcoId: varchar("mco_id").references(() => mcos.id), // if rate is MCO-specific
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Caregiver In-Service Records - In Service section
export const caregiverInServices = pgTable("caregiver_in_services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id).notNull(),
  trainingId: varchar("training_id").references(() => trainings.id),
  title: varchar("title").notNull(),
  description: text("description"),
  trainingDate: timestamp("training_date").notNull(),
  hours: numeric("hours", { precision: 5, scale: 2 }),
  instructor: varchar("instructor"),
  location: varchar("location"),
  status: varchar("status").default("completed"), // scheduled, completed, incomplete, cancelled
  certificateNumber: varchar("certificate_number"),
  expirationDate: timestamp("expiration_date"),
  documentId: varchar("document_id").references(() => documents.id), // certificate document
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Caregiver Office Moves - Office Move section
export const caregiverOfficeMoves = pgTable("caregiver_office_moves", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id).notNull(),
  fromOfficeId: varchar("from_office_id").references(() => offices.id),
  toOfficeId: varchar("to_office_id").references(() => offices.id).notNull(),
  moveDate: timestamp("move_date").notNull(),
  reason: text("reason"),
  approvedBy: varchar("approved_by").references(() => users.id),
  status: varchar("status").default("completed"), // pending, approved, completed, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Caregiver Schedules - Calendar section (linking to client schedules)
export const caregiverSchedules = pgTable("caregiver_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id).notNull(),
  clientId: varchar("client_id").references(() => clients.id),
  scheduledDate: timestamp("scheduled_date").notNull(),
  startTime: varchar("start_time").notNull(),
  endTime: varchar("end_time").notNull(),
  serviceType: varchar("service_type"),
  status: varchar("status").default("scheduled"), // scheduled, confirmed, in_progress, completed, cancelled, no_show
  clockInTime: timestamp("clock_in_time"),
  clockOutTime: timestamp("clock_out_time"),
  clockInLatitude: numeric("clock_in_latitude", { precision: 10, scale: 7 }),
  clockInLongitude: numeric("clock_in_longitude", { precision: 10, scale: 7 }),
  clockOutLatitude: numeric("clock_out_latitude", { precision: 10, scale: 7 }),
  clockOutLongitude: numeric("clock_out_longitude", { precision: 10, scale: 7 }),
  clockInDistance: numeric("clock_in_distance"),
  clockOutDistance: numeric("clock_out_distance"),
  evvStatus: varchar("evv_status").default("pending"), // pending, compliant, non_compliant
  evvNotes: text("evv_notes"),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for caregiver profile tables
export const caregiverNotesRelations = relations(caregiverNotes, ({ one }) => ({
  caregiver: one(caregivers, { fields: [caregiverNotes.caregiverId], references: [caregivers.id] }),
  author: one(users, { fields: [caregiverNotes.authorId], references: [users.id] }),
}));

export const caregiverPreferencesRelations = relations(caregiverPreferences, ({ one }) => ({
  caregiver: one(caregivers, { fields: [caregiverPreferences.caregiverId], references: [caregivers.id] }),
}));

export const caregiverAbsencesRelations = relations(caregiverAbsences, ({ one }) => ({
  caregiver: one(caregivers, { fields: [caregiverAbsences.caregiverId], references: [caregivers.id] }),
  approvedByUser: one(users, { fields: [caregiverAbsences.approvedBy], references: [users.id] }),
}));

export const caregiverAvailabilityRelations = relations(caregiverAvailability, ({ one }) => ({
  caregiver: one(caregivers, { fields: [caregiverAvailability.caregiverId], references: [caregivers.id] }),
}));

export const caregiverAvailabilityExceptionsRelations = relations(caregiverAvailabilityExceptions, ({ one }) => ({
  caregiver: one(caregivers, { fields: [caregiverAvailabilityExceptions.caregiverId], references: [caregivers.id] }),
  approvedByUser: one(users, { fields: [caregiverAvailabilityExceptions.approvedBy], references: [users.id] }),
}));

export const caregiverPayrollInfoRelations = relations(caregiverPayrollInfo, ({ one }) => ({
  caregiver: one(caregivers, { fields: [caregiverPayrollInfo.caregiverId], references: [caregivers.id] }),
}));

export const caregiverExpensesRelations = relations(caregiverExpenses, ({ one }) => ({
  caregiver: one(caregivers, { fields: [caregiverExpenses.caregiverId], references: [caregivers.id] }),
  client: one(clients, { fields: [caregiverExpenses.clientId], references: [clients.id] }),
  receipt: one(documents, { fields: [caregiverExpenses.receiptDocumentId], references: [documents.id] }),
  approvedByUser: one(users, { fields: [caregiverExpenses.approvedBy], references: [users.id] }),
}));

export const caregiverPaychecksRelations = relations(caregiverPaychecks, ({ one }) => ({
  caregiver: one(caregivers, { fields: [caregiverPaychecks.caregiverId], references: [caregivers.id] }),
  payrollRun: one(payrollRuns, { fields: [caregiverPaychecks.payrollRunId], references: [payrollRuns.id] }),
}));

export const caregiverRatesRelations = relations(caregiverRates, ({ one }) => ({
  caregiver: one(caregivers, { fields: [caregiverRates.caregiverId], references: [caregivers.id] }),
  client: one(clients, { fields: [caregiverRates.clientId], references: [clients.id] }),
  mco: one(mcos, { fields: [caregiverRates.mcoId], references: [mcos.id] }),
}));

export const caregiverInServicesRelations = relations(caregiverInServices, ({ one }) => ({
  caregiver: one(caregivers, { fields: [caregiverInServices.caregiverId], references: [caregivers.id] }),
  training: one(trainings, { fields: [caregiverInServices.trainingId], references: [trainings.id] }),
  document: one(documents, { fields: [caregiverInServices.documentId], references: [documents.id] }),
}));

export const caregiverOfficeMovesRelations = relations(caregiverOfficeMoves, ({ one }) => ({
  caregiver: one(caregivers, { fields: [caregiverOfficeMoves.caregiverId], references: [caregivers.id] }),
  fromOffice: one(offices, { fields: [caregiverOfficeMoves.fromOfficeId], references: [offices.id] }),
  toOffice: one(offices, { fields: [caregiverOfficeMoves.toOfficeId], references: [offices.id] }),
  approvedByUser: one(users, { fields: [caregiverOfficeMoves.approvedBy], references: [users.id] }),
}));

export const caregiverSchedulesRelations = relations(caregiverSchedules, ({ one }) => ({
  caregiver: one(caregivers, { fields: [caregiverSchedules.caregiverId], references: [caregivers.id] }),
  client: one(clients, { fields: [caregiverSchedules.clientId], references: [clients.id] }),
  createdByUser: one(users, { fields: [caregiverSchedules.createdBy], references: [users.id] }),
}));

// Type exports for Caregiver Profile tables
export type CaregiverNote = typeof caregiverNotes.$inferSelect;
export type InsertCaregiverNote = typeof caregiverNotes.$inferInsert;
export const insertCaregiverNoteSchema = createInsertSchema(caregiverNotes).omit({ id: true, createdAt: true, updatedAt: true });

export type CaregiverPreference = typeof caregiverPreferences.$inferSelect;
export type InsertCaregiverPreference = typeof caregiverPreferences.$inferInsert;
export const insertCaregiverPreferenceSchema = createInsertSchema(caregiverPreferences).omit({ id: true, createdAt: true, updatedAt: true });

export type CaregiverAbsence = typeof caregiverAbsences.$inferSelect;
export type InsertCaregiverAbsence = typeof caregiverAbsences.$inferInsert;
export const insertCaregiverAbsenceSchema = createInsertSchema(caregiverAbsences).omit({ id: true, createdAt: true, updatedAt: true });

export type CaregiverAvailability = typeof caregiverAvailability.$inferSelect;
export type InsertCaregiverAvailability = typeof caregiverAvailability.$inferInsert;
export const insertCaregiverAvailabilitySchema = createInsertSchema(caregiverAvailability).omit({ id: true, createdAt: true, updatedAt: true });

export type CaregiverAvailabilityException = typeof caregiverAvailabilityExceptions.$inferSelect;
export type InsertCaregiverAvailabilityException = typeof caregiverAvailabilityExceptions.$inferInsert;
export const insertCaregiverAvailabilityExceptionSchema = createInsertSchema(caregiverAvailabilityExceptions).omit({ id: true, createdAt: true });

export type CaregiverPayrollInfo = typeof caregiverPayrollInfo.$inferSelect;
export type InsertCaregiverPayrollInfo = typeof caregiverPayrollInfo.$inferInsert;
export const insertCaregiverPayrollInfoSchema = createInsertSchema(caregiverPayrollInfo).omit({ id: true, createdAt: true, updatedAt: true });

export type CaregiverExpense = typeof caregiverExpenses.$inferSelect;
export type InsertCaregiverExpense = typeof caregiverExpenses.$inferInsert;
export const insertCaregiverExpenseSchema = createInsertSchema(caregiverExpenses).omit({ id: true, createdAt: true, updatedAt: true });

export type CaregiverPaycheck = typeof caregiverPaychecks.$inferSelect;
export type InsertCaregiverPaycheck = typeof caregiverPaychecks.$inferInsert;
export const insertCaregiverPaycheckSchema = createInsertSchema(caregiverPaychecks).omit({ id: true, createdAt: true, updatedAt: true });

export type CaregiverRate = typeof caregiverRates.$inferSelect;
export type InsertCaregiverRate = typeof caregiverRates.$inferInsert;
export const insertCaregiverRateSchema = createInsertSchema(caregiverRates).omit({ id: true, createdAt: true, updatedAt: true });

export type CaregiverInService = typeof caregiverInServices.$inferSelect;
export type InsertCaregiverInService = typeof caregiverInServices.$inferInsert;
export const insertCaregiverInServiceSchema = createInsertSchema(caregiverInServices).omit({ id: true, createdAt: true, updatedAt: true });

export type CaregiverOfficeMove = typeof caregiverOfficeMoves.$inferSelect;
export type InsertCaregiverOfficeMove = typeof caregiverOfficeMoves.$inferInsert;
export const insertCaregiverOfficeMoveSchema = createInsertSchema(caregiverOfficeMoves).omit({ id: true, createdAt: true, updatedAt: true });

export type CaregiverSchedule = typeof caregiverSchedules.$inferSelect;
export type InsertCaregiverSchedule = typeof caregiverSchedules.$inferInsert;
export const insertCaregiverScheduleSchema = createInsertSchema(caregiverSchedules).omit({ id: true, createdAt: true, updatedAt: true });

// Shift Swap Requests - allows caregivers to request shift swaps with manager approval
export const shiftSwapStatusEnum = pgEnum("shift_swap_status", ["pending", "approved", "rejected", "cancelled"]);

export const shiftSwapRequests = pgTable("shift_swap_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scheduleId: varchar("schedule_id").references(() => caregiverSchedules.id).notNull(),
  requestingCaregiverId: varchar("requesting_caregiver_id").references(() => caregivers.id).notNull(),
  targetCaregiverId: varchar("target_caregiver_id").references(() => caregivers.id),
  reason: text("reason"),
  status: shiftSwapStatusEnum("status").default("pending"),
  officeId: varchar("office_id").references(() => offices.id),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_shift_swap_requests_status").on(table.status),
  index("idx_shift_swap_requests_office").on(table.officeId),
  index("idx_shift_swap_requests_requesting_caregiver").on(table.requestingCaregiverId),
]);

export const shiftSwapRequestsRelations = relations(shiftSwapRequests, ({ one }) => ({
  schedule: one(caregiverSchedules, { fields: [shiftSwapRequests.scheduleId], references: [caregiverSchedules.id] }),
  requestingCaregiver: one(caregivers, { fields: [shiftSwapRequests.requestingCaregiverId], references: [caregivers.id] }),
  targetCaregiver: one(caregivers, { fields: [shiftSwapRequests.targetCaregiverId], references: [caregivers.id] }),
  office: one(offices, { fields: [shiftSwapRequests.officeId], references: [offices.id] }),
  reviewer: one(users, { fields: [shiftSwapRequests.reviewedBy], references: [users.id] }),
}));

export type ShiftSwapRequest = typeof shiftSwapRequests.$inferSelect;
export type InsertShiftSwapRequest = typeof shiftSwapRequests.$inferInsert;
export const insertShiftSwapRequestSchema = createInsertSchema(shiftSwapRequests).omit({ id: true, createdAt: true, updatedAt: true, reviewedAt: true });

// Client MCO assignments - tracks MCO history with start/discharge dates
export const clientMcos = pgTable("client_mcos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  mcoId: varchar("mco_id").references(() => mcos.id).notNull(),
  memberId: varchar("member_id"),
  startDate: timestamp("start_date").notNull(),
  dischargeDate: timestamp("discharge_date"),
  dischargeReason: varchar("discharge_reason"),
  dischargeNotes: text("discharge_notes"),
  isPrimary: boolean("is_primary").default(false),
  status: varchar("status").default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ClientMco = typeof clientMcos.$inferSelect;
export type InsertClientMco = typeof clientMcos.$inferInsert;
export const insertClientMcoSchema = createInsertSchema(clientMcos).omit({ id: true, createdAt: true, updatedAt: true });

// Office Licenses - tracks health licenses with renewal history
export const officeLicenses = pgTable("office_licenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  officeId: varchar("office_id").references(() => offices.id).notNull(),
  licenseNumber: varchar("license_number").notNull(),
  licenseType: varchar("license_type").default("health"), // health, business, etc.
  issuedDate: timestamp("issued_date").notNull(),
  expirationDate: timestamp("expiration_date").notNull(),
  documentId: varchar("document_id").references(() => documents.id), // uploaded license document
  status: varchar("status").default("active"), // active, expired, pending_renewal
  notes: text("notes"),
  isActive: boolean("is_active").default(true), // false for historical/replaced licenses
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const officeLicensesRelations = relations(officeLicenses, ({ one }) => ({
  office: one(offices, { fields: [officeLicenses.officeId], references: [offices.id] }),
  document: one(documents, { fields: [officeLicenses.documentId], references: [documents.id] }),
  createdByUser: one(users, { fields: [officeLicenses.createdBy], references: [users.id] }),
}));

export type OfficeLicense = typeof officeLicenses.$inferSelect;
export type InsertOfficeLicense = typeof officeLicenses.$inferInsert;
export const insertOfficeLicenseSchema = createInsertSchema(officeLicenses).omit({ id: true, createdAt: true, updatedAt: true });

// Office Staff - tracks staff members assigned to offices
export const officeStaff = pgTable("office_staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  officeId: varchar("office_id").references(() => offices.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  position: varchar("position"), // Office Manager, Coordinator, Admin, etc.
  department: varchar("department"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  isPrimary: boolean("is_primary").default(false), // primary office assignment
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const officeStaffRelations = relations(officeStaff, ({ one }) => ({
  office: one(offices, { fields: [officeStaff.officeId], references: [offices.id] }),
  user: one(users, { fields: [officeStaff.userId], references: [users.id] }),
}));

export type OfficeStaff = typeof officeStaff.$inferSelect;
export type InsertOfficeStaff = typeof officeStaff.$inferInsert;
export const insertOfficeStaffSchema = createInsertSchema(officeStaff).omit({ id: true, createdAt: true, updatedAt: true });

// Office Expenses - tracks office-level expenses
export const officeExpenses = pgTable("office_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  officeId: varchar("office_id").references(() => offices.id).notNull(),
  expenseDate: timestamp("expense_date").notNull(),
  expenseType: varchar("expense_type").notNull(), // rent, utilities, supplies, equipment, insurance, other
  category: varchar("category"), // subcategory for detailed tracking
  description: text("description").notNull(),
  vendor: varchar("vendor"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method"), // check, card, wire, cash
  receiptDocumentId: varchar("receipt_document_id").references(() => documents.id),
  recurring: boolean("recurring").default(false),
  recurringFrequency: varchar("recurring_frequency"), // monthly, quarterly, annually
  status: varchar("status").default("pending"), // pending, approved, paid, rejected
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const officeExpensesRelations = relations(officeExpenses, ({ one }) => ({
  office: one(offices, { fields: [officeExpenses.officeId], references: [offices.id] }),
  receipt: one(documents, { fields: [officeExpenses.receiptDocumentId], references: [documents.id] }),
  approvedByUser: one(users, { fields: [officeExpenses.approvedBy], references: [users.id] }),
  createdByUser: one(users, { fields: [officeExpenses.createdBy], references: [users.id] }),
}));

export type OfficeExpense = typeof officeExpenses.$inferSelect;
export type InsertOfficeExpense = typeof officeExpenses.$inferInsert;
export const insertOfficeExpenseSchema = createInsertSchema(officeExpenses).omit({ id: true, createdAt: true, updatedAt: true });

// Eligibility Check Type enum
export const eligibilityCheckTypeEnum = pgEnum("eligibility_check_type", ["medicaid", "medicare", "private_insurance", "mco"]);

// Eligibility Check Status enum
export const eligibilityCheckStatusEnum = pgEnum("eligibility_check_status", ["active", "inactive", "pending", "error", "not_found"]);

// Eligibility Schedule Frequency enum
export const eligibilityScheduleFrequencyEnum = pgEnum("eligibility_schedule_frequency", ["weekly", "monthly", "quarterly"]);

// Eligibility Checks - tracks client eligibility verifications via PA DHS PROMISe portal or automated systems
export const eligibilityChecks = pgTable("eligibility_checks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  checkType: eligibilityCheckTypeEnum("check_type").default("medicaid"), // medicaid, medicare, private_insurance, mco
  payerId: varchar("payer_id"), // Insurance/MCO ID
  mcoId: varchar("mco_id").references(() => mcos.id), // MCO reference (backward compatible)
  memberId: varchar("member_id"), // Member ID used for verification
  checkDate: timestamp("check_date").notNull(), // Date of verification check
  expirationDate: timestamp("expiration_date"), // When this verification expires
  status: eligibilityCheckStatusEnum("status").default("pending"), // active, inactive, pending, error, not_found
  eligibilityStatus: varchar("eligibility_status"), // Legacy: eligible, ineligible, partial, unknown
  coverageDetails: jsonb("coverage_details"), // Coverage info from payer (structured response)
  coverageStartDate: timestamp("coverage_start_date"),
  coverageEndDate: timestamp("coverage_end_date"),
  errorMessage: text("error_message"), // Error message if check failed
  responseRaw: jsonb("response_raw"), // Full API response for audit trail
  checkedBy: varchar("checked_by"), // User ID or 'system' for automated checks
  verificationSource: varchar("verification_source").default("promise_portal"), // promise_portal, api, phone, fax, other
  verifiedBy: varchar("verified_by").references(() => users.id), // Legacy field
  notes: text("notes"),
  portalResponse: text("portal_response"), // Legacy: Store any response data or notes from portal
  documentId: varchar("document_id").references(() => documents.id), // Uploaded verification screenshot/document
  officeId: varchar("office_id").references(() => offices.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const eligibilityChecksRelations = relations(eligibilityChecks, ({ one }) => ({
  client: one(clients, { fields: [eligibilityChecks.clientId], references: [clients.id] }),
  mco: one(mcos, { fields: [eligibilityChecks.mcoId], references: [mcos.id] }),
  verifiedByUser: one(users, { fields: [eligibilityChecks.verifiedBy], references: [users.id] }),
  document: one(documents, { fields: [eligibilityChecks.documentId], references: [documents.id] }),
  office: one(offices, { fields: [eligibilityChecks.officeId], references: [offices.id] }),
}));

export type EligibilityCheck = typeof eligibilityChecks.$inferSelect;
export type InsertEligibilityCheck = typeof eligibilityChecks.$inferInsert;
export const insertEligibilityCheckSchema = createInsertSchema(eligibilityChecks).omit({ id: true, createdAt: true, updatedAt: true });

// Eligibility Schedule - for automated eligibility checks
export const eligibilitySchedule = pgTable("eligibility_schedule", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  checkFrequency: eligibilityScheduleFrequencyEnum("check_frequency").default("monthly"), // weekly, monthly, quarterly
  lastChecked: timestamp("last_checked"),
  nextCheckDate: timestamp("next_check_date"),
  isActive: boolean("is_active").default(true),
  checkType: eligibilityCheckTypeEnum("check_type").default("medicaid"), // Type of eligibility to check
  payerId: varchar("payer_id"), // Default payer to check
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const eligibilityScheduleRelations = relations(eligibilitySchedule, ({ one }) => ({
  client: one(clients, { fields: [eligibilitySchedule.clientId], references: [clients.id] }),
}));

export type EligibilitySchedule = typeof eligibilitySchedule.$inferSelect;
export type InsertEligibilitySchedule = typeof eligibilitySchedule.$inferInsert;
export const insertEligibilityScheduleSchema = createInsertSchema(eligibilitySchedule).omit({ id: true, createdAt: true, updatedAt: true });

// Caregiver Compliance - tracks -9 requirements, background checks, and medical requirements
export const caregiverCompliance = pgTable("caregiver_compliance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id).notNull(),
  officeId: varchar("office_id").references(() => offices.id),
  
  // Category: requirement_9 (PA -9 form), background_check, medical
  category: varchar("category").notNull(), // requirement_9, background_check, medical
  
  // Type within category (e.g., for -9: application, fingerprinting, etc.)
  // For background_check: fbi, pa_state, child_abuse, adult_abuse
  // For medical: tb_test, physical_exam, drug_test, hepatitis_b
  itemType: varchar("item_type").notNull(),
  
  // For -9 requirements and medical - document tracking
  documentId: varchar("document_id").references(() => documents.id),
  expirationDate: timestamp("expiration_date"),
  
  // For background checks
  performedDate: timestamp("performed_date"), // When check was performed
  resultDate: timestamp("result_date"), // When result was received
  result: varchar("result"), // pass, fail, pending, conditional
  
  // General fields
  status: varchar("status").default("pending"), // pending, compliant, expired, non_compliant
  notes: text("notes"),
  
  // Audit fields
  verifiedBy: varchar("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const caregiverComplianceRelations = relations(caregiverCompliance, ({ one }) => ({
  caregiver: one(caregivers, { fields: [caregiverCompliance.caregiverId], references: [caregivers.id] }),
  office: one(offices, { fields: [caregiverCompliance.officeId], references: [offices.id] }),
  document: one(documents, { fields: [caregiverCompliance.documentId], references: [documents.id] }),
  verifiedByUser: one(users, { fields: [caregiverCompliance.verifiedBy], references: [users.id] }),
  createdByUser: one(users, { fields: [caregiverCompliance.createdBy], references: [users.id] }),
}));

export type CaregiverCompliance = typeof caregiverCompliance.$inferSelect;
export type InsertCaregiverCompliance = typeof caregiverCompliance.$inferInsert;
export const insertCaregiverComplianceSchema = createInsertSchema(caregiverCompliance).omit({ id: true, createdAt: true, updatedAt: true });

// Medication Tracking - tracks client medications
export const medicationLogStatusEnum = pgEnum("medication_log_status", ["taken", "skipped", "refused"]);

export const medications = pgTable("medications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  medicationName: varchar("medication_name").notNull(),
  dosage: varchar("dosage"),
  frequency: varchar("frequency"), // e.g., "twice daily", "every 8 hours"
  route: varchar("route"), // oral, injection, topical, etc.
  prescribedBy: varchar("prescribed_by"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"), // nullable for ongoing medications
  instructions: text("instructions"),
  sideEffects: text("side_effects"),
  refillDate: timestamp("refill_date"),
  pharmacy: varchar("pharmacy"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const medicationsRelations = relations(medications, ({ one, many }) => ({
  client: one(clients, { fields: [medications.clientId], references: [clients.id] }),
  logs: many(medicationLogs),
}));

export type Medication = typeof medications.$inferSelect;
export type InsertMedication = typeof medications.$inferInsert;
export const insertMedicationSchema = createInsertSchema(medications).omit({ id: true, createdAt: true, updatedAt: true });

// Medication Logs - tracks medication adherence
export const medicationLogs = pgTable("medication_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  medicationId: varchar("medication_id").references(() => medications.id).notNull(),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id),
  scheduledTime: timestamp("scheduled_time"),
  takenTime: timestamp("taken_time"),
  status: medicationLogStatusEnum("status").notNull(), // taken, skipped, refused
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const medicationLogsRelations = relations(medicationLogs, ({ one }) => ({
  medication: one(medications, { fields: [medicationLogs.medicationId], references: [medications.id] }),
  client: one(clients, { fields: [medicationLogs.clientId], references: [clients.id] }),
  caregiver: one(caregivers, { fields: [medicationLogs.caregiverId], references: [caregivers.id] }),
}));

export type MedicationLog = typeof medicationLogs.$inferSelect;
export type InsertMedicationLog = typeof medicationLogs.$inferInsert;
export const insertMedicationLogSchema = createInsertSchema(medicationLogs).omit({ id: true, createdAt: true });

// Vital Signs Tracking - dedicated table for health metrics
export const vitalSigns = pgTable("vital_signs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id),
  recordedAt: timestamp("recorded_at").notNull(),
  bloodPressureSystolic: integer("blood_pressure_systolic"),
  bloodPressureDiastolic: integer("blood_pressure_diastolic"),
  heartRate: integer("heart_rate"),
  temperature: numeric("temperature", { precision: 10, scale: 2 }),
  respiratoryRate: integer("respiratory_rate"),
  oxygenSaturation: integer("oxygen_saturation"),
  weight: numeric("weight", { precision: 10, scale: 2 }),
  bloodSugar: integer("blood_sugar"),
  painLevel: integer("pain_level"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const vitalSignsRelations = relations(vitalSigns, ({ one }) => ({
  client: one(clients, { fields: [vitalSigns.clientId], references: [clients.id] }),
  caregiver: one(caregivers, { fields: [vitalSigns.caregiverId], references: [caregivers.id] }),
}));

export type VitalSign = typeof vitalSigns.$inferSelect;
export type InsertVitalSign = typeof vitalSigns.$inferInsert;
export const insertVitalSignSchema = createInsertSchema(vitalSigns).omit({ id: true, createdAt: true });

// Notification Templates - reusable notification templates
export const notificationTemplateTypeEnum = pgEnum("notification_template_type", ["sms", "email", "both"]);

export const notificationTemplates = pgTable("notification_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  type: notificationTemplateTypeEnum("type").notNull(),
  subject: varchar("subject"),
  body: text("body").notNull(),
  variables: text("variables").array(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type InsertNotificationTemplate = typeof notificationTemplates.$inferInsert;
export const insertNotificationTemplateSchema = createInsertSchema(notificationTemplates).omit({ id: true, createdAt: true });

// Notification Queue - queue for pending notifications
export const notificationRecipientTypeEnum = pgEnum("notification_recipient_type", ["user", "client", "caregiver"]);
export const notificationChannelEnum = pgEnum("notification_channel", ["sms", "email"]);
export const notificationStatusEnum = pgEnum("notification_status", ["pending", "sent", "failed"]);

export const notificationQueue = pgTable("notification_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recipientType: notificationRecipientTypeEnum("recipient_type").notNull(),
  recipientId: varchar("recipient_id").notNull(),
  channel: notificationChannelEnum("channel").notNull(),
  templateId: varchar("template_id").references(() => notificationTemplates.id),
  subject: varchar("subject"),
  body: text("body").notNull(),
  recipientContact: varchar("recipient_contact"),
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  status: notificationStatusEnum("status").default("pending"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").default(0),
  externalId: varchar("external_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationQueueRelations = relations(notificationQueue, ({ one }) => ({
  template: one(notificationTemplates, { fields: [notificationQueue.templateId], references: [notificationTemplates.id] }),
}));

export type NotificationQueueItem = typeof notificationQueue.$inferSelect;
export type InsertNotificationQueueItem = typeof notificationQueue.$inferInsert;
export const insertNotificationQueueItemSchema = createInsertSchema(notificationQueue).omit({ id: true, createdAt: true });

// Notification Preferences - user notification settings
export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull().unique(),
  enableSms: boolean("enable_sms").default(true),
  enableEmail: boolean("enable_email").default(true),
  quietHoursStart: varchar("quiet_hours_start"),
  quietHoursEnd: varchar("quiet_hours_end"),
  scheduleChangeNotifications: boolean("schedule_change_notifications").default(true),
  reminderNotifications: boolean("reminder_notifications").default(true),
  urgentAlertNotifications: boolean("urgent_alert_notifications").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, { fields: [notificationPreferences.userId], references: [users.id] }),
}));

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = typeof notificationPreferences.$inferInsert;
export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences).omit({ id: true, createdAt: true, updatedAt: true });

// Mileage Logs - tracks caregiver travel for reimbursement
export const mileageLogTripPurposeEnum = pgEnum("mileage_log_trip_purpose", ["client_visit", "training", "office_meeting", "other"]);
export const mileageLogStatusEnum = pgEnum("mileage_log_status", ["pending", "approved", "paid", "rejected"]);

export const mileageLogs = pgTable("mileage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id).notNull(),
  date: timestamp("date").notNull(),
  clientId: varchar("client_id").references(() => clients.id),
  tripPurpose: mileageLogTripPurposeEnum("trip_purpose").notNull(),
  startLocation: text("start_location"),
  endLocation: text("end_location"),
  startOdometer: numeric("start_odometer", { precision: 10, scale: 1 }),
  endOdometer: numeric("end_odometer", { precision: 10, scale: 1 }),
  totalMiles: numeric("total_miles", { precision: 10, scale: 1 }),
  reimbursementRate: numeric("reimbursement_rate", { precision: 10, scale: 4 }).default("0.67"),
  reimbursementAmount: numeric("reimbursement_amount", { precision: 10, scale: 2 }),
  status: mileageLogStatusEnum("status").default("pending"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const mileageLogsRelations = relations(mileageLogs, ({ one }) => ({
  caregiver: one(caregivers, { fields: [mileageLogs.caregiverId], references: [caregivers.id] }),
  client: one(clients, { fields: [mileageLogs.clientId], references: [clients.id] }),
  approvedByUser: one(users, { fields: [mileageLogs.approvedBy], references: [users.id] }),
}));

export type MileageLog = typeof mileageLogs.$inferSelect;
export type InsertMileageLog = typeof mileageLogs.$inferInsert;
export const insertMileageLogSchema = createInsertSchema(mileageLogs).omit({ id: true, createdAt: true, updatedAt: true });

// Recruitment Portal - Applicant Tracking
export const applicantStatusEnum = pgEnum("applicant_status", [
  "new", "screening", "interview_scheduled", "interview_completed", 
  "background_check", "offer_pending", "hired", "rejected", "withdrawn"
]);
export const applicantSourceEnum = pgEnum("applicant_source", ["referral", "indeed", "website", "walk_in", "other"]);
export const applicantPositionEnum = pgEnum("applicant_position", ["caregiver", "nurse", "admin", "coordinator", "supervisor", "other"]);
export const interviewTypeEnum = pgEnum("interview_type", ["phone", "in_person", "video"]);
export const interviewStatusEnum = pgEnum("interview_status", ["scheduled", "completed", "cancelled", "no_show"]);

export const applicants = pgTable("applicants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  address: text("address"),
  city: varchar("city"),
  state: varchar("state"),
  zipCode: varchar("zip_code"),
  dateOfBirth: timestamp("date_of_birth"),
  officeId: varchar("office_id").references(() => offices.id),
  position: applicantPositionEnum("position").default("caregiver"),
  source: applicantSourceEnum("source").default("other"),
  referredBy: varchar("referred_by"),
  applicationDate: timestamp("application_date").defaultNow(),
  resumeDocumentId: varchar("resume_document_id").references(() => documents.id),
  status: applicantStatusEnum("status").default("new"),
  stage: varchar("stage"),
  notes: text("notes"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  lastContactDate: timestamp("last_contact_date"),
  expectedStartDate: timestamp("expected_start_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const applicantsRelations = relations(applicants, ({ one, many }) => ({
  office: one(offices, { fields: [applicants.officeId], references: [offices.id] }),
  resumeDocument: one(documents, { fields: [applicants.resumeDocumentId], references: [documents.id] }),
  assignedToUser: one(users, { fields: [applicants.assignedTo], references: [users.id] }),
  applicantNotes: many(applicantNotes),
  applicantInterviews: many(applicantInterviews),
}));

export type Applicant = typeof applicants.$inferSelect;
export type InsertApplicant = typeof applicants.$inferInsert;
export const insertApplicantSchema = createInsertSchema(applicants).omit({ id: true, createdAt: true, updatedAt: true });

// Applicant Notes - notes added during recruitment process
export const applicantNotes = pgTable("applicant_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicantId: varchar("applicant_id").references(() => applicants.id, { onDelete: "cascade" }).notNull(),
  authorId: varchar("author_id").references(() => users.id),
  note: text("note").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const applicantNotesRelations = relations(applicantNotes, ({ one }) => ({
  applicant: one(applicants, { fields: [applicantNotes.applicantId], references: [applicants.id] }),
  author: one(users, { fields: [applicantNotes.authorId], references: [users.id] }),
}));

export type ApplicantNote = typeof applicantNotes.$inferSelect;
export type InsertApplicantNote = typeof applicantNotes.$inferInsert;
export const insertApplicantNoteSchema = createInsertSchema(applicantNotes).omit({ id: true, createdAt: true });

// Applicant Interviews - interview scheduling and tracking
export const applicantInterviews = pgTable("applicant_interviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicantId: varchar("applicant_id").references(() => applicants.id, { onDelete: "cascade" }).notNull(),
  interviewerId: varchar("interviewer_id").references(() => users.id),
  scheduledDate: timestamp("scheduled_date").notNull(),
  completedDate: timestamp("completed_date"),
  type: interviewTypeEnum("type").default("phone"),
  rating: integer("rating"),
  feedback: text("feedback"),
  status: interviewStatusEnum("status").default("scheduled"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const applicantInterviewsRelations = relations(applicantInterviews, ({ one }) => ({
  applicant: one(applicants, { fields: [applicantInterviews.applicantId], references: [applicants.id] }),
  interviewer: one(users, { fields: [applicantInterviews.interviewerId], references: [users.id] }),
}));

export type ApplicantInterview = typeof applicantInterviews.$inferSelect;
export type InsertApplicantInterview = typeof applicantInterviews.$inferInsert;
export const insertApplicantInterviewSchema = createInsertSchema(applicantInterviews).omit({ id: true, createdAt: true });

// Background Checks - tracks FBI fingerprints, state criminal checks, etc.
export const backgroundCheckTypeEnum = pgEnum("background_check_type", [
  "fbi_fingerprint", "state_criminal", "child_abuse", "adult_protective", "sex_offender", "oig_exclusion"
]);
export const backgroundCheckStatusEnum = pgEnum("background_check_status", [
  "pending", "in_progress", "completed_clear", "completed_review", "failed", "expired"
]);
export const backgroundCheckResultEnum = pgEnum("background_check_result", [
  "clear", "review_needed", "disqualifying"
]);

export const backgroundChecks = pgTable("background_checks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicantId: varchar("applicant_id").references(() => applicants.id),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id),
  checkType: backgroundCheckTypeEnum("check_type").notNull(),
  provider: varchar("provider"),
  requestedDate: timestamp("requested_date"),
  submittedDate: timestamp("submitted_date"),
  expectedCompletionDate: timestamp("expected_completion_date"),
  completedDate: timestamp("completed_date"),
  expirationDate: timestamp("expiration_date"),
  status: backgroundCheckStatusEnum("status").default("pending"),
  result: backgroundCheckResultEnum("result"),
  resultNotes: text("result_notes"),
  documentId: varchar("document_id").references(() => documents.id),
  cost: numeric("cost", { precision: 10, scale: 2 }),
  requestedBy: varchar("requested_by").references(() => users.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const backgroundChecksRelations = relations(backgroundChecks, ({ one }) => ({
  applicant: one(applicants, { fields: [backgroundChecks.applicantId], references: [applicants.id] }),
  caregiver: one(caregivers, { fields: [backgroundChecks.caregiverId], references: [caregivers.id] }),
  document: one(documents, { fields: [backgroundChecks.documentId], references: [documents.id] }),
  requestedByUser: one(users, { fields: [backgroundChecks.requestedBy], references: [users.id] }),
}));

export type BackgroundCheck = typeof backgroundChecks.$inferSelect;
export type InsertBackgroundCheck = typeof backgroundChecks.$inferInsert;
export const insertBackgroundCheckSchema = createInsertSchema(backgroundChecks).omit({ id: true, createdAt: true, updatedAt: true });

// Shift Differentials - weekend, holiday, overtime premium calculations
export const shiftDifferentialTypeEnum = pgEnum("shift_differential_type", [
  "weekend", "holiday", "overtime", "evening", "night", "on_call"
]);

export const shiftDifferentials = pgTable("shift_differentials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  officeId: varchar("office_id").references(() => offices.id),
  mcoId: varchar("mco_id").references(() => mcos.id),
  name: varchar("name").notNull(),
  type: shiftDifferentialTypeEnum("type").notNull(),
  multiplier: numeric("multiplier", { precision: 10, scale: 3 }),
  flatBonus: numeric("flat_bonus", { precision: 10, scale: 2 }),
  conditions: jsonb("conditions"),
  isActive: boolean("is_active").default(true),
  effectiveDate: timestamp("effective_date").notNull(),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const shiftDifferentialsRelations = relations(shiftDifferentials, ({ one }) => ({
  office: one(offices, { fields: [shiftDifferentials.officeId], references: [offices.id] }),
  mco: one(mcos, { fields: [shiftDifferentials.mcoId], references: [mcos.id] }),
}));

export type ShiftDifferential = typeof shiftDifferentials.$inferSelect;
export type InsertShiftDifferential = typeof shiftDifferentials.$inferInsert;
export const insertShiftDifferentialSchema = createInsertSchema(shiftDifferentials).omit({ id: true, createdAt: true, updatedAt: true });

// Holidays - for shift differential calculations
export const holidays = pgTable("holidays", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  date: timestamp("date"),
  observedDate: timestamp("observed_date"),
  isRecurring: boolean("is_recurring").default(false),
  recurringMonth: integer("recurring_month"),
  recurringDay: integer("recurring_day"),
  officeId: varchar("office_id").references(() => offices.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const holidaysRelations = relations(holidays, ({ one }) => ({
  office: one(offices, { fields: [holidays.officeId], references: [offices.id] }),
}));

export type Holiday = typeof holidays.$inferSelect;
export type InsertHoliday = typeof holidays.$inferInsert;
export const insertHolidaySchema = createInsertSchema(holidays).omit({ id: true, createdAt: true });

// Performance Reviews - for caregiver evaluations and goal tracking
export const performanceReviewTypeEnum = pgEnum("performance_review_type", [
  "annual", "semi_annual", "quarterly", "probationary", "improvement_plan"
]);
export const performanceReviewStatusEnum = pgEnum("performance_review_status", [
  "scheduled", "in_progress", "completed", "cancelled"
]);

export const performanceReviews = pgTable("performance_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id).notNull(),
  reviewerId: varchar("reviewer_id").references(() => users.id).notNull(),
  reviewType: performanceReviewTypeEnum("review_type").notNull(),
  reviewPeriodStart: timestamp("review_period_start"),
  reviewPeriodEnd: timestamp("review_period_end"),
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  status: performanceReviewStatusEnum("status").default("scheduled"),
  overallRating: integer("overall_rating"),
  strengths: text("strengths"),
  areasForImprovement: text("areas_for_improvement"),
  goals: text("goals"),
  actionItems: text("action_items"),
  employeeComments: text("employee_comments"),
  reviewerComments: text("reviewer_comments"),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: varchar("acknowledged_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const performanceReviewsRelations = relations(performanceReviews, ({ one, many }) => ({
  caregiver: one(caregivers, { fields: [performanceReviews.caregiverId], references: [caregivers.id] }),
  reviewer: one(users, { fields: [performanceReviews.reviewerId], references: [users.id] }),
  acknowledgedByUser: one(users, { fields: [performanceReviews.acknowledgedBy], references: [users.id] }),
  metrics: many(performanceMetrics),
}));

export type PerformanceReview = typeof performanceReviews.$inferSelect;
export type InsertPerformanceReview = typeof performanceReviews.$inferInsert;
export const insertPerformanceReviewSchema = createInsertSchema(performanceReviews).omit({ id: true, createdAt: true, updatedAt: true });

// Performance Metrics - specific criteria ratings for performance reviews
export const performanceMetricNameEnum = pgEnum("performance_metric_name", [
  "attendance", "punctuality", "client_satisfaction", "documentation",
  "communication", "teamwork", "skills", "professionalism"
]);

export const performanceMetrics = pgTable("performance_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reviewId: varchar("review_id").references(() => performanceReviews.id, { onDelete: "cascade" }).notNull(),
  metricName: performanceMetricNameEnum("metric_name").notNull(),
  rating: integer("rating").notNull(),
  weight: numeric("weight", { precision: 5, scale: 2 }).default("1.00"),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const performanceMetricsRelations = relations(performanceMetrics, ({ one }) => ({
  review: one(performanceReviews, { fields: [performanceMetrics.reviewId], references: [performanceReviews.id] }),
}));

export type PerformanceMetric = typeof performanceMetrics.$inferSelect;
export type InsertPerformanceMetric = typeof performanceMetrics.$inferInsert;
export const insertPerformanceMetricSchema = createInsertSchema(performanceMetrics).omit({ id: true, createdAt: true });

// ==================== TIME-OFF REQUESTS & PTO MANAGEMENT ====================

// Time-off request type enum
export const timeOffRequestTypeEnum = pgEnum("time_off_request_type", [
  "vacation", "sick", "personal", "bereavement", "jury_duty", "fmla", "unpaid"
]);

// Time-off request status enum
export const timeOffRequestStatusEnum = pgEnum("time_off_request_status", [
  "pending", "approved", "denied", "cancelled"
]);

// Time-off Requests table
export const timeOffRequests = pgTable("time_off_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id).notNull(),
  requestType: timeOffRequestTypeEnum("request_type").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  hoursRequested: numeric("hours_requested", { precision: 10, scale: 2 }),
  reason: text("reason"),
  status: timeOffRequestStatusEnum("status").default("pending"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  isPaid: boolean("is_paid").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const timeOffRequestsRelations = relations(timeOffRequests, ({ one }) => ({
  caregiver: one(caregivers, { fields: [timeOffRequests.caregiverId], references: [caregivers.id] }),
  reviewer: one(users, { fields: [timeOffRequests.reviewedBy], references: [users.id] }),
}));

export type TimeOffRequest = typeof timeOffRequests.$inferSelect;
export type InsertTimeOffRequest = typeof timeOffRequests.$inferInsert;
export const insertTimeOffRequestSchema = createInsertSchema(timeOffRequests).omit({ id: true, createdAt: true, updatedAt: true, submittedAt: true });

// PTO type enum
export const ptoTypeEnum = pgEnum("pto_type", ["vacation", "sick", "personal"]);

// PTO Balances table
export const ptoBalances = pgTable("pto_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id).notNull(),
  year: integer("year").notNull(),
  ptoType: ptoTypeEnum("pto_type").notNull(),
  accrued: numeric("accrued", { precision: 10, scale: 2 }).default("0"),
  used: numeric("used", { precision: 10, scale: 2 }).default("0"),
  pending: numeric("pending", { precision: 10, scale: 2 }).default("0"),
  available: numeric("available", { precision: 10, scale: 2 }).default("0"),
  carryoverFromPreviousYear: numeric("carryover_from_previous_year", { precision: 10, scale: 2 }).default("0"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const ptoBalancesRelations = relations(ptoBalances, ({ one }) => ({
  caregiver: one(caregivers, { fields: [ptoBalances.caregiverId], references: [caregivers.id] }),
}));

export type PtoBalance = typeof ptoBalances.$inferSelect;
export type InsertPtoBalance = typeof ptoBalances.$inferInsert;
export const insertPtoBalanceSchema = createInsertSchema(ptoBalances).omit({ id: true, updatedAt: true });

// ==================== CLIENT SATISFACTION SURVEYS ====================

// Survey type enum
export const surveyTypeEnum = pgEnum("survey_type", [
  "client_satisfaction", "caregiver_feedback", "exit_survey", "quarterly_review"
]);

// Survey respondent type enum
export const surveyRespondentTypeEnum = pgEnum("survey_respondent_type", [
  "client", "caregiver", "family"
]);

// Survey status enum
export const surveyStatusEnum = pgEnum("survey_status", [
  "pending", "completed", "expired"
]);

// Survey Templates table
export const surveyTemplates = pgTable("survey_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  surveyType: surveyTypeEnum("survey_type").notNull(),
  questions: jsonb("questions").notNull(), // array of {question, type: rating/text/multiple_choice, options?, required}
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type SurveyTemplate = typeof surveyTemplates.$inferSelect;
export type InsertSurveyTemplate = typeof surveyTemplates.$inferInsert;
export const insertSurveyTemplateSchema = createInsertSchema(surveyTemplates).omit({ id: true, createdAt: true, updatedAt: true });

// Survey Responses table
export const surveyResponses = pgTable("survey_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").references(() => surveyTemplates.id).notNull(),
  respondentType: surveyRespondentTypeEnum("respondent_type").notNull(),
  respondentId: varchar("respondent_id"),
  respondentName: varchar("respondent_name"),
  respondentEmail: varchar("respondent_email"),
  clientId: varchar("client_id").references(() => clients.id),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id),
  officeId: varchar("office_id").references(() => offices.id),
  sentAt: timestamp("sent_at"),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"),
  status: surveyStatusEnum("status").default("pending"),
  responses: jsonb("responses"), // array of {questionId, answer, rating}
  overallRating: integer("overall_rating"),
  comments: text("comments"),
  isAnonymous: boolean("is_anonymous").default(false),
  accessToken: varchar("access_token").unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const surveyTemplatesRelations = relations(surveyTemplates, ({ many }) => ({
  responses: many(surveyResponses),
}));

export const surveyResponsesRelations = relations(surveyResponses, ({ one }) => ({
  template: one(surveyTemplates, { fields: [surveyResponses.templateId], references: [surveyTemplates.id] }),
  client: one(clients, { fields: [surveyResponses.clientId], references: [clients.id] }),
  caregiver: one(caregivers, { fields: [surveyResponses.caregiverId], references: [caregivers.id] }),
  office: one(offices, { fields: [surveyResponses.officeId], references: [offices.id] }),
}));

export type SurveyResponse = typeof surveyResponses.$inferSelect;
export type InsertSurveyResponse = typeof surveyResponses.$inferInsert;
export const insertSurveyResponseSchema = createInsertSchema(surveyResponses).omit({ id: true, createdAt: true });

// ==================== CLAIMS MANAGEMENT ====================

// Claim status enum
export const claimStatusEnum = pgEnum("claim_status", [
  "draft", "submitted", "pending", "approved", "denied", "partial", "paid", "void"
]);

// Claims table for electronic claims submission and tracking
export const claims = pgTable("claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id),
  officeId: varchar("office_id").references(() => offices.id),
  mcoId: varchar("mco_id").references(() => mcos.id),
  claimNumber: varchar("claim_number").unique().notNull(),
  serviceDate: timestamp("service_date").notNull(),
  serviceEndDate: timestamp("service_end_date"),
  serviceType: varchar("service_type"),
  units: numeric("units", { precision: 10, scale: 2 }),
  billedAmount: numeric("billed_amount", { precision: 10, scale: 2 }),
  approvedAmount: numeric("approved_amount", { precision: 10, scale: 2 }),
  paidAmount: numeric("paid_amount", { precision: 10, scale: 2 }),
  adjustmentAmount: numeric("adjustment_amount", { precision: 10, scale: 2 }),
  adjustmentReason: text("adjustment_reason"),
  status: claimStatusEnum("status").default("draft"),
  submittedAt: timestamp("submitted_at"),
  processedAt: timestamp("processed_at"),
  paidAt: timestamp("paid_at"),
  denialReason: text("denial_reason"),
  denialCode: varchar("denial_code"),
  resubmissionCount: integer("resubmission_count").default(0),
  originalClaimId: varchar("original_claim_id"),
  notes: text("notes"),
  externalClaimId: varchar("external_claim_id"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const claimsRelations = relations(claims, ({ one, many }) => ({
  client: one(clients, { fields: [claims.clientId], references: [clients.id] }),
  caregiver: one(caregivers, { fields: [claims.caregiverId], references: [caregivers.id] }),
  office: one(offices, { fields: [claims.officeId], references: [offices.id] }),
  mco: one(mcos, { fields: [claims.mcoId], references: [mcos.id] }),
  createdByUser: one(users, { fields: [claims.createdBy], references: [users.id] }),
  originalClaim: one(claims, { fields: [claims.originalClaimId], references: [claims.id] }),
  lineItems: many(claimLineItems),
}));

export type Claim = typeof claims.$inferSelect;
export type InsertClaim = typeof claims.$inferInsert;
export const insertClaimSchema = createInsertSchema(claims).omit({ id: true, createdAt: true, updatedAt: true });

// Claim Line Items table for detailed services within a claim
export const claimLineItems = pgTable("claim_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  claimId: varchar("claim_id").references(() => claims.id, { onDelete: "cascade" }).notNull(),
  procedureCode: varchar("procedure_code").notNull(),
  modifier: varchar("modifier"),
  units: numeric("units", { precision: 10, scale: 2 }),
  rate: numeric("rate", { precision: 10, scale: 2 }),
  amount: numeric("amount", { precision: 10, scale: 2 }),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const claimLineItemsRelations = relations(claimLineItems, ({ one }) => ({
  claim: one(claims, { fields: [claimLineItems.claimId], references: [claims.id] }),
}));

export type ClaimLineItem = typeof claimLineItems.$inferSelect;
export type InsertClaimLineItem = typeof claimLineItems.$inferInsert;
export const insertClaimLineItemSchema = createInsertSchema(claimLineItems).omit({ id: true, createdAt: true });

// ==================== REFERRAL SOURCE TRACKING ====================

// Referral source type enum
export const referralSourceTypeEnum = pgEnum("referral_source_type", [
  "physician", "hospital", "insurance", "family", "advertising", "website", "other"
]);

// Referral status enum
export const referralStatusEnum = pgEnum("referral_status", [
  "new", "contacted", "in_progress", "converted", "lost"
]);

// Referral Sources table - track where clients come from
export const referralSources = pgTable("referral_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  type: referralSourceTypeEnum("type").notNull(),
  contactName: varchar("contact_name"),
  contactEmail: varchar("contact_email"),
  contactPhone: varchar("contact_phone"),
  address: text("address"),
  notes: text("notes"),
  officeId: varchar("office_id").references(() => offices.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const referralSourcesRelations = relations(referralSources, ({ one, many }) => ({
  office: one(offices, { fields: [referralSources.officeId], references: [offices.id] }),
  clientReferrals: many(clientReferrals),
}));

export type ReferralSource = typeof referralSources.$inferSelect;
export type InsertReferralSource = typeof referralSources.$inferInsert;
export const insertReferralSourceSchema = createInsertSchema(referralSources).omit({ id: true, createdAt: true, updatedAt: true });

// Client Referrals table - links clients to their referral sources
export const clientReferrals = pgTable("client_referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id),
  referralSourceId: varchar("referral_source_id").references(() => referralSources.id).notNull(),
  referralDate: timestamp("referral_date").defaultNow(),
  referralNotes: text("referral_notes"),
  convertedToClient: boolean("converted_to_client").default(false),
  conversionDate: timestamp("conversion_date"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  status: referralStatusEnum("status").default("new"),
  lostReason: text("lost_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const clientReferralsRelations = relations(clientReferrals, ({ one }) => ({
  client: one(clients, { fields: [clientReferrals.clientId], references: [clients.id] }),
  referralSource: one(referralSources, { fields: [clientReferrals.referralSourceId], references: [referralSources.id] }),
  assignedToUser: one(users, { fields: [clientReferrals.assignedTo], references: [users.id] }),
}));

export type ClientReferral = typeof clientReferrals.$inferSelect;
export type InsertClientReferral = typeof clientReferrals.$inferInsert;
export const insertClientReferralSchema = createInsertSchema(clientReferrals).omit({ id: true, createdAt: true, updatedAt: true });

// ==================== HHAX INTEGRATION ====================

// HHAX sync type enum
export const hhaxSyncTypeEnum = pgEnum("hhax_sync_type", [
  "caregivers", "clients", "schedules", "visits", "authorizations"
]);

// HHAX sync status enum
export const hhaxSyncStatusEnum = pgEnum("hhax_sync_status", [
  "pending", "in_progress", "completed", "failed", "partial"
]);

// HHAX Office Mapping - maps HHAX offices to local offices
export const hhaxOfficeMappings = pgTable("hhax_office_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  officeId: varchar("office_id").references(() => offices.id).notNull(),
  hhaxOfficeName: varchar("hhax_office_name").notNull(),
  hhaxOfficeCode: varchar("hhax_office_code"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const hhaxOfficeMappingsRelations = relations(hhaxOfficeMappings, ({ one }) => ({
  office: one(offices, { fields: [hhaxOfficeMappings.officeId], references: [offices.id] }),
}));

export type HhaxOfficeMapping = typeof hhaxOfficeMappings.$inferSelect;
export type InsertHhaxOfficeMapping = typeof hhaxOfficeMappings.$inferInsert;
export const insertHhaxOfficeMappingSchema = createInsertSchema(hhaxOfficeMappings).omit({ id: true, createdAt: true, updatedAt: true });

// HHAX Sync Logs - track import/export operations
export const hhaxSyncLogs = pgTable("hhax_sync_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  syncType: hhaxSyncTypeEnum("sync_type").notNull(),
  status: hhaxSyncStatusEnum("status").default("pending"),
  fileName: varchar("file_name"),
  recordsTotal: integer("records_total").default(0),
  recordsCreated: integer("records_created").default(0),
  recordsUpdated: integer("records_updated").default(0),
  recordsSkipped: integer("records_skipped").default(0),
  recordsFailed: integer("records_failed").default(0),
  errorDetails: jsonb("error_details"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  initiatedBy: varchar("initiated_by").references(() => users.id),
  officeId: varchar("office_id").references(() => offices.id),
});

export const hhaxSyncLogsRelations = relations(hhaxSyncLogs, ({ one }) => ({
  initiator: one(users, { fields: [hhaxSyncLogs.initiatedBy], references: [users.id] }),
  office: one(offices, { fields: [hhaxSyncLogs.officeId], references: [offices.id] }),
}));

export type HhaxSyncLog = typeof hhaxSyncLogs.$inferSelect;
export type InsertHhaxSyncLog = typeof hhaxSyncLogs.$inferInsert;
export const insertHhaxSyncLogSchema = createInsertSchema(hhaxSyncLogs).omit({ id: true, startedAt: true });

// ==================== EXCLUSION VERIFICATION ====================

// Exclusion source type enum
export const exclusionSourceTypeEnum = pgEnum("exclusion_source_type", [
  "oig", "medicheck", "sam"
]);

// Exclusion check status enum
export const exclusionCheckStatusEnum = pgEnum("exclusion_check_status", [
  "clear", "possible_match", "confirmed_excluded", "false_positive"
]);

// Exclusion match type enum
export const exclusionMatchTypeEnum = pgEnum("exclusion_match_type", [
  "exact", "fuzzy"
]);

// Exclusion Sources - OIG, Medicheck, SAM.gov data sources
export const exclusionSources = pgTable("exclusion_sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  type: exclusionSourceTypeEnum("type").notNull(),
  dataUrl: text("data_url"),
  description: text("description"),
  refreshFrequency: varchar("refresh_frequency").default("monthly"),
  lastFetchedAt: timestamp("last_fetched_at"),
  lastRecordCount: integer("last_record_count").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ExclusionSource = typeof exclusionSources.$inferSelect;
export type InsertExclusionSource = typeof exclusionSources.$inferInsert;
export const insertExclusionSourceSchema = createInsertSchema(exclusionSources).omit({ id: true, createdAt: true, updatedAt: true });

// Exclusion Records - actual exclusion entries from each source
export const exclusionRecords = pgTable("exclusion_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceId: varchar("source_id").references(() => exclusionSources.id).notNull(),
  externalIdentifier: varchar("external_identifier"),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  middleName: varchar("middle_name"),
  aliasNames: jsonb("alias_names"),
  dateOfBirth: timestamp("date_of_birth"),
  npi: varchar("npi"),
  ssn: varchar("ssn"),
  upin: varchar("upin"),
  address: text("address"),
  city: varchar("city"),
  state: varchar("state"),
  zipCode: varchar("zip_code"),
  exclusionType: varchar("exclusion_type"),
  exclusionDate: timestamp("exclusion_date"),
  reinstateDate: timestamp("reinstate_date"),
  waiverDate: timestamp("waiver_date"),
  waiverState: varchar("waiver_state"),
  specialty: varchar("specialty"),
  general: varchar("general"),
  rawPayload: jsonb("raw_payload"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_exclusion_records_name").on(table.lastName, table.firstName),
  index("idx_exclusion_records_source").on(table.sourceId),
]);

export const exclusionRecordsRelations = relations(exclusionRecords, ({ one }) => ({
  source: one(exclusionSources, { fields: [exclusionRecords.sourceId], references: [exclusionSources.id] }),
}));

export type ExclusionRecord = typeof exclusionRecords.$inferSelect;
export type InsertExclusionRecord = typeof exclusionRecords.$inferInsert;
export const insertExclusionRecordSchema = createInsertSchema(exclusionRecords).omit({ id: true, createdAt: true, updatedAt: true });

// Caregiver Exclusion Checks - verification results for each caregiver
export const caregiverExclusionChecks = pgTable("caregiver_exclusion_checks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id).notNull(),
  sourceId: varchar("source_id").references(() => exclusionSources.id).notNull(),
  exclusionRecordId: varchar("exclusion_record_id").references(() => exclusionRecords.id),
  status: exclusionCheckStatusEnum("status").default("clear"),
  matchType: exclusionMatchTypeEnum("match_type"),
  matchScore: numeric("match_score"),
  matchedFirstName: varchar("matched_first_name"),
  matchedLastName: varchar("matched_last_name"),
  checkedAt: timestamp("checked_at").defaultNow(),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  autoFlag: boolean("auto_flag").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_caregiver_exclusion_checks_caregiver").on(table.caregiverId),
  index("idx_caregiver_exclusion_checks_status").on(table.status),
]);

export const caregiverExclusionChecksRelations = relations(caregiverExclusionChecks, ({ one }) => ({
  caregiver: one(caregivers, { fields: [caregiverExclusionChecks.caregiverId], references: [caregivers.id] }),
  source: one(exclusionSources, { fields: [caregiverExclusionChecks.sourceId], references: [exclusionSources.id] }),
  exclusionRecord: one(exclusionRecords, { fields: [caregiverExclusionChecks.exclusionRecordId], references: [exclusionRecords.id] }),
  reviewer: one(users, { fields: [caregiverExclusionChecks.reviewedBy], references: [users.id] }),
}));

export type CaregiverExclusionCheck = typeof caregiverExclusionChecks.$inferSelect;
export type InsertCaregiverExclusionCheck = typeof caregiverExclusionChecks.$inferInsert;
export const insertCaregiverExclusionCheckSchema = createInsertSchema(caregiverExclusionChecks).omit({ id: true, createdAt: true, updatedAt: true });

// Caregiver Exclusion False Positives - manage matches that should be ignored
export const caregiverExclusionFalsePositives = pgTable("caregiver_exclusion_false_positives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id).notNull(),
  sourceId: varchar("source_id").references(() => exclusionSources.id).notNull(),
  exclusionRecordId: varchar("exclusion_record_id").references(() => exclusionRecords.id),
  matchSignature: varchar("match_signature").notNull(),
  reason: text("reason"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_caregiver_false_positives_signature").on(table.matchSignature),
  index("idx_caregiver_false_positives_caregiver").on(table.caregiverId),
]);

export const caregiverExclusionFalsePositivesRelations = relations(caregiverExclusionFalsePositives, ({ one }) => ({
  caregiver: one(caregivers, { fields: [caregiverExclusionFalsePositives.caregiverId], references: [caregivers.id] }),
  source: one(exclusionSources, { fields: [caregiverExclusionFalsePositives.sourceId], references: [exclusionSources.id] }),
  exclusionRecord: one(exclusionRecords, { fields: [caregiverExclusionFalsePositives.exclusionRecordId], references: [exclusionRecords.id] }),
  creator: one(users, { fields: [caregiverExclusionFalsePositives.createdBy], references: [users.id] }),
}));

export type CaregiverExclusionFalsePositive = typeof caregiverExclusionFalsePositives.$inferSelect;
export type InsertCaregiverExclusionFalsePositive = typeof caregiverExclusionFalsePositives.$inferInsert;
export const insertCaregiverExclusionFalsePositiveSchema = createInsertSchema(caregiverExclusionFalsePositives).omit({ id: true, createdAt: true });

// Exclusion Reports - monthly report tracking
export const exclusionReports = pgTable("exclusion_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportMonth: timestamp("report_month").notNull(),
  totalCaregiversChecked: integer("total_caregivers_checked").default(0),
  totalClear: integer("total_clear").default(0),
  totalPossibleMatches: integer("total_possible_matches").default(0),
  totalConfirmedExcluded: integer("total_confirmed_excluded").default(0),
  totalFalsePositives: integer("total_false_positives").default(0),
  oigRecordsCount: integer("oig_records_count").default(0),
  medicheckRecordsCount: integer("medicheck_records_count").default(0),
  samRecordsCount: integer("sam_records_count").default(0),
  reportData: jsonb("report_data"),
  reportFilePath: varchar("report_file_path"),
  generatedBy: varchar("generated_by").references(() => users.id),
  generatedAt: timestamp("generated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const exclusionReportsRelations = relations(exclusionReports, ({ one }) => ({
  generator: one(users, { fields: [exclusionReports.generatedBy], references: [users.id] }),
}));

export type ExclusionReport = typeof exclusionReports.$inferSelect;
export type InsertExclusionReport = typeof exclusionReports.$inferInsert;
export const insertExclusionReportSchema = createInsertSchema(exclusionReports).omit({ id: true, createdAt: true, generatedAt: true });

// ============================================
// SaaS Multi-Tenancy and Subscription Schema
// ============================================

// Organization status enum
export const organizationStatusEnum = pgEnum("organization_status", ["pending", "active", "suspended", "cancelled"]);

// Organizations (Tenants) - Home Care Agencies
export const organizations = pgTable("organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  slug: varchar("slug").unique().notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone"),
  address: text("address"),
  city: varchar("city"),
  state: varchar("state"),
  zipCode: varchar("zip_code"),
  status: organizationStatusEnum("status").default("pending"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionPlanId: varchar("subscription_plan_id"),
  subscriptionStatus: varchar("subscription_status").default("inactive"),
  clientLimit: integer("client_limit").default(10),
  currentClientCount: integer("current_client_count").default(0),
  trialEndsAt: timestamp("trial_ends_at"),
  billingEmail: varchar("billing_email"),
  logoUrl: varchar("logo_url"),
  settings: jsonb("settings"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_organizations_slug").on(table.slug),
  index("idx_organizations_stripe_customer").on(table.stripeCustomerId),
  index("idx_organizations_status").on(table.status),
]);

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  offices: many(offices),
  clients: many(clients),
  caregivers: many(caregivers),
}));

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = typeof organizations.$inferInsert;
export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true, createdAt: true, updatedAt: true });

// Subscription Plans - Pricing Tiers
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  stripePriceId: varchar("stripe_price_id"),
  stripeProductId: varchar("stripe_product_id"),
  priceMonthly: integer("price_monthly").notNull(),
  clientLimitMin: integer("client_limit_min").notNull(),
  clientLimitMax: integer("client_limit_max").notNull(),
  features: text("features").array(),
  isPopular: boolean("is_popular").default(false),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_subscription_plans_active").on(table.isActive),
  index("idx_subscription_plans_sort").on(table.sortOrder),
]);

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({ id: true, createdAt: true, updatedAt: true });

// Subscription History - Track subscription changes
export const subscriptionHistory = pgTable("subscription_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  planId: varchar("plan_id").references(() => subscriptionPlans.id),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  stripeInvoiceId: varchar("stripe_invoice_id"),
  action: varchar("action").notNull(),
  status: varchar("status"),
  amount: integer("amount"),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_subscription_history_org").on(table.organizationId),
]);

export const subscriptionHistoryRelations = relations(subscriptionHistory, ({ one }) => ({
  organization: one(organizations, { fields: [subscriptionHistory.organizationId], references: [organizations.id] }),
  plan: one(subscriptionPlans, { fields: [subscriptionHistory.planId], references: [subscriptionPlans.id] }),
}));

export type SubscriptionHistoryRecord = typeof subscriptionHistory.$inferSelect;
export type InsertSubscriptionHistoryRecord = typeof subscriptionHistory.$inferInsert;
export const insertSubscriptionHistorySchema = createInsertSchema(subscriptionHistory).omit({ id: true, createdAt: true });

// ============================================
// Feature Access Control
// ============================================

// Subscription Features - All gatable features in the system
export const subscriptionFeatures = pgTable("subscription_features", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key").unique().notNull(), // e.g., "evv_tracking", "billing_payroll"
  name: varchar("name").notNull(),
  description: text("description"),
  category: varchar("category"), // "core", "compliance", "billing", "advanced"
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_subscription_features_key").on(table.key),
]);

export type SubscriptionFeature = typeof subscriptionFeatures.$inferSelect;
export type InsertSubscriptionFeature = typeof subscriptionFeatures.$inferInsert;
export const insertSubscriptionFeatureSchema = createInsertSchema(subscriptionFeatures).omit({ id: true, createdAt: true });

// Plan Features - Mapping between plans and features they include
export const planFeatures = pgTable("plan_features", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").references(() => subscriptionPlans.id).notNull(),
  featureId: varchar("feature_id").references(() => subscriptionFeatures.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_plan_features_plan").on(table.planId),
  index("idx_plan_features_feature").on(table.featureId),
]);

export const planFeaturesRelations = relations(planFeatures, ({ one }) => ({
  plan: one(subscriptionPlans, { fields: [planFeatures.planId], references: [subscriptionPlans.id] }),
  feature: one(subscriptionFeatures, { fields: [planFeatures.featureId], references: [subscriptionFeatures.id] }),
}));

export type PlanFeature = typeof planFeatures.$inferSelect;
export type InsertPlanFeature = typeof planFeatures.$inferInsert;
export const insertPlanFeatureSchema = createInsertSchema(planFeatures).omit({ id: true, createdAt: true });

// ============================================
// External API Access
// ============================================

// API Keys for external integrations
export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  name: varchar("name").notNull(), // User-friendly name for the key
  keyPrefix: varchar("key_prefix").notNull(), // First 8 chars for identification
  keyHash: varchar("key_hash").notNull(), // Hashed API key for verification
  scopes: text("scopes").array(), // ["read:clients", "write:clients", etc.]
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  requestCount: integer("request_count").default(0),
  rateLimit: integer("rate_limit").default(1000), // requests per hour
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_api_keys_organization").on(table.organizationId),
  index("idx_api_keys_prefix").on(table.keyPrefix),
]);

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  organization: one(organizations, { fields: [apiKeys.organizationId], references: [organizations.id] }),
  creator: one(users, { fields: [apiKeys.createdBy], references: [users.id] }),
}));

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;
export const insertApiKeySchema = createInsertSchema(apiKeys).omit({ id: true, createdAt: true, updatedAt: true, requestCount: true, lastUsedAt: true });

// API Usage Logs
export const apiUsageLogs = pgTable("api_usage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKeyId: varchar("api_key_id").references(() => apiKeys.id).notNull(),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  endpoint: varchar("endpoint").notNull(),
  method: varchar("method").notNull(),
  statusCode: integer("status_code"),
  responseTime: integer("response_time"), // in milliseconds
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  requestBody: jsonb("request_body"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_api_usage_logs_key").on(table.apiKeyId),
  index("idx_api_usage_logs_org").on(table.organizationId),
  index("idx_api_usage_logs_created").on(table.createdAt),
]);

export type ApiUsageLog = typeof apiUsageLogs.$inferSelect;
export type InsertApiUsageLog = typeof apiUsageLogs.$inferInsert;
export const insertApiUsageLogSchema = createInsertSchema(apiUsageLogs).omit({ id: true, createdAt: true });

// ============================================
// Support Tickets System
// ============================================

export const ticketStatusEnum = pgEnum("ticket_status", ["open", "in_progress", "waiting_on_customer", "resolved", "closed"]);
export const ticketPriorityEnum = pgEnum("ticket_priority", ["low", "medium", "high", "urgent"]);

export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  subject: varchar("subject").notNull(),
  description: text("description").notNull(),
  status: ticketStatusEnum("status").default("open"),
  priority: ticketPriorityEnum("priority").default("medium"),
  category: varchar("category"), // "technical", "billing", "feature_request", "general"
  assignedTo: varchar("assigned_to"),
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_support_tickets_org").on(table.organizationId),
  index("idx_support_tickets_user").on(table.userId),
  index("idx_support_tickets_status").on(table.status),
]);

export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  organization: one(organizations, { fields: [supportTickets.organizationId], references: [organizations.id] }),
  user: one(users, { fields: [supportTickets.userId], references: [users.id] }),
  messages: many(ticketMessages),
}));

export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = typeof supportTickets.$inferInsert;
export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({ id: true, createdAt: true, updatedAt: true, resolvedAt: true, closedAt: true });

// Ticket Messages - Replies on support tickets
export const ticketMessages = pgTable("ticket_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").references(() => supportTickets.id).notNull(),
  userId: varchar("user_id").references(() => users.id),
  isStaffReply: boolean("is_staff_reply").default(false),
  message: text("message").notNull(),
  attachments: jsonb("attachments"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_ticket_messages_ticket").on(table.ticketId),
]);

export const ticketMessagesRelations = relations(ticketMessages, ({ one }) => ({
  ticket: one(supportTickets, { fields: [ticketMessages.ticketId], references: [supportTickets.id] }),
  user: one(users, { fields: [ticketMessages.userId], references: [users.id] }),
}));

export type TicketMessage = typeof ticketMessages.$inferSelect;
export type InsertTicketMessage = typeof ticketMessages.$inferInsert;
export const insertTicketMessageSchema = createInsertSchema(ticketMessages).omit({ id: true, createdAt: true });

// ============================================
// Custom Integrations (Enterprise)
// ============================================

export const integrationStatusEnum = pgEnum("integration_status", ["pending", "active", "error", "disabled"]);

export const customIntegrations = pgTable("custom_integrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id").references(() => organizations.id).notNull(),
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // "webhook", "sftp", "api", "ehr"
  status: integrationStatusEnum("status").default("pending"),
  config: jsonb("config"), // Integration-specific configuration
  credentials: jsonb("credentials"), // Encrypted credentials
  lastSyncAt: timestamp("last_sync_at"),
  lastError: text("last_error"),
  syncFrequency: varchar("sync_frequency"), // "realtime", "hourly", "daily"
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_custom_integrations_org").on(table.organizationId),
  index("idx_custom_integrations_type").on(table.type),
]);

export const customIntegrationsRelations = relations(customIntegrations, ({ one }) => ({
  organization: one(organizations, { fields: [customIntegrations.organizationId], references: [organizations.id] }),
  creator: one(users, { fields: [customIntegrations.createdBy], references: [users.id] }),
}));

export type CustomIntegration = typeof customIntegrations.$inferSelect;
export type InsertCustomIntegration = typeof customIntegrations.$inferInsert;
export const insertCustomIntegrationSchema = createInsertSchema(customIntegrations).omit({ id: true, createdAt: true, updatedAt: true, lastSyncAt: true, lastError: true });

// ============================================
// Documentation Articles (Help Center)
// ============================================

export const helpArticles = pgTable("help_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug").unique().notNull(),
  title: varchar("title").notNull(),
  content: text("content").notNull(), // Markdown content
  category: varchar("category").notNull(), // "getting-started", "clients", "caregivers", etc.
  subcategory: varchar("subcategory"),
  order: integer("order").default(0),
  isPublished: boolean("is_published").default(true),
  featuredImage: varchar("featured_image"),
  tags: text("tags").array(),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_help_articles_slug").on(table.slug),
  index("idx_help_articles_category").on(table.category),
]);

export type HelpArticle = typeof helpArticles.$inferSelect;
export type InsertHelpArticle = typeof helpArticles.$inferInsert;
export const insertHelpArticleSchema = createInsertSchema(helpArticles).omit({ id: true, createdAt: true, updatedAt: true, viewCount: true });

// ============================================
// Letter Templates (Office Admin Managed)
// ============================================

export const templateScopeEnum = pgEnum("template_scope", ["caregiver", "client", "staff", "general"]);
export const templateStatusEnum = pgEnum("template_status", ["draft", "published", "archived"]);

export const letterTemplates = pgTable("letter_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  officeId: varchar("office_id").references(() => offices.id),
  name: varchar("name").notNull(),
  description: text("description"),
  scope: templateScopeEnum("scope").default("general"),
  category: varchar("category"), // employment_verification, welcome_letter, termination, etc.
  status: templateStatusEnum("status").default("draft"),
  htmlContent: text("html_content").notNull(), // HTML with {{placeholders}}
  themeSettings: jsonb("theme_settings"), // fonts, colors, margins, header/footer
  placeholders: jsonb("placeholders"), // List of available placeholders for this template
  isDefault: boolean("is_default").default(false),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_letter_templates_office").on(table.officeId),
  index("idx_letter_templates_scope").on(table.scope),
  index("idx_letter_templates_status").on(table.status),
]);

export const letterTemplatesRelations = relations(letterTemplates, ({ one, many }) => ({
  office: one(offices, { fields: [letterTemplates.officeId], references: [offices.id] }),
  creator: one(users, { fields: [letterTemplates.createdBy], references: [users.id] }),
  updater: one(users, { fields: [letterTemplates.updatedBy], references: [users.id] }),
  versions: many(letterTemplateVersions),
  generatedLetters: many(generatedLetters),
}));

export type LetterTemplate = typeof letterTemplates.$inferSelect;
export type InsertLetterTemplate = typeof letterTemplates.$inferInsert;
export const insertLetterTemplateSchema = createInsertSchema(letterTemplates).omit({ id: true, createdAt: true, updatedAt: true });

// Letter Template Versions (for version history)
export const letterTemplateVersions = pgTable("letter_template_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").references(() => letterTemplates.id).notNull(),
  versionNumber: integer("version_number").notNull(),
  htmlContent: text("html_content").notNull(),
  themeSettings: jsonb("theme_settings"),
  placeholders: jsonb("placeholders"),
  changeNotes: text("change_notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_template_versions_template").on(table.templateId),
]);

export const letterTemplateVersionsRelations = relations(letterTemplateVersions, ({ one }) => ({
  template: one(letterTemplates, { fields: [letterTemplateVersions.templateId], references: [letterTemplates.id] }),
  creator: one(users, { fields: [letterTemplateVersions.createdBy], references: [users.id] }),
}));

export type LetterTemplateVersion = typeof letterTemplateVersions.$inferSelect;
export type InsertLetterTemplateVersion = typeof letterTemplateVersions.$inferInsert;
export const insertLetterTemplateVersionSchema = createInsertSchema(letterTemplateVersions).omit({ id: true, createdAt: true });

// Generated Letters (audit log of generated documents)
export const generatedLetters = pgTable("generated_letters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").references(() => letterTemplates.id),
  documentId: varchar("document_id").references(() => documents.id),
  scope: templateScopeEnum("scope").notNull(),
  targetId: varchar("target_id").notNull(), // caregiverId, clientId, or userId based on scope
  mergedData: jsonb("merged_data"), // The data that was merged into placeholders
  generatedBy: varchar("generated_by").references(() => users.id),
  officeId: varchar("office_id").references(() => offices.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_generated_letters_template").on(table.templateId),
  index("idx_generated_letters_target").on(table.targetId),
  index("idx_generated_letters_scope").on(table.scope),
]);

export const generatedLettersRelations = relations(generatedLetters, ({ one }) => ({
  template: one(letterTemplates, { fields: [generatedLetters.templateId], references: [letterTemplates.id] }),
  document: one(documents, { fields: [generatedLetters.documentId], references: [documents.id] }),
  generator: one(users, { fields: [generatedLetters.generatedBy], references: [users.id] }),
  office: one(offices, { fields: [generatedLetters.officeId], references: [offices.id] }),
}));

export type GeneratedLetter = typeof generatedLetters.$inferSelect;
export type InsertGeneratedLetter = typeof generatedLetters.$inferInsert;
export const insertGeneratedLetterSchema = createInsertSchema(generatedLetters).omit({ id: true, createdAt: true });

// Coordinator Pay Records - Biweekly pay tracking for Care Coordinators
export const coordinatorPayRecords = pgTable("coordinator_pay_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coordinatorId: varchar("coordinator_id").references(() => coordinators.id).notNull(),
  officeId: varchar("office_id").references(() => offices.id),
  year: integer("year").notNull(),
  quarter: integer("quarter").notNull(), // 1, 2, 3, or 4
  payDateStart: timestamp("pay_date_start").notNull(),
  payDateEnd: timestamp("pay_date_end").notNull(),
  totalBilledHours: numeric("total_billed_hours", { precision: 10, scale: 2 }).default("0"),
  totalPayrollHours: numeric("total_payroll_hours", { precision: 10, scale: 2 }).default("0"),
  accrualAmount: numeric("accrual_amount", { precision: 10, scale: 2 }).default("0"),
  quarterlyBonus: numeric("quarterly_bonus", { precision: 10, scale: 2 }).default("0"),
  amountPaid: numeric("amount_paid", { precision: 10, scale: 2 }).default("0"),
  balanceRemaining: numeric("balance_remaining", { precision: 10, scale: 2 }).default("0"),
  notes: text("notes"),
  documentId: varchar("document_id").references(() => documents.id), // For uploaded pay document
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_coordinator_pay_records_coordinator").on(table.coordinatorId),
  index("idx_coordinator_pay_records_year_quarter").on(table.year, table.quarter),
  index("idx_coordinator_pay_records_office").on(table.officeId),
]);

export const coordinatorPayRecordsRelations = relations(coordinatorPayRecords, ({ one }) => ({
  coordinator: one(coordinators, { fields: [coordinatorPayRecords.coordinatorId], references: [coordinators.id] }),
  office: one(offices, { fields: [coordinatorPayRecords.officeId], references: [offices.id] }),
  document: one(documents, { fields: [coordinatorPayRecords.documentId], references: [documents.id] }),
  createdByUser: one(users, { fields: [coordinatorPayRecords.createdBy], references: [users.id] }),
}));

export type CoordinatorPayRecord = typeof coordinatorPayRecords.$inferSelect;
export type InsertCoordinatorPayRecord = typeof coordinatorPayRecords.$inferInsert;
export const insertCoordinatorPayRecordSchema = createInsertSchema(coordinatorPayRecords).omit({ id: true, createdAt: true, updatedAt: true });

// System Email Templates - Customizable email designs for system notifications
export const emailTemplateTypeEnum = pgEnum("email_template_type", [
  "password_reset",
  "welcome",
  "birthday_client",
  "birthday_caregiver",
  "schedule_change",
  "schedule_reminder",
  "compliance_alert",
  "general"
]);

export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: emailTemplateTypeEnum("type").notNull(),
  name: varchar("name").notNull(),
  subject: varchar("subject").notNull(),
  htmlContent: text("html_content").notNull(),
  textContent: text("text_content"),
  placeholders: jsonb("placeholders"), // Array of available placeholders for this template
  themeSettings: jsonb("theme_settings"), // Colors, fonts, logo URL, etc.
  isActive: boolean("is_active").default(true),
  isDefault: boolean("is_default").default(false),
  createdBy: varchar("created_by").references(() => users.id),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_email_templates_type").on(table.type),
  index("idx_email_templates_active").on(table.isActive),
]);

export const emailTemplatesRelations = relations(emailTemplates, ({ one }) => ({
  creator: one(users, { fields: [emailTemplates.createdBy], references: [users.id] }),
  updater: one(users, { fields: [emailTemplates.updatedBy], references: [users.id] }),
}));

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;
export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({ id: true, createdAt: true, updatedAt: true });

// E-Signature Templates
export const eSignatureTemplateStatusEnum = pgEnum("esign_template_status", ["draft", "active", "archived"]);

export const eSignatureTemplates = pgTable("esignature_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  content: text("content").notNull(),
  signatureFields: jsonb("signature_fields"),
  status: eSignatureTemplateStatusEnum("status").default("draft"),
  createdBy: varchar("created_by").references(() => users.id),
  officeId: varchar("office_id").references(() => offices.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_esignature_templates_office").on(table.officeId),
  index("idx_esignature_templates_status").on(table.status),
]);

export const eSignatureTemplatesRelations = relations(eSignatureTemplates, ({ one, many }) => ({
  creator: one(users, { fields: [eSignatureTemplates.createdBy], references: [users.id] }),
  office: one(offices, { fields: [eSignatureTemplates.officeId], references: [offices.id] }),
  requests: many(eSignatureRequests),
}));

export type ESignatureTemplate = typeof eSignatureTemplates.$inferSelect;
export type InsertESignatureTemplate = typeof eSignatureTemplates.$inferInsert;
export const insertESignatureTemplateSchema = createInsertSchema(eSignatureTemplates).omit({ id: true, createdAt: true, updatedAt: true });

// E-Signature Requests (sent for signing)
export const eSignatureRequestStatusEnum = pgEnum("esign_request_status", ["pending", "signed", "declined", "expired"]);

export const eSignatureRequests = pgTable("esignature_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").references(() => eSignatureTemplates.id),
  documentContent: text("document_content").notNull(),
  recipientEmail: varchar("recipient_email").notNull(),
  recipientName: varchar("recipient_name").notNull(),
  recipientType: varchar("recipient_type"),
  recipientId: varchar("recipient_id"),
  status: eSignatureRequestStatusEnum("status").default("pending"),
  accessToken: varchar("access_token").notNull().unique(),
  signedAt: timestamp("signed_at"),
  signatureData: jsonb("signature_data"),
  signedDocumentId: varchar("signed_document_id").references(() => documents.id),
  expiresAt: timestamp("expires_at"),
  sentBy: varchar("sent_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_esignature_requests_template").on(table.templateId),
  index("idx_esignature_requests_status").on(table.status),
  index("idx_esignature_requests_token").on(table.accessToken),
]);

export const eSignatureRequestsRelations = relations(eSignatureRequests, ({ one }) => ({
  template: one(eSignatureTemplates, { fields: [eSignatureRequests.templateId], references: [eSignatureTemplates.id] }),
  sender: one(users, { fields: [eSignatureRequests.sentBy], references: [users.id] }),
  signedDocument: one(documents, { fields: [eSignatureRequests.signedDocumentId], references: [documents.id] }),
}));

export type ESignatureRequest = typeof eSignatureRequests.$inferSelect;
export type InsertESignatureRequest = typeof eSignatureRequests.$inferInsert;
export const insertESignatureRequestSchema = createInsertSchema(eSignatureRequests).omit({ id: true, createdAt: true, updatedAt: true });
