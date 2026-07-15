import { sql } from 'drizzle-orm';
import {
  index,
  uniqueIndex,
  unique,
  foreignKey,
  jsonb,
  pgTable,
  timestamp,
  date,
  varchar,
  text,
  boolean,
  integer,
  numeric,
  pgEnum,
  primaryKey,
  smallint,
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
  // Kiosk clock-in
  kioskPin: varchar("kiosk_pin"),
  kioskEnabled: boolean("kiosk_enabled").default(false),
  // Employee directory: who this person reports to (self-reference) and
  // when they joined (shown on the unified employee directory page).
  managerId: varchar("manager_id"),
  hireDate: timestamp("hire_date"),
  // Offboarding (Task #137): when set, auto-creates an offboarding instance
  // from a matching template and triggers the termination workflow on the date.
  terminationDate: timestamp("termination_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_users_organization").on(table.organizationId),
  index("idx_users_google_id").on(table.googleId),
  index("idx_users_manager").on(table.managerId),
]);

// Per-user saved views and column visibility for list pages
export const userSavedViews = pgTable("user_saved_views", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  page: varchar("page").notNull(), // e.g. "caregivers", "clients"
  name: varchar("name").notNull(), // user-supplied; "__default" reserved for column prefs
  filters: jsonb("filters").$type<Record<string, unknown>>().default({}),
  columns: jsonb("columns").$type<Record<string, boolean>>().default({}),
  lastUsedAt: timestamp("last_used_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("uniq_user_saved_view").on(table.userId, table.page, table.name),
  index("idx_user_saved_views_user_page").on(table.userId, table.page),
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
  county: varchar("county"),
  hhaxAdmissionId: varchar("hhax_admission_id").unique(),
  // HHAX PatientCode (per-patient, distinct from per-admission AdmissionID).
  // Stored separately so the schedule importer can match schedules.PatientCode
  // back to clients even when AdmissionID was also present in the patient export.
  hhaxPatientCode: varchar("hhax_patient_code"),
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
  terminationDate: timestamp("termination_date"),
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
  npi: varchar("npi"),
  isActive: boolean("is_active").default(true),
  // Employee directory: who this caregiver reports to (references users.id)
  managerId: varchar("manager_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_caregivers_manager").on(table.managerId),
]);

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
  documentCategory: varchar("document_category"), // admin-editable category: id, tax_form, certification, signed_policy, performance_review, write_up, other
  expiresAt: timestamp("expires_at"),
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
  // CIR (Critical Incident Reporting) DOH fields
  cirClass: varchar("cir_class"), // class_1, class_2, not_applicable
  dohReportDue: timestamp("doh_report_due"),
  dohSubmittedAt: timestamp("doh_submitted_at"),
  dohSubmissionRef: varchar("doh_submission_ref"),
  dohSubmissionStatus: varchar("doh_submission_status").default("not_required"), // not_required, pending, submitted, acknowledged
  internalInvestigationNotes: text("internal_investigation_notes"),
  correctiveActionRequired: boolean("corrective_action_required").default(false),
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

export type UserSavedView = typeof userSavedViews.$inferSelect;
export type InsertUserSavedView = typeof userSavedViews.$inferInsert;
export const insertUserSavedViewSchema = createInsertSchema(userSavedViews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

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

// Office Staff Paychecks — mirrors caregiver_paychecks for non-caregiver employees.
// Lets office staff see paystubs in the self-service portal alongside caregivers.
export const officeStaffPaychecks = pgTable("office_staff_paychecks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
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
  status: varchar("status").default("pending"),
  checkNumber: varchar("check_number"),
  paystubDocumentId: varchar("paystub_document_id").references(() => documents.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type OfficeStaffPaycheck = typeof officeStaffPaychecks.$inferSelect;
export type InsertOfficeStaffPaycheck = typeof officeStaffPaychecks.$inferInsert;
export const insertOfficeStaffPaycheckSchema = createInsertSchema(officeStaffPaychecks).omit({ id: true, createdAt: true, updatedAt: true });

// Employee Tax Forms — current W-4 / direct-deposit / state-withholding forms
// on file for an employee (caregiver or user). The actual signed PDF lives in
// the documents table; this row tracks which document is the current copy.
export const employeeTaxForms = pgTable("employee_tax_forms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id"),
  employeeType: varchar("employee_type").notNull(), // 'caregiver' | 'user'
  employeeId: varchar("employee_id").notNull(),
  formType: varchar("form_type").notNull(), // 'w4' | 'direct_deposit' | 'state_withholding'
  documentId: varchar("document_id").references(() => documents.id),
  signedAt: timestamp("signed_at"),
  effectiveDate: timestamp("effective_date"),
  isCurrent: boolean("is_current").default(true),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type EmployeeTaxForm = typeof employeeTaxForms.$inferSelect;
export type InsertEmployeeTaxForm = typeof employeeTaxForms.$inferInsert;
export const insertEmployeeTaxFormSchema = createInsertSchema(employeeTaxForms).omit({ id: true, createdAt: true, updatedAt: true });

// Tax-form change requests — submitted by employee, reviewed by HR, optionally
// resolved by re-signing a new tax form via eSignature.
export const employeeTaxFormChangeRequests = pgTable("employee_tax_form_change_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id"),
  employeeType: varchar("employee_type").notNull(),
  employeeId: varchar("employee_id").notNull(),
  requestedByUserId: varchar("requested_by_user_id").references(() => users.id),
  formType: varchar("form_type").notNull(),
  reason: text("reason"),
  status: varchar("status").default("pending"), // pending, in_review, completed, rejected
  hrTaskId: varchar("hr_task_id").references(() => tasks.id),
  esignatureRequestId: varchar("esignature_request_id").references(() => eSignatureRequests.id),
  reviewedByUserId: varchar("reviewed_by_user_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type EmployeeTaxFormChangeRequest = typeof employeeTaxFormChangeRequests.$inferSelect;
export type InsertEmployeeTaxFormChangeRequest = typeof employeeTaxFormChangeRequests.$inferInsert;
export const insertEmployeeTaxFormChangeRequestSchema = createInsertSchema(employeeTaxFormChangeRequests).omit({
  id: true, createdAt: true, updatedAt: true, reviewedAt: true, reviewedByUserId: true,
  hrTaskId: true, esignatureRequestId: true, status: true,
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
  clockInPhoto: text("clock_in_photo"),
  clockOutPhoto: text("clock_out_photo"),
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

// ==================== EMPLOYEE WRITE-UPS / DISCIPLINARY NOTES ====================
// Polymorphic table covering both caregivers (employeeType = 'caregiver')
// and office-staff users (employeeType = 'user'). Generalises the
// caregiver_notes.disciplinary/commendation pattern with a formal
// write-up workflow (severity, action plan, follow-up date, acknowledgement).
export const employeeNoteTypeEnum = pgEnum("employee_note_type", [
  "coaching",
  "verbal_warning",
  "written_warning",
  "final_warning",
  "pip",
  "commendation",
  "performance",
  "general",
]);

export const employeeNoteSeverityEnum = pgEnum("employee_note_severity", [
  "low",
  "medium",
  "high",
  "critical",
]);

export const employeeNoteFollowUpStatusEnum = pgEnum("employee_note_follow_up_status", [
  "open",
  "resolved",
  "cancelled",
]);

export const employeeNotes = pgTable("employee_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id"),
  officeId: varchar("office_id").references(() => offices.id),
  employeeType: varchar("employee_type").notNull(), // 'caregiver' | 'user'
  employeeId: varchar("employee_id").notNull(),
  authorId: varchar("author_id").references(() => users.id),
  noteType: employeeNoteTypeEnum("note_type").notNull().default("coaching"),
  severity: employeeNoteSeverityEnum("severity").default("low"),
  subject: varchar("subject"),
  summary: text("summary").notNull(), // the write-up narrative (encrypted at rest)
  incidentDate: timestamp("incident_date"),
  actionPlan: text("action_plan"),
  followUpDate: timestamp("follow_up_date"),
  followUpStatus: employeeNoteFollowUpStatusEnum("follow_up_status").default("open"),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolutionNotes: text("resolution_notes"),
  attachmentDocumentIds: text("attachment_document_ids").array(),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgmentSignatureName: varchar("acknowledgment_signature_name"),
  acknowledgmentIp: varchar("acknowledgment_ip"),
  acknowledgmentNotes: text("acknowledgment_notes"),
  sourceCaregiverNoteId: varchar("source_caregiver_note_id"), // backfill provenance
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_employee_notes_employee").on(table.employeeType, table.employeeId),
  index("idx_employee_notes_office").on(table.officeId),
  index("idx_employee_notes_follow_up").on(table.followUpStatus, table.followUpDate),
  index("idx_employee_notes_author").on(table.authorId),
]);

export const employeeNotesRelations = relations(employeeNotes, ({ one }) => ({
  author: one(users, { fields: [employeeNotes.authorId], references: [users.id] }),
  office: one(offices, { fields: [employeeNotes.officeId], references: [offices.id] }),
  resolvedByUser: one(users, { fields: [employeeNotes.resolvedBy], references: [users.id] }),
}));

export type EmployeeNote = typeof employeeNotes.$inferSelect;
export type InsertEmployeeNote = typeof employeeNotes.$inferInsert;
export const insertEmployeeNoteSchema = createInsertSchema(employeeNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  acknowledgedAt: true,
  acknowledgmentSignatureName: true,
  acknowledgmentIp: true,
  acknowledgmentNotes: true,
  resolvedAt: true,
  resolvedBy: true,
  resolutionNotes: true,
  sourceCaregiverNoteId: true,
});

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

// Client Authorizations - tracks service authorizations from MCOs
export const clientAuthorizations = pgTable("client_authorizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  mcoId: varchar("mco_id").references(() => mcos.id),
  officeId: varchar("office_id").references(() => offices.id),
  authorizationNumber: varchar("authorization_number").notNull(),
  serviceType: varchar("service_type").notNull(),
  approvedHours: numeric("approved_hours", { precision: 10, scale: 2 }),
  usedHours: numeric("used_hours", { precision: 10, scale: 2 }).default("0"),
  frequencyPerWeek: smallint("frequency_per_week"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  renewalDate: timestamp("renewal_date"),
  status: varchar("status").default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_client_authorizations_client").on(table.clientId),
  index("idx_client_authorizations_status").on(table.status),
]);

export const clientAuthorizationsRelations = relations(clientAuthorizations, ({ one }) => ({
  client: one(clients, { fields: [clientAuthorizations.clientId], references: [clients.id] }),
  mco: one(mcos, { fields: [clientAuthorizations.mcoId], references: [mcos.id] }),
  office: one(offices, { fields: [clientAuthorizations.officeId], references: [offices.id] }),
}));

export type ClientAuthorization = typeof clientAuthorizations.$inferSelect;
export type InsertClientAuthorization = typeof clientAuthorizations.$inferInsert;
export const insertClientAuthorizationSchema = createInsertSchema(clientAuthorizations).omit({ id: true, createdAt: true, updatedAt: true });

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

// PTO accrual frequency
export const ptoAccrualFrequencyEnum = pgEnum("pto_accrual_frequency", [
  "weekly", "biweekly", "semi_monthly", "monthly",
]);

// PTO ledger entry source
export const ptoLedgerSourceEnum = pgEnum("pto_ledger_source", [
  "accrual", "debit", "reversal", "adjustment", "carryover",
]);

// PTO Policies — accrual rules per role + office
export const ptoPolicies = pgTable("pto_policies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id"),
  name: varchar("name").notNull(),
  ptoType: ptoTypeEnum("pto_type").notNull(),
  role: varchar("role"), // null = any role
  officeId: varchar("office_id").references(() => offices.id), // null = any office
  hoursPerPeriod: numeric("hours_per_period", { precision: 10, scale: 2 }).notNull(),
  capHours: numeric("cap_hours", { precision: 10, scale: 2 }),
  accrualFrequency: ptoAccrualFrequencyEnum("accrual_frequency").default("biweekly"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_pto_policies_office").on(table.officeId),
  index("idx_pto_policies_role").on(table.role),
]);

export const ptoPoliciesRelations = relations(ptoPolicies, ({ one }) => ({
  office: one(offices, { fields: [ptoPolicies.officeId], references: [offices.id] }),
}));

export type PtoPolicy = typeof ptoPolicies.$inferSelect;
export type InsertPtoPolicy = typeof ptoPolicies.$inferInsert;
export const insertPtoPolicySchema = createInsertSchema(ptoPolicies).omit({ id: true, createdAt: true, updatedAt: true });

// PTO Ledger — immutable append-only entries that define balances
export const ptoLedger = pgTable("pto_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id).notNull(),
  ptoType: ptoTypeEnum("pto_type").notNull(),
  source: ptoLedgerSourceEnum("source").notNull(),
  deltaHours: numeric("delta_hours", { precision: 10, scale: 2 }).notNull(),
  runDate: date("run_date").notNull(),
  policyId: varchar("policy_id").references(() => ptoPolicies.id),
  sourceRequestId: varchar("source_request_id").references(() => timeOffRequests.id),
  reason: text("reason"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_pto_ledger_caregiver").on(table.caregiverId),
  index("idx_pto_ledger_request").on(table.sourceRequestId),
  // Note: actual uniqueness is enforced by partial unique indexes created in
  // migration 0010_pto_ledger_idempotency.sql:
  //   uq_pto_ledger_accrual_day: (caregiver_id, pto_type, run_date) WHERE source='accrual'
  //   uq_pto_ledger_request_event: (source_request_id, source) WHERE source_request_id IS NOT NULL AND source IN ('debit','reversal')
]);

export const ptoLedgerRelations = relations(ptoLedger, ({ one }) => ({
  caregiver: one(caregivers, { fields: [ptoLedger.caregiverId], references: [caregivers.id] }),
  policy: one(ptoPolicies, { fields: [ptoLedger.policyId], references: [ptoPolicies.id] }),
  sourceRequest: one(timeOffRequests, { fields: [ptoLedger.sourceRequestId], references: [timeOffRequests.id] }),
}));

export type PtoLedgerEntry = typeof ptoLedger.$inferSelect;
export type InsertPtoLedgerEntry = typeof ptoLedger.$inferInsert;
export const insertPtoLedgerEntrySchema = createInsertSchema(ptoLedger).omit({ id: true, createdAt: true });

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
  title: varchar("title"),
  suffix: varchar("suffix"),
  aliasName: varchar("alias_name"),
  aliasNames: jsonb("alias_names"),
  businessName: text("business_name"),
  dateOfBirth: timestamp("date_of_birth"),
  npi: varchar("npi"),
  licenseNumber: varchar("license_number"),
  fein: varchar("fein"),
  ssn: varchar("ssn"),
  upin: varchar("upin"),
  address: text("address"),
  city: varchar("city"),
  state: varchar("state"),
  zipCode: varchar("zip_code"),
  exclusionType: varchar("exclusion_type"),
  exclusionStatus: varchar("exclusion_status"),
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
  index("idx_exclusion_records_license").on(table.licenseNumber),
  index("idx_exclusion_records_npi").on(table.npi),
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
  matchReason: varchar("match_reason"),
  matchedIdentifier: varchar("matched_identifier"),
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
  "password_reset_caregiver",
  "signup_confirmation",
  "user_invitation",
  "welcome",
  "welcome_caregiver",
  "family_portal_invitation",
  "birthday_client",
  "birthday_caregiver",
  "schedule_change",
  "schedule_reminder",
  "evv_confirmation",
  "compliance_alert",
  "incident_report_notification",
  "esignature_request",
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
  uniqueIndex("email_templates_type_name_unique").on(table.type, table.name),
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

// SMS Message Logs - for Twilio webhook tracking
export const smsDirectionEnum = pgEnum("sms_direction", ["inbound", "outbound"]);
export const smsStatusEnum = pgEnum("sms_status", ["queued", "sending", "sent", "delivered", "undelivered", "failed", "received"]);

export const smsLogs = pgTable("sms_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id"),
  messageSid: varchar("message_sid").unique(),
  direction: smsDirectionEnum("direction").notNull(),
  fromNumber: varchar("from_number").notNull(),
  toNumber: varchar("to_number").notNull(),
  body: text("body"),
  status: smsStatusEnum("status").default("queued"),
  errorCode: varchar("error_code"),
  errorMessage: text("error_message"),
  // Link to user/caregiver/client if identifiable
  userId: varchar("user_id").references(() => users.id),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id),
  clientId: varchar("client_id").references(() => clients.id),
  // Metadata
  numSegments: integer("num_segments"),
  numMedia: integer("num_media"),
  mediaUrls: jsonb("media_urls"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_sms_logs_organization").on(table.organizationId),
  index("idx_sms_logs_message_sid").on(table.messageSid),
  index("idx_sms_logs_direction").on(table.direction),
  index("idx_sms_logs_status").on(table.status),
  index("idx_sms_logs_from").on(table.fromNumber),
  index("idx_sms_logs_to").on(table.toNumber),
]);

export const smsLogsRelations = relations(smsLogs, ({ one }) => ({
  user: one(users, { fields: [smsLogs.userId], references: [users.id] }),
  caregiver: one(caregivers, { fields: [smsLogs.caregiverId], references: [caregivers.id] }),
  client: one(clients, { fields: [smsLogs.clientId], references: [clients.id] }),
}));

export type SmsLog = typeof smsLogs.$inferSelect;
export type InsertSmsLog = typeof smsLogs.$inferInsert;
export const insertSmsLogSchema = createInsertSchema(smsLogs).omit({ id: true, createdAt: true, updatedAt: true });

// Staff Time Records - for staff clock-in/out tracking
export const staffTimeRecords = pgTable("staff_time_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  officeId: varchar("office_id").references(() => offices.id),
  clockInTime: timestamp("clock_in_time").notNull(),
  clockOutTime: timestamp("clock_out_time"),
  breakMinutes: integer("break_minutes").default(0),
  notes: text("notes"),
  status: varchar("status").default("active"),
  // GPS tracking
  clockInLatitude: numeric("clock_in_latitude", { precision: 10, scale: 7 }),
  clockInLongitude: numeric("clock_in_longitude", { precision: 10, scale: 7 }),
  clockInAddress: text("clock_in_address"),
  clockInPhoto: text("clock_in_photo"),
  clockInVideo: text("clock_in_video"),
  clockOutLatitude: numeric("clock_out_latitude", { precision: 10, scale: 7 }),
  clockOutLongitude: numeric("clock_out_longitude", { precision: 10, scale: 7 }),
  clockOutAddress: text("clock_out_address"),
  clockOutPhoto: text("clock_out_photo"),
  clockOutVideo: text("clock_out_video"),
  // Security/device tracking
  clockInIpAddress: varchar("clock_in_ip_address"),
  clockOutIpAddress: varchar("clock_out_ip_address"),
  deviceInfo: text("device_info"),
  // Manager edit tracking
  isEdited: boolean("is_edited").default(false),
  editedBy: varchar("edited_by").references(() => users.id),
  editedAt: timestamp("edited_at"),
  editReason: text("edit_reason"),
  // Approval & locking
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  payrollLocked: boolean("payroll_locked").default(false),
  payrollLockedAt: timestamp("payroll_locked_at"),
  payrollLockedBy: varchar("payroll_locked_by").references(() => users.id),
  // Flags
  isFlagged: boolean("is_flagged").default(false),
  flagReason: text("flag_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_staff_time_records_user").on(table.userId),
  index("idx_staff_time_records_office").on(table.officeId),
  index("idx_staff_time_records_clock_in").on(table.clockInTime),
]);

export const staffTimeRecordsRelations = relations(staffTimeRecords, ({ one, many }) => ({
  user: one(users, { fields: [staffTimeRecords.userId], references: [users.id] }),
  office: one(offices, { fields: [staffTimeRecords.officeId], references: [offices.id] }),
  auditLogs: many(staffTimeAuditLogs),
}));

export type StaffTimeRecord = typeof staffTimeRecords.$inferSelect;
export type InsertStaffTimeRecord = typeof staffTimeRecords.$inferInsert;
export const insertStaffTimeRecordSchema = createInsertSchema(staffTimeRecords).omit({ id: true, createdAt: true, updatedAt: true });

// Staff Time Audit Logs - immutable audit trail for all time record changes
export const staffTimeAuditLogs = pgTable("staff_time_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timeRecordId: varchar("time_record_id").references(() => staffTimeRecords.id),
  action: varchar("action").notNull(),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  performedBy: varchar("performed_by").references(() => users.id),
  performedAt: timestamp("performed_at").defaultNow(),
  ipAddress: varchar("ip_address"),
  notes: text("notes"),
}, (table) => [
  index("idx_staff_audit_record").on(table.timeRecordId),
  index("idx_staff_audit_performed_by").on(table.performedBy),
  index("idx_staff_audit_action").on(table.action),
]);

export const staffTimeAuditLogsRelations = relations(staffTimeAuditLogs, ({ one }) => ({
  timeRecord: one(staffTimeRecords, { fields: [staffTimeAuditLogs.timeRecordId], references: [staffTimeRecords.id] }),
  performer: one(users, { fields: [staffTimeAuditLogs.performedBy], references: [users.id] }),
}));

export type StaffTimeAuditLog = typeof staffTimeAuditLogs.$inferSelect;
export type InsertStaffTimeAuditLog = typeof staffTimeAuditLogs.$inferInsert;

// ─── PA DOH Audit Assessment Tool ───────────────────────────────────────────

export const dohAuditStatusEnum = pgEnum("doh_audit_status", ["in_progress", "completed", "archived"]);
export const dohAuditItemStatusEnum = pgEnum("doh_audit_item_status", ["pending", "pass", "fail", "na"]);

export const dohAuditAssessments = pgTable("doh_audit_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  officeId: varchar("office_id").references(() => offices.id).notNull(),
  title: varchar("title").notNull(),
  surveyPeriod: varchar("survey_period"),
  surveyorName: varchar("surveyor_name"),
  auditDate: date("audit_date"),
  status: dohAuditStatusEnum("status").default("in_progress").notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  completedAt: timestamp("completed_at"),
  overallNotes: text("overall_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_doh_audit_office").on(table.officeId),
  index("idx_doh_audit_status").on(table.status),
]);

export const dohAuditResponses = pgTable("doh_audit_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id").references(() => dohAuditAssessments.id, { onDelete: "cascade" }).notNull(),
  itemKey: varchar("item_key").notNull(),
  category: varchar("category").notNull(),
  status: dohAuditItemStatusEnum("status").default("pending").notNull(),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_doh_audit_responses_audit").on(table.auditId),
  // Must be a real UNIQUE CONSTRAINT (not just a unique index) — Postgres only
  // allows composite foreign keys to reference columns backed by a unique
  // constraint or primary key, which dohAuditCorrectiveActions' FK below relies on.
  unique("idx_doh_audit_responses_unique").on(table.auditId, table.itemKey),
]);

export const dohAuditAssessmentsRelations = relations(dohAuditAssessments, ({ one, many }) => ({
  office: one(offices, { fields: [dohAuditAssessments.officeId], references: [offices.id] }),
  creator: one(users, { fields: [dohAuditAssessments.createdBy], references: [users.id] }),
  responses: many(dohAuditResponses),
}));

export const dohAuditResponsesRelations = relations(dohAuditResponses, ({ one }) => ({
  audit: one(dohAuditAssessments, { fields: [dohAuditResponses.auditId], references: [dohAuditAssessments.id] }),
}));

export type DohAuditAssessment = typeof dohAuditAssessments.$inferSelect;
export type InsertDohAuditAssessment = typeof dohAuditAssessments.$inferInsert;
export const insertDohAuditAssessmentSchema = createInsertSchema(dohAuditAssessments).omit({ id: true, createdAt: true, updatedAt: true });

export type DohAuditResponse = typeof dohAuditResponses.$inferSelect;
export type InsertDohAuditResponse = typeof dohAuditResponses.$inferInsert;
export const insertDohAuditResponseSchema = createInsertSchema(dohAuditResponses).omit({ id: true, updatedAt: true });

export const dohAuditDocuments = pgTable("doh_audit_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id").references(() => dohAuditAssessments.id, { onDelete: "cascade" }).notNull(),
  fileName: varchar("file_name").notNull(),
  originalName: varchar("original_name").notNull(),
  mimeType: varchar("mime_type"),
  fileSize: integer("file_size"),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  itemKey: varchar("item_key"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_doh_audit_docs_audit").on(table.auditId)]);

export const dohAuditCustomItems = pgTable("doh_audit_custom_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id").references(() => dohAuditAssessments.id, { onDelete: "cascade" }).notNull(),
  category: varchar("category").notNull(),
  label: text("label").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("idx_doh_audit_custom_audit").on(table.auditId)]);

export type DohAuditDocument = typeof dohAuditDocuments.$inferSelect;
export type InsertDohAuditDocument = typeof dohAuditDocuments.$inferInsert;

export type DohAuditCustomItem = typeof dohAuditCustomItems.$inferSelect;
export type InsertDohAuditCustomItem = typeof dohAuditCustomItems.$inferInsert;

export const dohAuditCorrectiveActionStatusEnum = pgEnum("doh_audit_corrective_action_status", ["open", "in_progress", "resolved"]);

export const dohAuditCorrectiveActions = pgTable("doh_audit_corrective_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id").references(() => dohAuditAssessments.id, { onDelete: "cascade" }).notNull(),
  itemKey: varchar("item_key").notNull(),
  responsibleParty: varchar("responsible_party"),
  targetDate: date("target_date"),
  completionDate: date("completion_date"),
  actionSteps: text("action_steps"),
  status: dohAuditCorrectiveActionStatusEnum("status").default("open").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_doh_audit_ca_audit").on(table.auditId),
  uniqueIndex("idx_doh_audit_ca_unique").on(table.auditId, table.itemKey),
  foreignKey({
    name: "fk_ca_response",
    columns: [table.auditId, table.itemKey],
    foreignColumns: [dohAuditResponses.auditId, dohAuditResponses.itemKey],
  }).onDelete("cascade"),
]);

export type DohAuditCorrectiveAction = typeof dohAuditCorrectiveActions.$inferSelect;
export type InsertDohAuditCorrectiveAction = typeof dohAuditCorrectiveActions.$inferInsert;
export const insertDohAuditCorrectiveActionSchema = createInsertSchema(dohAuditCorrectiveActions).omit({ id: true, createdAt: true, updatedAt: true });

// ─── Saved Audit Comparisons ──────────────────────────────────────────────────
export const dohSavedComparisons = pgTable("doh_saved_comparisons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  officeId: varchar("office_id").references(() => offices.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name").notNull(),
  auditId1: varchar("audit_id_1").references(() => dohAuditAssessments.id, { onDelete: "cascade" }).notNull(),
  auditId2: varchar("audit_id_2").references(() => dohAuditAssessments.id, { onDelete: "cascade" }).notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_doh_saved_comparisons_office").on(table.officeId),
]);

export type DohSavedComparison = typeof dohSavedComparisons.$inferSelect;
export type InsertDohSavedComparison = typeof dohSavedComparisons.$inferInsert;
export const insertDohSavedComparisonSchema = createInsertSchema(dohSavedComparisons).omit({ id: true, createdAt: true });

// ─── Supervisory Visits ───────────────────────────────────────────────────────
export const supervisoryVisitTypeEnum = pgEnum("supervisory_visit_type", ["in_person", "phone", "virtual", "written"]);
export const supervisoryVisitStatusEnum = pgEnum("supervisory_visit_status", ["scheduled", "completed", "cancelled"]);

export const supervisoryVisits = pgTable("supervisory_visits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  officeId: varchar("office_id").references(() => offices.id).notNull(),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id, { onDelete: "cascade" }).notNull(),
  supervisorId: varchar("supervisor_id").references(() => users.id),
  visitDate: date("visit_date").notNull(),
  visitType: supervisoryVisitTypeEnum("visit_type").default("in_person").notNull(),
  durationMinutes: integer("duration_minutes"),
  topics: text("topics").array(),
  notes: text("notes"),
  caregiverSignedAt: timestamp("caregiver_signed_at"),
  nextVisitDue: date("next_visit_due"),
  status: supervisoryVisitStatusEnum("status").default("completed").notNull(),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_supervisory_visit_office").on(table.officeId),
  index("idx_supervisory_visit_caregiver").on(table.caregiverId),
  index("idx_supervisory_visit_date").on(table.visitDate),
]);

export type SupervisoryVisit = typeof supervisoryVisits.$inferSelect;
export type InsertSupervisoryVisit = typeof supervisoryVisits.$inferInsert;
export const insertSupervisoryVisitSchema = createInsertSchema(supervisoryVisits).omit({ id: true, createdAt: true, updatedAt: true });

// ─── Policy Documents & Acknowledgments ──────────────────────────────────────
export const policyStatusEnum = pgEnum("policy_status", ["draft", "active", "archived"]);
export const policyCategoryEnum = pgEnum("policy_category", ["general", "safety", "clinical", "administrative", "hr", "hipaa", "emergency", "infection_control"]);

export const policyDocuments = pgTable("policy_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  officeId: varchar("office_id").references(() => offices.id).notNull(),
  title: varchar("title").notNull(),
  category: policyCategoryEnum("category").default("general").notNull(),
  version: varchar("version").notNull().default("1.0"),
  effectiveDate: date("effective_date"),
  reviewDate: date("review_date"),
  content: text("content"),
  fileUrl: varchar("file_url"),
  fileName: varchar("file_name"),
  status: policyStatusEnum("status").default("draft").notNull(),
  requiresAcknowledgment: boolean("requires_acknowledgment").default(true),
  acknowledgmentDueDays: integer("acknowledgment_due_days").default(7),
  createdBy: varchar("created_by").references(() => users.id),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_policy_office").on(table.officeId),
  index("idx_policy_status").on(table.status),
]);

export type PolicyDocument = typeof policyDocuments.$inferSelect;
export type InsertPolicyDocument = typeof policyDocuments.$inferInsert;
export const insertPolicyDocumentSchema = createInsertSchema(policyDocuments).omit({ id: true, createdAt: true, updatedAt: true });

export const policyAckMethodEnum = pgEnum("policy_ack_method", ["digital", "printed", "verbal_documented"]);

export const policyAcknowledgments = pgTable("policy_acknowledgments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  policyId: varchar("policy_id").references(() => policyDocuments.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  acknowledgedAt: timestamp("acknowledged_at").defaultNow(),
  method: policyAckMethodEnum("method").default("digital"),
  notes: text("notes"),
}, (table) => [
  index("idx_policy_ack_policy").on(table.policyId),
  index("idx_policy_ack_user").on(table.userId),
]);

export type PolicyAcknowledgment = typeof policyAcknowledgments.$inferSelect;
export type InsertPolicyAcknowledgment = typeof policyAcknowledgments.$inferInsert;
export const insertPolicyAcknowledgmentSchema = createInsertSchema(policyAcknowledgments).omit({ id: true });

// Policy Assignments — who is required to acknowledge a given policy
export const policyAssignments = pgTable("policy_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  policyId: varchar("policy_id").references(() => policyDocuments.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  officeId: varchar("office_id").references(() => offices.id),
  dueAt: timestamp("due_at"),
  assignedBy: varchar("assigned_by").references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
}, (table) => [
  uniqueIndex("idx_policy_assignment_unique").on(table.policyId, table.userId),
  index("idx_policy_assignment_user").on(table.userId),
  index("idx_policy_assignment_office").on(table.officeId),
]);

export type PolicyAssignment = typeof policyAssignments.$inferSelect;
export type InsertPolicyAssignment = typeof policyAssignments.$inferInsert;
export const insertPolicyAssignmentSchema = createInsertSchema(policyAssignments).omit({ id: true, assignedAt: true });

// Policy reminder log — rate-limited reminder pattern (mirrors survey_reminder_log)
export const policyReminderLog = pgTable("policy_reminder_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  policyId: varchar("policy_id").references(() => policyDocuments.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  sentByUserId: varchar("sent_by_user_id").references(() => users.id),
  recipientEmail: varchar("recipient_email"),
  status: varchar("status").default("sent"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow(),
}, (table) => [
  index("idx_policy_reminder_user_sent").on(table.userId, table.sentAt),
  index("idx_policy_reminder_policy_sent").on(table.policyId, table.sentAt),
]);

export type PolicyReminderLog = typeof policyReminderLog.$inferSelect;
export type InsertPolicyReminderLog = typeof policyReminderLog.$inferInsert;
export const insertPolicyReminderLogSchema = createInsertSchema(policyReminderLog).omit({ id: true, sentAt: true });

// ─── QAPI Meetings ────────────────────────────────────────────────────────────
export const qapiMeetingStatusEnum = pgEnum("qapi_meeting_status", ["draft", "finalized"]);

export const qapiMeetings = pgTable("qapi_meetings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  officeId: varchar("office_id").references(() => offices.id).notNull(),
  meetingDate: date("meeting_date").notNull(),
  quarter: varchar("quarter"),
  year: integer("year"),
  facilitatedBy: varchar("facilitated_by"),
  attendees: text("attendees").array(),
  meetingNotes: text("meeting_notes"),
  indicators: jsonb("indicators"),
  actionItems: jsonb("action_items"),
  status: qapiMeetingStatusEnum("status").default("draft").notNull(),
  nextMeetingDate: date("next_meeting_date"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_qapi_office").on(table.officeId),
  index("idx_qapi_date").on(table.meetingDate),
]);

export type QapiMeeting = typeof qapiMeetings.$inferSelect;
export type InsertQapiMeeting = typeof qapiMeetings.$inferInsert;
export const insertQapiMeetingSchema = createInsertSchema(qapiMeetings).omit({ id: true, createdAt: true, updatedAt: true });

// ─── Infection Control Log ────────────────────────────────────────────────────
export const infectionTypeEnum = pgEnum("infection_type", ["respiratory", "gastrointestinal", "skin", "bloodborne", "covid19", "influenza", "other"]);
export const infectionControlStatusEnum = pgEnum("infection_control_status", ["active", "monitoring", "resolved"]);

export const infectionControlLogs = pgTable("infection_control_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  officeId: varchar("office_id").references(() => offices.id).notNull(),
  incidentDate: date("incident_date").notNull(),
  reportedBy: varchar("reported_by").references(() => users.id),
  infectionType: infectionTypeEnum("infection_type").notNull(),
  description: text("description").notNull(),
  affectedClients: text("affected_clients").array(),
  affectedStaff: text("affected_staff").array(),
  containmentActions: text("containment_actions"),
  notificationsGiven: text("notifications_given"),
  ppeUsed: boolean("ppe_used").default(false),
  reportedToPublicHealth: boolean("reported_to_public_health").default(false),
  publicHealthReportDate: date("public_health_report_date"),
  resolvedAt: date("resolved_at"),
  outcome: text("outcome"),
  status: infectionControlStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_infection_ctrl_office").on(table.officeId),
  index("idx_infection_ctrl_date").on(table.incidentDate),
]);

export type InfectionControlLog = typeof infectionControlLogs.$inferSelect;
export type InsertInfectionControlLog = typeof infectionControlLogs.$inferInsert;
export const insertInfectionControlLogSchema = createInsertSchema(infectionControlLogs).omit({ id: true, createdAt: true, updatedAt: true });

// ─── Client Emergency Plans ───────────────────────────────────────────────────
export const clientEmergencyPlans = pgTable("client_emergency_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id, { onDelete: "cascade" }).notNull().unique(),
  officeId: varchar("office_id").references(() => offices.id).notNull(),
  evacuationRoute: text("evacuation_route"),
  shelterInPlaceInstructions: text("shelter_in_place_instructions"),
  primaryEmergencyContact: jsonb("primary_emergency_contact"),
  secondaryEmergencyContact: jsonb("secondary_emergency_contact"),
  medicalConditions: text("medical_conditions"),
  medications: text("medications"),
  specialEquipment: text("special_equipment"),
  preferredHospital: varchar("preferred_hospital"),
  doNotResuscitate: boolean("do_not_resuscitate").default(false),
  powerDependentEquipment: boolean("power_dependent_equipment").default(false),
  mobilityAssistance: boolean("mobility_assistance").default(false),
  utilityCompanyNotified: boolean("utility_company_notified").default(false),
  lastReviewedAt: date("last_reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  nextReviewDue: date("next_review_due"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_emergency_plan_client").on(table.clientId),
  index("idx_emergency_plan_office").on(table.officeId),
]);

export type ClientEmergencyPlan = typeof clientEmergencyPlans.$inferSelect;
export type InsertClientEmergencyPlan = typeof clientEmergencyPlans.$inferInsert;
export const insertClientEmergencyPlanSchema = createInsertSchema(clientEmergencyPlans).omit({ id: true, createdAt: true, updatedAt: true });

// ─── Client Satisfaction Surveys ─────────────────────────────────────────────
export const clientSurveyStatusEnum = pgEnum("client_survey_status", ["draft", "active", "closed"]);

export const clientSatisfactionSurveys = pgTable("client_satisfaction_surveys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  officeId: varchar("office_id").references(() => offices.id).notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  questions: jsonb("questions"),
  status: clientSurveyStatusEnum("status").default("draft").notNull(),
  sentAt: timestamp("sent_at"),
  closedAt: timestamp("closed_at"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [index("idx_client_survey_office").on(table.officeId)]);

export type ClientSatisfactionSurvey = typeof clientSatisfactionSurveys.$inferSelect;
export type InsertClientSatisfactionSurvey = typeof clientSatisfactionSurveys.$inferInsert;
export const insertClientSatisfactionSurveySchema = createInsertSchema(clientSatisfactionSurveys).omit({ id: true, createdAt: true, updatedAt: true });

export const clientSurveyResponses = pgTable("client_survey_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  surveyId: varchar("survey_id").references(() => clientSatisfactionSurveys.id, { onDelete: "cascade" }).notNull(),
  clientId: varchar("client_id").references(() => clients.id),
  overallRating: integer("overall_rating"),
  responses: jsonb("responses"),
  comments: text("comments"),
  wouldRecommend: boolean("would_recommend"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  submittedByName: varchar("submitted_by_name"),
}, (table) => [
  index("idx_survey_response_survey").on(table.surveyId),
  index("idx_survey_response_client").on(table.clientId),
]);

export type ClientSurveyResponse = typeof clientSurveyResponses.$inferSelect;
export type InsertClientSurveyResponse = typeof clientSurveyResponses.$inferInsert;
export const insertClientSurveyResponseSchema = createInsertSchema(clientSurveyResponses).omit({ id: true, submittedAt: true });

export const surveyReminderLog = pgTable("survey_reminder_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caregiverId: varchar("caregiver_id").notNull().references(() => caregivers.id, { onDelete: "cascade" }),
  officeId: varchar("office_id").references(() => offices.id),
  gapType: varchar("gap_type").notNull(),
  sentByUserId: varchar("sent_by_user_id").references(() => users.id),
  recipientEmail: varchar("recipient_email"),
  status: varchar("status").default("sent"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow(),
}, (table) => [
  index("idx_survey_reminder_caregiver_sent").on(table.caregiverId, table.sentAt),
  index("idx_survey_reminder_office_sent").on(table.officeId, table.sentAt),
]);

export type SurveyReminderLog = typeof surveyReminderLog.$inferSelect;
export type InsertSurveyReminderLog = typeof surveyReminderLog.$inferInsert;
export const insertSurveyReminderLogSchema = createInsertSchema(surveyReminderLog).omit({ id: true, sentAt: true });

// ============================================================================
// Onboarding workflow (Task #136)
// ============================================================================
export const onboardingStepTypeEnum = pgEnum("onboarding_step_type", [
  "signature", "document", "policy", "training", "checklist",
]);
export const onboardingInstanceStatusEnum = pgEnum("onboarding_instance_status", [
  "in_progress", "completed", "cancelled",
]);
export const onboardingInstanceStepStatusEnum = pgEnum("onboarding_instance_step_status", [
  "pending", "completed", "skipped",
]);
export const onboardingEmployeeTypeEnum = pgEnum("onboarding_employee_type", [
  "caregiver", "user",
]);

export const onboardingTemplates = pgTable("onboarding_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id"),
  officeId: varchar("office_id").references(() => offices.id),
  name: varchar("name").notNull(),
  description: text("description"),
  role: varchar("role").notNull().default("any"), // caregiver | office_staff | any
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const onboardingTemplateSteps = pgTable("onboarding_template_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => onboardingTemplates.id, { onDelete: "cascade" }),
  stepOrder: integer("step_order").notNull().default(0),
  stepType: onboardingStepTypeEnum("step_type").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  refId: varchar("ref_id"), // esignature template id / training id / policy id (null for checklist)
  isRequired: boolean("is_required").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_onb_tmpl_step_template").on(table.templateId),
]);

export const onboardingInstances = pgTable("onboarding_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id"),
  templateId: varchar("template_id").references(() => onboardingTemplates.id),
  employeeType: onboardingEmployeeTypeEnum("employee_type").notNull(),
  employeeUserId: varchar("employee_user_id").references(() => users.id),
  employeeCaregiverId: varchar("employee_caregiver_id").references(() => caregivers.id),
  status: onboardingInstanceStatusEnum("status").default("in_progress"),
  launchedBy: varchar("launched_by").references(() => users.id),
  launchedAt: timestamp("launched_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_onb_inst_user").on(table.employeeUserId),
  index("idx_onb_inst_caregiver").on(table.employeeCaregiverId),
  index("idx_onb_inst_status").on(table.status),
]);

export const onboardingInstanceSteps = pgTable("onboarding_instance_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  instanceId: varchar("instance_id").notNull().references(() => onboardingInstances.id, { onDelete: "cascade" }),
  templateStepId: varchar("template_step_id").references(() => onboardingTemplateSteps.id),
  stepOrder: integer("step_order").notNull().default(0),
  stepType: onboardingStepTypeEnum("step_type").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  refId: varchar("ref_id"),
  linkId: varchar("link_id"), // created esign request id / training record id / policy ack id
  status: onboardingInstanceStepStatusEnum("status").default("pending"),
  isRequired: boolean("is_required").default(true),
  completedAt: timestamp("completed_at"),
  completedBy: varchar("completed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_onb_inst_step_instance").on(table.instanceId),
  index("idx_onb_inst_step_link").on(table.stepType, table.linkId),
]);

export type OnboardingTemplate = typeof onboardingTemplates.$inferSelect;
export type InsertOnboardingTemplate = typeof onboardingTemplates.$inferInsert;
export const insertOnboardingTemplateSchema = createInsertSchema(onboardingTemplates).omit({ id: true, createdAt: true, updatedAt: true });

export type OnboardingTemplateStep = typeof onboardingTemplateSteps.$inferSelect;
export type InsertOnboardingTemplateStep = typeof onboardingTemplateSteps.$inferInsert;
export const insertOnboardingTemplateStepSchema = createInsertSchema(onboardingTemplateSteps).omit({ id: true, createdAt: true });

export type OnboardingInstance = typeof onboardingInstances.$inferSelect;
export type InsertOnboardingInstance = typeof onboardingInstances.$inferInsert;
export const insertOnboardingInstanceSchema = createInsertSchema(onboardingInstances).omit({ id: true, createdAt: true, updatedAt: true, launchedAt: true, completedAt: true });

export type OnboardingInstanceStep = typeof onboardingInstanceSteps.$inferSelect;
export type InsertOnboardingInstanceStep = typeof onboardingInstanceSteps.$inferInsert;
export const insertOnboardingInstanceStepSchema = createInsertSchema(onboardingInstanceSteps).omit({ id: true, createdAt: true, completedAt: true });

// ============================================================================
// Offboarding workflow (Task #137) — mirrors onboarding shape
// ============================================================================
export const offboardingStepTypeEnum = pgEnum("offboarding_step_type", [
  "account_deactivation", "equipment_return", "final_paycheck",
  "cobra_notice", "exit_interview", "document", "checklist",
]);
export const offboardingInstanceStatusEnum = pgEnum("offboarding_instance_status", [
  "pending", "in_progress", "completed", "cancelled",
]);
export const offboardingInstanceStepStatusEnum = pgEnum("offboarding_instance_step_status", [
  "pending", "completed", "skipped",
]);
export const offboardingEmployeeTypeEnum = pgEnum("offboarding_employee_type", [
  "caregiver", "user",
]);

export const offboardingTemplates = pgTable("offboarding_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id"),
  officeId: varchar("office_id").references(() => offices.id),
  name: varchar("name").notNull(),
  description: text("description"),
  role: varchar("role").notNull().default("any"), // caregiver | office_staff | any
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const offboardingTemplateSteps = pgTable("offboarding_template_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  templateId: varchar("template_id").notNull().references(() => offboardingTemplates.id, { onDelete: "cascade" }),
  stepOrder: integer("step_order").notNull().default(0),
  stepType: offboardingStepTypeEnum("step_type").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  refId: varchar("ref_id"), // survey_templates id for exit_interview, etc.
  isRequired: boolean("is_required").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_off_tmpl_step_template").on(table.templateId),
]);

export const offboardingInstances = pgTable("offboarding_instances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id"),
  templateId: varchar("template_id").references(() => offboardingTemplates.id),
  employeeType: offboardingEmployeeTypeEnum("employee_type").notNull(),
  employeeUserId: varchar("employee_user_id").references(() => users.id),
  employeeCaregiverId: varchar("employee_caregiver_id").references(() => caregivers.id),
  status: offboardingInstanceStatusEnum("status").default("in_progress"),
  terminationDate: timestamp("termination_date"),
  launchedBy: varchar("launched_by").references(() => users.id),
  launchedAt: timestamp("launched_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  // Tracks that the daily termination-date job already disabled the account
  // and prompted for shift cancellation so re-runs are no-ops.
  terminationProcessedAt: timestamp("termination_processed_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_off_inst_user").on(table.employeeUserId),
  index("idx_off_inst_caregiver").on(table.employeeCaregiverId),
  index("idx_off_inst_status").on(table.status),
]);

export const offboardingInstanceSteps = pgTable("offboarding_instance_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  instanceId: varchar("instance_id").notNull().references(() => offboardingInstances.id, { onDelete: "cascade" }),
  templateStepId: varchar("template_step_id").references(() => offboardingTemplateSteps.id),
  stepOrder: integer("step_order").notNull().default(0),
  stepType: offboardingStepTypeEnum("step_type").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  refId: varchar("ref_id"),
  linkId: varchar("link_id"), // survey_response id for exit_interview
  status: offboardingInstanceStepStatusEnum("status").default("pending"),
  isRequired: boolean("is_required").default(true),
  completedAt: timestamp("completed_at"),
  completedBy: varchar("completed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_off_inst_step_instance").on(table.instanceId),
  index("idx_off_inst_step_link").on(table.stepType, table.linkId),
]);

export type OffboardingTemplate = typeof offboardingTemplates.$inferSelect;
export type InsertOffboardingTemplate = typeof offboardingTemplates.$inferInsert;
export const insertOffboardingTemplateSchema = createInsertSchema(offboardingTemplates).omit({ id: true, createdAt: true, updatedAt: true });

export type OffboardingTemplateStep = typeof offboardingTemplateSteps.$inferSelect;
export type InsertOffboardingTemplateStep = typeof offboardingTemplateSteps.$inferInsert;
export const insertOffboardingTemplateStepSchema = createInsertSchema(offboardingTemplateSteps).omit({ id: true, createdAt: true });

export type OffboardingInstance = typeof offboardingInstances.$inferSelect;
export type InsertOffboardingInstance = typeof offboardingInstances.$inferInsert;
export const insertOffboardingInstanceSchema = createInsertSchema(offboardingInstances).omit({ id: true, createdAt: true, updatedAt: true, launchedAt: true, completedAt: true, terminationProcessedAt: true });

export type OffboardingInstanceStep = typeof offboardingInstanceSteps.$inferSelect;
export type InsertOffboardingInstanceStep = typeof offboardingInstanceSteps.$inferInsert;
export const insertOffboardingInstanceStepSchema = createInsertSchema(offboardingInstanceSteps).omit({ id: true, createdAt: true, completedAt: true });

// ==================== BENEFITS ENROLLMENT (Task 138) ====================

export const benefitTypeEnum = pgEnum("benefit_type", [
  "health", "dental", "vision", "life", "disability", "retirement_401k", "fsa", "hsa", "other",
]);

export const benefitTierEnum = pgEnum("benefit_tier", [
  "employee", "employee_spouse", "employee_children", "employee_family", "waived",
]);

export const enrollmentWindowTypeEnum = pgEnum("enrollment_window_type", [
  "open_enrollment", "new_hire", "qualifying_life_event",
]);

export const benefitEnrollmentStatusEnum = pgEnum("benefit_enrollment_status", [
  "draft", "submitted", "waived", "cancelled",
]);

export const benefitDependentRelationshipEnum = pgEnum("benefit_dependent_relationship", [
  "spouse", "domestic_partner", "child", "stepchild", "other",
]);

export const benefitPlans = pgTable("benefit_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id"),
  officeId: varchar("office_id").references(() => offices.id),
  carrier: varchar("carrier").notNull(),
  planName: varchar("plan_name").notNull(),
  benefitType: benefitTypeEnum("benefit_type").notNull(),
  planYear: integer("plan_year"),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_benefit_plans_org").on(table.organizationId),
  index("idx_benefit_plans_office").on(table.officeId),
  index("idx_benefit_plans_type").on(table.benefitType),
]);

export type BenefitPlan = typeof benefitPlans.$inferSelect;
export type InsertBenefitPlan = typeof benefitPlans.$inferInsert;
export const insertBenefitPlanSchema = createInsertSchema(benefitPlans).omit({ id: true, createdAt: true, updatedAt: true });

export const benefitPlanRates = pgTable("benefit_plan_rates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").references(() => benefitPlans.id, { onDelete: "cascade" }).notNull(),
  tier: benefitTierEnum("tier").notNull(),
  employeeCostPerPayPeriod: numeric("employee_cost_per_pay_period", { precision: 10, scale: 2 }).notNull(),
  employerCostPerPayPeriod: numeric("employer_cost_per_pay_period", { precision: 10, scale: 2 }).default("0"),
  payPeriodsPerYear: integer("pay_periods_per_year").default(26),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_benefit_plan_rates_plan").on(table.planId),
  uniqueIndex("uq_benefit_plan_rates_plan_tier").on(table.planId, table.tier),
]);

export type BenefitPlanRate = typeof benefitPlanRates.$inferSelect;
export type InsertBenefitPlanRate = typeof benefitPlanRates.$inferInsert;
export const insertBenefitPlanRateSchema = createInsertSchema(benefitPlanRates).omit({ id: true, createdAt: true });

export const enrollmentWindows = pgTable("enrollment_windows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id"),
  name: varchar("name").notNull(),
  windowType: enrollmentWindowTypeEnum("window_type").notNull().default("open_enrollment"),
  employeeUserId: varchar("employee_user_id").references(() => users.id),
  reasonCode: varchar("reason_code"),
  startsAt: date("starts_at").notNull(),
  endsAt: date("ends_at").notNull(),
  coverageEffectiveDate: date("coverage_effective_date"),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_enrollment_windows_org").on(table.organizationId),
  index("idx_enrollment_windows_employee").on(table.employeeUserId),
  index("idx_enrollment_windows_dates").on(table.startsAt, table.endsAt),
]);

export type EnrollmentWindow = typeof enrollmentWindows.$inferSelect;
export type InsertEnrollmentWindow = typeof enrollmentWindows.$inferInsert;
export const insertEnrollmentWindowSchema = createInsertSchema(enrollmentWindows).omit({ id: true, createdAt: true });

export const benefitEnrollments = pgTable("benefit_enrollments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  organizationId: varchar("organization_id"),
  employeeUserId: varchar("employee_user_id").references(() => users.id).notNull(),
  windowId: varchar("window_id").references(() => enrollmentWindows.id).notNull(),
  benefitType: benefitTypeEnum("benefit_type").notNull(),
  planId: varchar("plan_id").references(() => benefitPlans.id),
  tier: benefitTierEnum("tier").notNull(),
  status: benefitEnrollmentStatusEnum("status").notNull().default("draft"),
  coverageEffectiveDate: date("coverage_effective_date"),
  signedName: varchar("signed_name"),
  signedAt: timestamp("signed_at"),
  signatureIp: varchar("signature_ip"),
  documentId: varchar("document_id").references(() => documents.id),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_benefit_enrollments_employee").on(table.employeeUserId),
  index("idx_benefit_enrollments_window").on(table.windowId),
  index("idx_benefit_enrollments_plan").on(table.planId),
  uniqueIndex("uq_benefit_enrollments_emp_window_type").on(table.employeeUserId, table.windowId, table.benefitType),
]);

export type BenefitEnrollment = typeof benefitEnrollments.$inferSelect;
export type InsertBenefitEnrollment = typeof benefitEnrollments.$inferInsert;
export const insertBenefitEnrollmentSchema = createInsertSchema(benefitEnrollments).omit({ id: true, createdAt: true, updatedAt: true });

export const benefitDependents = pgTable("benefit_dependents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  enrollmentId: varchar("enrollment_id").references(() => benefitEnrollments.id, { onDelete: "cascade" }).notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  relationship: benefitDependentRelationshipEnum("relationship").notNull(),
  dateOfBirth: date("date_of_birth"),
  ssnLast4: varchar("ssn_last4"),
  gender: varchar("gender"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_benefit_dependents_enrollment").on(table.enrollmentId),
]);

export type BenefitDependent = typeof benefitDependents.$inferSelect;
export type InsertBenefitDependent = typeof benefitDependents.$inferInsert;
export const insertBenefitDependentSchema = createInsertSchema(benefitDependents).omit({ id: true, createdAt: true });

// ==================== QUALITY MANAGEMENT PLAN ====================

export const qmpStatusEnum = pgEnum("qmp_status", ["active", "draft", "archived"]);
export const qmpReviewStatusEnum = pgEnum("qmp_review_status", ["pending", "in_review", "completed", "overdue"]);
export const qmpOadriStatusEnum = pgEnum("qmp_oadri_status", ["not_started", "in_progress", "completed", "needs_improvement"]);
export const complaintStatusEnum = pgEnum("complaint_status", ["open", "under_investigation", "resolved_satisfactory", "resolved_unsatisfactory", "referred", "closed"]);
export const complaintSourceEnum = pgEnum("complaint_source", ["patient", "family", "staff", "regulatory", "other"]);
export const complaintCategoryEnum = pgEnum("complaint_category", ["care_quality", "staff_conduct", "scheduling", "communication", "billing", "safety", "privacy", "other"]);

export const qualityManagementPlans = pgTable("quality_management_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  officeId: varchar("office_id").references(() => offices.id),
  organizationId: varchar("organization_id"),
  title: varchar("title").notNull().default("Quality Management Plan"),
  description: text("description"),
  policyDocumentUrl: varchar("policy_document_url"),
  effectiveDate: date("effective_date").notNull(),
  revision: varchar("revision").default("1.0"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: date("reviewed_at"),
  nextReviewDate: date("next_review_date"),
  status: qmpStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_qmp_office").on(table.officeId),
  index("idx_qmp_status").on(table.status),
]);

export type QualityManagementPlan = typeof qualityManagementPlans.$inferSelect;
export type InsertQualityManagementPlan = typeof qualityManagementPlans.$inferInsert;
export const insertQualityManagementPlanSchema = createInsertSchema(qualityManagementPlans).omit({ id: true, createdAt: true, updatedAt: true });

export const qmpMeasurableOutcomes = pgTable("qmp_measurable_outcomes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").references(() => qualityManagementPlans.id).notNull(),
  officeId: varchar("office_id").references(() => offices.id),
  name: varchar("name").notNull(),
  description: text("description"),
  targetValue: varchar("target_value"),
  targetUnit: varchar("target_unit"),
  actualValue: varchar("actual_value"),
  measurementMethod: text("measurement_method"),
  frequency: varchar("frequency").default("quarterly"),
  lastMeasuredAt: date("last_measured_at"),
  nextMeasurementDue: date("next_measurement_due"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_qmp_outcomes_plan").on(table.planId),
  index("idx_qmp_outcomes_office").on(table.officeId),
]);

export type QmpMeasurableOutcome = typeof qmpMeasurableOutcomes.$inferSelect;
export type InsertQmpMeasurableOutcome = typeof qmpMeasurableOutcomes.$inferInsert;
export const insertQmpMeasurableOutcomeSchema = createInsertSchema(qmpMeasurableOutcomes).omit({ id: true, createdAt: true, updatedAt: true });

export const qmpQuarterlyReviews = pgTable("qmp_quarterly_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").references(() => qualityManagementPlans.id).notNull(),
  officeId: varchar("office_id").references(() => offices.id),
  quarter: integer("quarter").notNull(),
  year: integer("year").notNull(),
  reviewDate: date("review_date"),
  dueDate: date("due_date").notNull(),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  findings: text("findings"),
  actionItems: text("action_items"),
  status: qmpReviewStatusEnum("status").default("pending").notNull(),
  completedAt: date("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_qmp_reviews_plan").on(table.planId),
  index("idx_qmp_reviews_office").on(table.officeId),
  index("idx_qmp_reviews_quarter").on(table.quarter, table.year),
]);

export type QmpQuarterlyReview = typeof qmpQuarterlyReviews.$inferSelect;
export type InsertQmpQuarterlyReview = typeof qmpQuarterlyReviews.$inferInsert;
export const insertQmpQuarterlyReviewSchema = createInsertSchema(qmpQuarterlyReviews).omit({ id: true, createdAt: true, updatedAt: true });

export const qmpOadriCycles = pgTable("qmp_oadri_cycles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  planId: varchar("plan_id").references(() => qualityManagementPlans.id).notNull(),
  officeId: varchar("office_id").references(() => offices.id),
  cycleName: varchar("cycle_name").notNull(),
  objectives: text("objectives"),
  objectivesStatus: qmpOadriStatusEnum("objectives_status").default("not_started"),
  approach: text("approach"),
  approachStatus: qmpOadriStatusEnum("approach_status").default("not_started"),
  deployment: text("deployment"),
  deploymentStatus: qmpOadriStatusEnum("deployment_status").default("not_started"),
  results: text("results"),
  resultsStatus: qmpOadriStatusEnum("results_status").default("not_started"),
  improvement: text("improvement"),
  improvementStatus: qmpOadriStatusEnum("improvement_status").default("not_started"),
  overallStatus: qmpOadriStatusEnum("overall_status").default("not_started"),
  startedAt: date("started_at"),
  completedAt: date("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_qmp_oadri_plan").on(table.planId),
  index("idx_qmp_oadri_office").on(table.officeId),
]);

export type QmpOadriCycle = typeof qmpOadriCycles.$inferSelect;
export type InsertQmpOadriCycle = typeof qmpOadriCycles.$inferInsert;
export const insertQmpOadriCycleSchema = createInsertSchema(qmpOadriCycles).omit({ id: true, createdAt: true, updatedAt: true });

export const patientComplaints = pgTable("patient_complaints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  officeId: varchar("office_id").references(() => offices.id).notNull(),
  clientId: varchar("client_id").references(() => clients.id),
  caregiverId: varchar("caregiver_id").references(() => caregivers.id),
  complaintNumber: varchar("complaint_number").notNull(),
  complaintDate: date("complaint_date").notNull(),
  receivedBy: varchar("received_by").references(() => users.id),
  source: complaintSourceEnum("source").notNull(),
  category: complaintCategoryEnum("category").notNull(),
  description: text("description").notNull(),
  incidentOutcome: text("incident_outcome"),
  rootCause: text("root_cause"),
  correctiveAction: text("corrective_action"),
  preventiveMeasures: text("preventive_measures"),
  employeeInvolved: boolean("employee_involved").default(false),
  departmentInvolved: boolean("department_involved").default(false),
  employeeNames: text("employee_names"),
  departmentNames: text("department_names"),
  resolvedAt: date("resolved_at"),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolutionNotes: text("resolution_notes"),
  patientSatisfied: boolean("patient_satisfied"),
  referredToDepartment: boolean("referred_to_department").default(false),
  followUpRequired: boolean("follow_up_required").default(false),
  followUpDate: date("follow_up_date"),
  surveySent: boolean("survey_sent").default(false),
  surveyResults: varchar("survey_results"),
  surveyRating: integer("survey_rating"),
  incidentReportId: varchar("incident_report_id").references(() => incidentReports.id),
  status: complaintStatusEnum("status").default("open").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_patient_complaints_office").on(table.officeId),
  index("idx_patient_complaints_status").on(table.status),
  index("idx_patient_complaints_date").on(table.complaintDate),
  index("idx_patient_complaints_number").on(table.complaintNumber),
]);

export type PatientComplaint = typeof patientComplaints.$inferSelect;
export type InsertPatientComplaint = typeof patientComplaints.$inferInsert;
export const insertPatientComplaintSchema = createInsertSchema(patientComplaints).omit({ id: true, createdAt: true, updatedAt: true });

export const qualityManagementLogs = pgTable("quality_management_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  officeId: varchar("office_id").references(() => offices.id).notNull(),
  complaintId: varchar("complaint_id").references(() => patientComplaints.id),
  incidentReportId: varchar("incident_report_id").references(() => incidentReports.id),
  logDate: date("log_date").notNull(),
  complaintNumber: varchar("complaint_number"),
  patientName: varchar("patient_name"),
  patientLocation: varchar("patient_location"),
  patientIssues: text("patient_issues"),
  incidentOutcome: text("incident_outcome"),
  preventableMeasures: text("preventable_measures"),
  qualitySatisfactionCode: varchar("quality_satisfaction_code"),
  surveySent: boolean("survey_sent").default(false),
  surveyResults: varchar("survey_results"),
  rating1: integer("rating_1"),
  rating2: integer("rating_2"),
  rating3: integer("rating_3"),
  rating4: integer("rating_4"),
  rating5: integer("rating_5"),
  employeeInvolved: boolean("employee_involved").default(false),
  departmentInvolved: boolean("department_involved").default(false),
  notes: text("notes"),
  loggedBy: varchar("logged_by").references(() => users.id),
  reviewedAt: date("reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_qm_logs_office").on(table.officeId),
  index("idx_qm_logs_date").on(table.logDate),
  index("idx_qm_logs_complaint").on(table.complaintId),
]);

export type QualityManagementLog = typeof qualityManagementLogs.$inferSelect;
export type InsertQualityManagementLog = typeof qualityManagementLogs.$inferInsert;
export const insertQualityManagementLogSchema = createInsertSchema(qualityManagementLogs).omit({ id: true, createdAt: true, updatedAt: true });
