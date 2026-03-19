import {
  users,
  offices,
  clients,
  caregivers,
  carePlans,
  carePlanGoals,
  carePlanInterventions,
  progressNotes,
  documents,
  incidentReports,
  incidentFollowUps,
  tasks,
  messages,
  certifications,
  complianceItems,
  auditLogs,
  birthdayNotifications,
  trainings,
  trainingRecords,
  files,
  familyMembers,
  clientFamilyMembers,
  familyUpdates,
  organizations,
  subscriptionPlans,
  subscriptionHistory,
  type User,
  type UpsertUser,
  type Office,
  type InsertOffice,
  type Client,
  type InsertClient,
  type Caregiver,
  type InsertCaregiver,
  type CarePlan,
  type InsertCarePlan,
  type CarePlanGoal,
  type InsertCarePlanGoal,
  type CarePlanIntervention,
  type InsertCarePlanIntervention,
  type ProgressNote,
  type InsertProgressNote,
  type Document,
  type InsertDocument,
  type IncidentReport,
  type InsertIncidentReport,
  type IncidentFollowUp,
  type InsertIncidentFollowUp,
  type Task,
  type InsertTask,
  type Message,
  type InsertMessage,
  type Certification,
  type InsertCertification,
  type ComplianceItem,
  type InsertComplianceItem,
  type AuditLog,
  type InsertAuditLog,
  type BirthdayNotification,
  type InsertBirthdayNotification,
  type Training,
  type InsertTraining,
  type TrainingRecord,
  type InsertTrainingRecord,
  type File,
  type InsertFile,
  type FamilyMember,
  type InsertFamilyMember,
  type ClientFamilyMember,
  type InsertClientFamilyMember,
  type FamilyUpdate,
  type InsertFamilyUpdate,
  type Organization,
  type InsertOrganization,
  type SubscriptionPlan,
  type InsertSubscriptionPlan,
  type SubscriptionHistoryRecord,
  type InsertSubscriptionHistoryRecord,
  customRoles,
  type CustomRole,
  type InsertCustomRole,
  permissions,
  type Permission,
  type InsertPermission,
  rolePermissions,
  type RolePermission,
  type InsertRolePermission,
  userCustomRoles,
  type UserCustomRole,
  type InsertUserCustomRole,
  clientCaregiverAssignments,
  type ClientCaregiverAssignment,
  type InsertClientCaregiverAssignment,
  masterWeekTemplates,
  type MasterWeekTemplate,
  evvData,
  type EvvData,
  type InsertEvvData,
  type InsertMasterWeekTemplate,
  masterWeekSlots,
  type MasterWeekSlot,
  type InsertMasterWeekSlot,
  clientSchedules,
  type ClientSchedule,
  type InsertClientSchedule,
  scheduleChangeLog,
  type ScheduleChangeLog,
  type InsertScheduleChangeLog,
  aiDetectedIssues,
  type AiDetectedIssue,
  type InsertAiDetectedIssue,
  mcoTypes,
  type McoType,
  type InsertMcoType,
  mcos,
  type Mco,
  type InsertMco,
  systemSettings,
  type SystemSetting,
  type InsertSystemSetting,
  entityFieldConfigs,
  type EntityFieldConfig,
  type InsertEntityFieldConfig,
  clientCommunications,
  type ClientCommunication,
  type InsertClientCommunication,
  officeMcoBillingRates,
  type OfficeMcoBillingRate,
  type InsertOfficeMcoBillingRate,
  billingRecords,
  type BillingRecord,
  type InsertBillingRecord,
  officePayrollConfigs,
  type OfficePayrollConfig,
  type InsertOfficePayrollConfig,
  payrollRuns,
  type PayrollRun,
  type InsertPayrollRun,
  payrollLineItems,
  type PayrollLineItem,
  type InsertPayrollLineItem,
  caregiverTimeEntries,
  type CaregiverTimeEntry,
  type InsertCaregiverTimeEntry,
  payrollHolidays,
  type PayrollHoliday,
  type InsertPayrollHoliday,
  paSurveyChecklistItems,
  type PaSurveyChecklistItem,
  type InsertPaSurveyChecklistItem,
  officePaSurveyStatuses,
  type OfficePaSurveyStatus,
  type InsertOfficePaSurveyStatus,
  caregiverNotes,
  type CaregiverNote,
  type InsertCaregiverNote,
  caregiverPreferences,
  type CaregiverPreference,
  type InsertCaregiverPreference,
  caregiverAbsences,
  type CaregiverAbsence,
  type InsertCaregiverAbsence,
  caregiverAvailability,
  type CaregiverAvailability,
  type InsertCaregiverAvailability,
  caregiverAvailabilityExceptions,
  type CaregiverAvailabilityException,
  type InsertCaregiverAvailabilityException,
  caregiverPayrollInfo,
  type CaregiverPayrollInfo,
  type InsertCaregiverPayrollInfo,
  caregiverExpenses,
  type CaregiverExpense,
  type InsertCaregiverExpense,
  caregiverPaychecks,
  type CaregiverPaycheck,
  type InsertCaregiverPaycheck,
  caregiverRates,
  type CaregiverRate,
  type InsertCaregiverRate,
  caregiverInServices,
  type CaregiverInService,
  type InsertCaregiverInService,
  caregiverOfficeMoves,
  type CaregiverOfficeMove,
  type InsertCaregiverOfficeMove,
  caregiverSchedules,
  type CaregiverSchedule,
  type InsertCaregiverSchedule,
  clientMcos,
  type ClientMco,
  type InsertClientMco,
  coordinators,
  type Coordinator,
  type InsertCoordinator,
  officeLicenses,
  type OfficeLicense,
  type InsertOfficeLicense,
  officeStaff,
  type OfficeStaff,
  type InsertOfficeStaff,
  officeExpenses,
  type OfficeExpense,
  type InsertOfficeExpense,
  eligibilityChecks,
  type EligibilityCheck,
  type InsertEligibilityCheck,
  eligibilitySchedule,
  type EligibilitySchedule,
  type InsertEligibilitySchedule,
  caregiverCompliance,
  type CaregiverCompliance,
  type InsertCaregiverCompliance,
  medications,
  type Medication,
  type InsertMedication,
  medicationLogs,
  type MedicationLog,
  type InsertMedicationLog,
  vitalSigns,
  type VitalSign,
  type InsertVitalSign,
  notificationTemplates,
  type NotificationTemplate,
  type InsertNotificationTemplate,
  notificationQueue,
  type NotificationQueueItem,
  type InsertNotificationQueueItem,
  notificationPreferences,
  type NotificationPreference,
  type InsertNotificationPreference,
  mileageLogs,
  type MileageLog,
  type InsertMileageLog,
  applicants,
  type Applicant,
  type InsertApplicant,
  applicantNotes,
  type ApplicantNote,
  type InsertApplicantNote,
  applicantInterviews,
  type ApplicantInterview,
  type InsertApplicantInterview,
  backgroundChecks,
  type BackgroundCheck,
  type InsertBackgroundCheck,
  shiftDifferentials,
  type ShiftDifferential,
  type InsertShiftDifferential,
  holidays,
  type Holiday,
  type InsertHoliday,
  performanceReviews,
  type PerformanceReview,
  type InsertPerformanceReview,
  performanceMetrics,
  type PerformanceMetric,
  type InsertPerformanceMetric,
  timeOffRequests,
  type TimeOffRequest,
  type InsertTimeOffRequest,
  ptoBalances,
  type PtoBalance,
  type InsertPtoBalance,
  surveyTemplates,
  type SurveyTemplate,
  type InsertSurveyTemplate,
  surveyResponses,
  type SurveyResponse,
  type InsertSurveyResponse,
  claims,
  type Claim,
  type InsertClaim,
  claimLineItems,
  type ClaimLineItem,
  type InsertClaimLineItem,
  referralSources,
  type ReferralSource,
  type InsertReferralSource,
  clientReferrals,
  type ClientReferral,
  type InsertClientReferral,
  hhaxOfficeMappings,
  type HhaxOfficeMapping,
  type InsertHhaxOfficeMapping,
  hhaxSyncLogs,
  type HhaxSyncLog,
  type InsertHhaxSyncLog,
  exclusionSources,
  type ExclusionSource,
  type InsertExclusionSource,
  exclusionRecords,
  type ExclusionRecord,
  type InsertExclusionRecord,
  caregiverExclusionChecks,
  type CaregiverExclusionCheck,
  type InsertCaregiverExclusionCheck,
  caregiverExclusionFalsePositives,
  type CaregiverExclusionFalsePositive,
  type InsertCaregiverExclusionFalsePositive,
  exclusionReports,
  type ExclusionReport,
  type InsertExclusionReport,
  apiKeys,
  type ApiKey,
  type InsertApiKey,
  apiUsageLogs,
  type ApiUsageLog,
  type InsertApiUsageLog,
  supportTickets,
  type SupportTicket,
  type InsertSupportTicket,
  ticketMessages,
  type TicketMessage,
  type InsertTicketMessage,
  customIntegrations,
  type CustomIntegration,
  type InsertCustomIntegration,
  letterTemplates,
  type LetterTemplate,
  type InsertLetterTemplate,
  letterTemplateVersions,
  type LetterTemplateVersion,
  type InsertLetterTemplateVersion,
  generatedLetters,
  type GeneratedLetter,
  type InsertGeneratedLetter,
  coordinatorPayRecords,
  type CoordinatorPayRecord,
  type InsertCoordinatorPayRecord,
  emailTemplates,
  type EmailTemplate,
  type InsertEmailTemplate,
  officeDashboardLinks,
  type OfficeDashboardLink,
  type InsertOfficeDashboardLink,
  shiftSwapRequests,
  type ShiftSwapRequest,
  type InsertShiftSwapRequest,
  eSignatureTemplates,
  type ESignatureTemplate,
  type InsertESignatureTemplate,
  eSignatureRequests,
  type ESignatureRequest,
  type InsertESignatureRequest,
  helpArticles,
  type HelpArticle,
  type InsertHelpArticle,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, count, sql, like, gte, lte, inArray } from "drizzle-orm";
import { encryptNote, decryptNote } from './encryption';

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByUsernameOrEmail(identifier: string): Promise<User | undefined>;
  updateUserLastLogin(id: string): Promise<void>;
  updateUserPassword(id: string, passwordHash: string, mustResetPassword?: boolean): Promise<void>;
  setUserResetToken(id: string, token: string, expiry: Date): Promise<void>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  clearUserResetToken(id: string): Promise<void>;
  
  // SMS login operations
  getUserByMobilePhone(phone: string): Promise<User | undefined>;
  setUserSmsCode(id: string, code: string, expiry: Date): Promise<void>;
  clearUserSmsCode(id: string): Promise<void>;
  updateUserMobilePhone(id: string, phone: string, verified: boolean): Promise<void>;
  
  // Google OAuth operations
  getUserByEmail(email: string): Promise<User | undefined>;
  linkGoogleAccount(userId: string, googleId: string): Promise<void>;
  createGoogleUser(userData: { email: string; firstName: string; lastName: string; profileImageUrl?: string; googleId: string }): Promise<User>;

  // Office operations
  getAllOffices(): Promise<Office[]>;
  getOffice(id: string): Promise<Office | undefined>;
  createOffice(office: InsertOffice): Promise<Office>;
  updateOffice(id: string, office: Partial<InsertOffice>): Promise<Office>;
  deleteOffice(id: string): Promise<void>;

  // Office Dashboard Links operations
  getOfficeDashboardLinks(officeId: string): Promise<OfficeDashboardLink[]>;
  getOfficeDashboardLink(id: string): Promise<OfficeDashboardLink | undefined>;
  createOfficeDashboardLink(link: InsertOfficeDashboardLink): Promise<OfficeDashboardLink>;
  updateOfficeDashboardLink(id: string, link: Partial<InsertOfficeDashboardLink>): Promise<OfficeDashboardLink>;
  deleteOfficeDashboardLink(id: string): Promise<void>;

  // Coordinator operations
  getAllCoordinators(officeId?: string): Promise<Coordinator[]>;
  getCoordinator(id: string): Promise<Coordinator | undefined>;
  createCoordinator(coordinator: InsertCoordinator): Promise<Coordinator>;
  updateCoordinator(id: string, coordinator: Partial<InsertCoordinator>): Promise<Coordinator>;
  deleteCoordinator(id: string): Promise<void>;

  // Client operations
  getAllClients(officeId?: string): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client>;
  updateClientsBulk(clientIds: string[], updates: Partial<InsertClient>): Promise<Client[]>;
  deleteClient(id: string): Promise<void>;
  searchClients(searchTerm: string, officeId?: string): Promise<Client[]>;

  // Caregiver operations
  getAllCaregivers(officeId?: string): Promise<Caregiver[]>;
  getCaregiver(id: string): Promise<Caregiver | undefined>;
  getCaregiverByUserId(userId: string): Promise<Caregiver | undefined>;
  getCaregiverByEmail(email: string): Promise<Caregiver | undefined>;
  createCaregiver(caregiver: InsertCaregiver): Promise<Caregiver>;
  updateCaregiver(id: string, caregiver: Partial<InsertCaregiver>): Promise<Caregiver>;
  updateCaregiversBulk(caregiverIds: string[], updates: Partial<InsertCaregiver>): Promise<Caregiver[]>;
  deleteCaregiver(id: string): Promise<void>;
  deleteCaregiversBulk(caregiverIds: string[]): Promise<void>;
  
  // Client-Caregiver assignment operations
  assignClientsToCaregiver(caregiverId: string, clientIds: string[]): Promise<void>;
  unassignClientsFromCaregiver(caregiverId: string, clientIds: string[]): Promise<void>;
  getAssignedClientsByCaregiver(caregiverId: string): Promise<Client[]>;
  getAssignedCaregiversByClient(clientId: string): Promise<Caregiver[]>;

  // Care plan operations
  getCarePlansByClient(clientId: string): Promise<CarePlan[]>;
  createCarePlan(carePlan: InsertCarePlan): Promise<CarePlan>;
  updateCarePlan(id: string, carePlan: Partial<InsertCarePlan>): Promise<CarePlan>;

  // Care plan goals operations
  getCarePlanGoals(carePlanId: string): Promise<CarePlanGoal[]>;
  createCarePlanGoal(goal: InsertCarePlanGoal): Promise<CarePlanGoal>;
  updateCarePlanGoal(id: string, goal: Partial<InsertCarePlanGoal>): Promise<CarePlanGoal>;

  // Care plan interventions operations
  getCarePlanInterventions(carePlanId: string): Promise<CarePlanIntervention[]>;
  createCarePlanIntervention(intervention: InsertCarePlanIntervention): Promise<CarePlanIntervention>;
  updateCarePlanIntervention(id: string, intervention: Partial<InsertCarePlanIntervention>): Promise<CarePlanIntervention>;

  // Progress notes operations
  getProgressNotesByClient(clientId: string): Promise<ProgressNote[]>;
  createProgressNote(note: InsertProgressNote): Promise<ProgressNote>;

  // Document operations
  getAllDocuments(officeId?: string): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  getDocumentsByClient(clientId: string): Promise<Document[]>;
  getDocumentsByCaregiver(caregiverId: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, document: Partial<InsertDocument>): Promise<Document>;
  deleteDocument(id: string): Promise<void>;

  // Incident report operations
  getAllIncidentReports(officeId?: string): Promise<IncidentReport[]>;
  createIncidentReport(report: InsertIncidentReport): Promise<IncidentReport>;
  updateIncidentReport(id: string, report: Partial<InsertIncidentReport>): Promise<IncidentReport>;

  // Incident follow-up operations
  createIncidentFollowUp(followUp: InsertIncidentFollowUp): Promise<IncidentFollowUp>;
  getIncidentFollowUps(incidentId: string): Promise<IncidentFollowUp[]>;
  getIncidentFollowUp(id: string): Promise<IncidentFollowUp | undefined>;
  updateIncidentFollowUp(id: string, followUp: Partial<InsertIncidentFollowUp>): Promise<IncidentFollowUp>;
  getOverdueFollowUps(): Promise<IncidentFollowUp[]>;
  getFollowUpsByAssignee(userId: string): Promise<IncidentFollowUp[]>;
  completeFollowUp(id: string, completedBy: string): Promise<IncidentFollowUp>;

  // Task operations
  getAllTasks(officeId?: string): Promise<Task[]>;
  getTasksByUser(userId: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: string): Promise<void>;

  // Message operations
  getMessagesByUser(userId: string, officeId?: string): Promise<Message[]>;
  getSentMessagesByUser(userId: string, status?: string): Promise<Message[]>;
  getReceivedMessagesByUser(userId: string, status?: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: string): Promise<void>;
  updateMessageStatus(messageId: string, userId: string, status: 'unread' | 'read' | 'archived'): Promise<void>;
  updateMessageDelivery(messageId: string, delivery: {
    deliveryStatus: string;
    externalId?: string;
    deliveryAttempts: number;
    lastDeliveryAttempt: Date;
  }): Promise<void>;

  // Certification operations
  getCertificationsByCaregiver(caregiverId: string): Promise<Certification[]>;
  createCertification(certification: InsertCertification): Promise<Certification>;
  updateCertification(id: string, certification: Partial<InsertCertification>): Promise<Certification>;

  // Compliance operations
  getComplianceItemsByCaregiver(caregiverId: string): Promise<ComplianceItem[]>;
  createComplianceItem(item: InsertComplianceItem): Promise<ComplianceItem>;
  updateComplianceItem(id: string, item: Partial<InsertComplianceItem>): Promise<ComplianceItem>;

  // Dashboard metrics
  getDashboardMetrics(officeId?: string): Promise<{
    activeClients: number;
    activeCaregivers: number;
    pendingTasks: number;
    complianceRate: number;
    criticalAlerts: number;
  }>;

  // Audit logging
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;


  // Training operations
  getAllTrainings(officeId?: string): Promise<Training[]>;
  createTraining(training: InsertTraining): Promise<Training>;

  // Training record operations
  getAllTrainingRecords(): Promise<TrainingRecord[]>;
  createTrainingRecord(record: InsertTrainingRecord): Promise<TrainingRecord>;

  // Certification operations
  getAllCertifications(): Promise<Certification[]>;

  // Additional user operations for communication
  getAllUsers(): Promise<User[]>;
  updateMessage(id: string, data: Partial<InsertMessage>): Promise<Message>;

  // User management operations
  createUser(user: Partial<UpsertUser>): Promise<User>;
  updateUser(id: string, user: Partial<UpsertUser>): Promise<User>;
  deleteUser(id: string): Promise<void>;

  // Incident report operations (interface duplicate - already defined above)
  getIncidentReport(id: string): Promise<IncidentReport | undefined>;

  // Family member operations
  getFamilyMember(id: string): Promise<FamilyMember | undefined>;
  getFamilyMemberByUserId(userId: string): Promise<FamilyMember | undefined>;
  createFamilyMember(familyMember: InsertFamilyMember): Promise<FamilyMember>;
  updateFamilyMember(id: string, familyMember: Partial<InsertFamilyMember>): Promise<FamilyMember>;

  // Client-Family relationship operations
  getClientFamilyMembers(clientId: string): Promise<(ClientFamilyMember & { familyMember: FamilyMember & { user: User } })[]>;
  getFamilyMemberClients(familyMemberId: string): Promise<(ClientFamilyMember & { client: Client })[]>;
  addFamilyMemberToClient(relationship: InsertClientFamilyMember): Promise<ClientFamilyMember>;
  updateClientFamilyAccess(clientId: string, familyMemberId: string, access: Partial<InsertClientFamilyMember>): Promise<ClientFamilyMember>;
  removeFamilyMemberFromClient(clientId: string, familyMemberId: string): Promise<void>;

  // Family portal update operations
  getFamilyUpdates(clientId?: string, familyMemberId?: string): Promise<FamilyUpdate[]>;
  createFamilyUpdate(update: InsertFamilyUpdate): Promise<FamilyUpdate>;
  updateFamilyUpdate(id: string, update: Partial<InsertFamilyUpdate>): Promise<FamilyUpdate>;
  reviewFamilyUpdate(id: string, reviewedBy: string, status: string, reviewNotes?: string): Promise<FamilyUpdate>;

  // Role and Permission management operations
  getAllCustomRoles(): Promise<CustomRole[]>;
  getCustomRole(id: string): Promise<CustomRole | undefined>;
  createCustomRole(role: InsertCustomRole): Promise<CustomRole>;
  updateCustomRole(id: string, role: Partial<InsertCustomRole>): Promise<CustomRole>;
  deleteCustomRole(id: string): Promise<void>;
  
  getAllPermissions(): Promise<Permission[]>;
  getPermission(id: string): Promise<Permission | undefined>;
  createPermission(permission: InsertPermission): Promise<Permission>;
  updatePermission(id: string, permission: Partial<InsertPermission>): Promise<Permission>;
  deletePermission(id: string): Promise<void>;
  getPermissionsByCategory(category: string): Promise<Permission[]>;
  
  getRolePermissions(roleId: string): Promise<Permission[]>;
  addPermissionToRole(rolePermission: InsertRolePermission): Promise<RolePermission>;
  removePermissionFromRole(roleId: string, permissionId: string): Promise<void>;
  
  getUserCustomRoles(userId: string): Promise<CustomRole[]>;
  assignRoleToUser(userRole: InsertUserCustomRole): Promise<UserCustomRole>;
  removeRoleFromUser(userId: string, roleId: string): Promise<void>;
  getUserPermissions(userId: string): Promise<Permission[]>;

  // Scheduling operations
  // Master week templates
  getMasterWeekTemplatesByClient(clientId: string): Promise<MasterWeekTemplate[]>;
  getMasterWeekTemplate(id: string): Promise<MasterWeekTemplate | undefined>;
  createMasterWeekTemplate(template: InsertMasterWeekTemplate): Promise<MasterWeekTemplate>;
  updateMasterWeekTemplate(id: string, template: Partial<InsertMasterWeekTemplate>): Promise<MasterWeekTemplate>;
  deleteMasterWeekTemplate(id: string): Promise<void>;
  
  // Master week slots
  getMasterWeekSlots(templateId: string): Promise<MasterWeekSlot[]>;
  createMasterWeekSlot(slot: InsertMasterWeekSlot): Promise<MasterWeekSlot>;
  updateMasterWeekSlot(id: string, slot: Partial<InsertMasterWeekSlot>): Promise<MasterWeekSlot>;
  deleteMasterWeekSlot(id: string): Promise<void>;
  
  // Client schedules
  getClientSchedules(clientId: string, startDate?: Date, endDate?: Date): Promise<ClientSchedule[]>;
  getSchedulesByCaregiver(caregiverId: string, startDate?: Date, endDate?: Date): Promise<ClientSchedule[]>;
  getSchedulesByOffice(officeId: string, startDate?: Date, endDate?: Date): Promise<ClientSchedule[]>;
  createClientSchedule(schedule: InsertClientSchedule): Promise<ClientSchedule>;
  updateClientSchedule(id: string, schedule: Partial<InsertClientSchedule>): Promise<ClientSchedule>;
  deleteClientSchedule(id: string): Promise<void>;
  
  // Schedule rollover from master week
  applyMasterWeekToSchedules(templateId: string, fromDate: Date, toDate: Date): Promise<ClientSchedule[]>;
  
  // Schedule change logging
  createScheduleChangeLog(log: InsertScheduleChangeLog): Promise<ScheduleChangeLog>;
  getScheduleChangeLogs(scheduleId: string): Promise<ScheduleChangeLog[]>;

  // AI Issue Detection operations
  getAllAiDetectedIssues(): Promise<AiDetectedIssue[]>;
  getAiDetectedIssue(id: string): Promise<AiDetectedIssue | undefined>;
  createAiDetectedIssue(issue: InsertAiDetectedIssue): Promise<AiDetectedIssue>;
  updateAiDetectedIssue(id: string, issue: Partial<InsertAiDetectedIssue>): Promise<AiDetectedIssue>;
  deleteAiDetectedIssue(id: string): Promise<void>;
  getAllComplianceItems(officeId?: string): Promise<ComplianceItem[]>;

  // EVV Data operations
  getAllEvvData(officeId?: string): Promise<EvvData[]>;
  getEvvData(id: string): Promise<EvvData | undefined>;
  getEvvDataByMonthYear(month: number, year: number): Promise<EvvData[]>;
  createEvvData(data: InsertEvvData): Promise<EvvData>;
  updateEvvData(id: string, data: Partial<InsertEvvData>): Promise<EvvData>;
  deleteEvvData(id: string): Promise<void>;

  // Monthly dashboard statistics
  getMonthlyStats(year: number, officeId?: string): Promise<{
    month: number;
    activeDcwCount: number;
    evvPercentage: number;
    clientCount: number;
  }[]>;

  // Incident report statistics by month
  getIncidentStatsByMonth(year?: number): Promise<{
    month: number;
    year: number;
    total: number;
    solved: number;
    unsolved: number;
  }[]>;

  // MCO Type operations
  getAllMcoTypes(): Promise<McoType[]>;
  getMcoType(id: string): Promise<McoType | undefined>;
  createMcoType(mcoType: InsertMcoType): Promise<McoType>;
  updateMcoType(id: string, mcoType: Partial<InsertMcoType>): Promise<McoType>;
  deleteMcoType(id: string): Promise<void>;

  // MCO operations
  getAllMcos(): Promise<Mco[]>;
  getMco(id: string): Promise<Mco | undefined>;
  getMcosByType(typeId: string): Promise<Mco[]>;
  getMcosByOffice(officeId: string): Promise<Mco[]>;
  createMco(mco: InsertMco): Promise<Mco>;
  updateMco(id: string, mco: Partial<InsertMco>): Promise<Mco>;
  deleteMco(id: string): Promise<void>;

  // System Settings operations
  getAllSystemSettings(): Promise<SystemSetting[]>;
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  createSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting>;
  updateSystemSetting(key: string, setting: Partial<InsertSystemSetting>): Promise<SystemSetting>;
  upsertSystemSetting(key: string, value: string): Promise<SystemSetting>;
  deleteSystemSetting(key: string): Promise<void>;

  // Entity Field Config operations
  getAllEntityFieldConfigs(): Promise<EntityFieldConfig[]>;
  getEntityFieldConfigsByType(entityType: 'client' | 'caregiver'): Promise<EntityFieldConfig[]>;
  getEntityFieldConfig(id: string): Promise<EntityFieldConfig | undefined>;
  createEntityFieldConfig(config: InsertEntityFieldConfig): Promise<EntityFieldConfig>;
  updateEntityFieldConfig(id: string, config: Partial<InsertEntityFieldConfig>): Promise<EntityFieldConfig>;
  deleteEntityFieldConfig(id: string): Promise<void>;

  // Client Communications operations
  getClientCommunications(clientId: string): Promise<ClientCommunication[]>;
  createClientCommunication(communication: InsertClientCommunication): Promise<ClientCommunication>;
  updateClientCommunication(id: string, communication: Partial<InsertClientCommunication>): Promise<ClientCommunication>;
  deleteClientCommunication(id: string): Promise<void>;

  // Office MCO Billing Rate operations
  getOfficeMcoBillingRates(officeId: string, mcoId?: string): Promise<OfficeMcoBillingRate[]>;
  getOfficeMcoBillingRate(id: string): Promise<OfficeMcoBillingRate | undefined>;
  createOfficeMcoBillingRate(rate: InsertOfficeMcoBillingRate): Promise<OfficeMcoBillingRate>;
  updateOfficeMcoBillingRate(id: string, rate: Partial<InsertOfficeMcoBillingRate>): Promise<OfficeMcoBillingRate>;
  deleteOfficeMcoBillingRate(id: string): Promise<void>;

  // Schedule rollover operations
  rolloverSchedules(clientId: string, days?: number): Promise<ClientSchedule[]>;

  // Caregiver Notes operations
  getCaregiverNotes(caregiverId: string): Promise<CaregiverNote[]>;
  createCaregiverNote(note: InsertCaregiverNote): Promise<CaregiverNote>;
  updateCaregiverNote(id: string, note: Partial<InsertCaregiverNote>): Promise<CaregiverNote>;
  deleteCaregiverNote(id: string): Promise<void>;

  // Caregiver Preferences operations
  getCaregiverPreferences(caregiverId: string): Promise<CaregiverPreference[]>;
  createCaregiverPreference(preference: InsertCaregiverPreference): Promise<CaregiverPreference>;
  updateCaregiverPreference(id: string, preference: Partial<InsertCaregiverPreference>): Promise<CaregiverPreference>;
  deleteCaregiverPreference(id: string): Promise<void>;

  // Caregiver Absences operations
  getCaregiverAbsences(caregiverId: string): Promise<CaregiverAbsence[]>;
  createCaregiverAbsence(absence: InsertCaregiverAbsence): Promise<CaregiverAbsence>;
  updateCaregiverAbsence(id: string, absence: Partial<InsertCaregiverAbsence>): Promise<CaregiverAbsence>;
  deleteCaregiverAbsence(id: string): Promise<void>;

  // Caregiver Availability operations
  getCaregiverAvailability(caregiverId: string): Promise<CaregiverAvailability[]>;
  setWeeklyAvailability(caregiverId: string, availability: InsertCaregiverAvailability[]): Promise<CaregiverAvailability[]>;
  createCaregiverAvailability(availability: InsertCaregiverAvailability): Promise<CaregiverAvailability>;
  updateCaregiverAvailability(id: string, availability: Partial<InsertCaregiverAvailability>): Promise<CaregiverAvailability>;
  deleteCaregiverAvailability(id: string): Promise<void>;
  
  // Caregiver Availability Exceptions operations
  getAvailabilityExceptions(caregiverId: string, startDate?: Date, endDate?: Date): Promise<CaregiverAvailabilityException[]>;
  createAvailabilityException(exception: InsertCaregiverAvailabilityException): Promise<CaregiverAvailabilityException>;
  deleteAvailabilityException(id: string): Promise<void>;
  
  // Availability checking operations
  getAvailableCaregivers(date: Date, startTime: string, endTime: string, officeId?: string): Promise<Caregiver[]>;
  checkCaregiverAvailability(caregiverId: string, date: Date, startTime: string, endTime: string): Promise<{ available: boolean; reason?: string }>;
  
  // Shift matching operations
  getCaregiversWithMatchCriteria(officeId?: string, skills?: string[], availableOnDate?: Date): Promise<Caregiver[]>;
  getCaregiverScheduleConflicts(caregiverId: string, date: Date, startTime: string, endTime: string): Promise<CaregiverSchedule[]>;

  // Caregiver Payroll Info operations
  getCaregiverPayrollInfo(caregiverId: string): Promise<CaregiverPayrollInfo | undefined>;
  upsertCaregiverPayrollInfo(info: InsertCaregiverPayrollInfo): Promise<CaregiverPayrollInfo>;

  // Caregiver Expenses operations
  getCaregiverExpenses(caregiverId: string): Promise<CaregiverExpense[]>;
  createCaregiverExpense(expense: InsertCaregiverExpense): Promise<CaregiverExpense>;
  updateCaregiverExpense(id: string, expense: Partial<InsertCaregiverExpense>): Promise<CaregiverExpense>;
  deleteCaregiverExpense(id: string): Promise<void>;

  // Caregiver Paychecks operations
  getCaregiverPaychecks(caregiverId: string): Promise<CaregiverPaycheck[]>;
  createCaregiverPaycheck(paycheck: InsertCaregiverPaycheck): Promise<CaregiverPaycheck>;
  updateCaregiverPaycheck(id: string, paycheck: Partial<InsertCaregiverPaycheck>): Promise<CaregiverPaycheck>;

  // Caregiver Rates operations
  getCaregiverRates(caregiverId: string): Promise<CaregiverRate[]>;
  createCaregiverRate(rate: InsertCaregiverRate): Promise<CaregiverRate>;
  updateCaregiverRate(id: string, rate: Partial<InsertCaregiverRate>): Promise<CaregiverRate>;
  deleteCaregiverRate(id: string): Promise<void>;

  // Caregiver In-Service operations
  getCaregiverInServices(caregiverId: string): Promise<CaregiverInService[]>;
  createCaregiverInService(inService: InsertCaregiverInService): Promise<CaregiverInService>;
  updateCaregiverInService(id: string, inService: Partial<InsertCaregiverInService>): Promise<CaregiverInService>;
  deleteCaregiverInService(id: string): Promise<void>;

  // Caregiver Office Moves operations
  getCaregiverOfficeMoves(caregiverId: string): Promise<CaregiverOfficeMove[]>;
  createCaregiverOfficeMove(move: InsertCaregiverOfficeMove): Promise<CaregiverOfficeMove>;
  updateCaregiverOfficeMove(id: string, move: Partial<InsertCaregiverOfficeMove>): Promise<CaregiverOfficeMove>;

  // Caregiver Schedules operations
  getCaregiverSchedules(caregiverId: string, startDate?: Date, endDate?: Date): Promise<CaregiverSchedule[]>;
  getCaregiverSchedule(id: string): Promise<CaregiverSchedule | undefined>;
  getAllCaregiverSchedules(officeId?: string): Promise<CaregiverSchedule[]>;
  createCaregiverSchedule(schedule: InsertCaregiverSchedule): Promise<CaregiverSchedule>;
  updateCaregiverSchedule(id: string, schedule: Partial<InsertCaregiverSchedule>): Promise<CaregiverSchedule>;
  deleteCaregiverSchedule(id: string): Promise<void>;
  
  // EVV (Electronic Visit Verification) operations
  clockInWithLocation(scheduleId: string, latitude: string, longitude: string, distance?: string, photo?: string): Promise<CaregiverSchedule>;
  clockOutWithLocation(scheduleId: string, latitude: string, longitude: string, distance?: string, photo?: string): Promise<CaregiverSchedule>;
  getEvvComplianceStats(officeId?: string, startDate?: Date, endDate?: Date): Promise<{
    totalSchedules: number;
    compliant: number;
    nonCompliant: number;
    pending: number;
    complianceRate: number;
  }>;

  // Client MCO operations
  getClientMcosByClient(clientId: string): Promise<ClientMco[]>;
  getClientMco(id: string): Promise<ClientMco | undefined>;
  createClientMco(mco: InsertClientMco): Promise<ClientMco>;
  updateClientMco(id: string, mco: Partial<InsertClientMco>): Promise<ClientMco>;
  deleteClientMco(id: string): Promise<void>;

  // Office Licenses operations
  getOfficeLicenses(officeId: string): Promise<OfficeLicense[]>;
  getOfficeLicense(id: string): Promise<OfficeLicense | undefined>;
  createOfficeLicense(license: InsertOfficeLicense): Promise<OfficeLicense>;
  updateOfficeLicense(id: string, license: Partial<InsertOfficeLicense>): Promise<OfficeLicense>;
  deleteOfficeLicense(id: string): Promise<void>;

  // Office Staff operations
  getOfficeStaff(officeId: string): Promise<OfficeStaff[]>;
  getOfficeStaffMember(id: string): Promise<OfficeStaff | undefined>;
  createOfficeStaff(staff: InsertOfficeStaff): Promise<OfficeStaff>;
  updateOfficeStaff(id: string, staff: Partial<InsertOfficeStaff>): Promise<OfficeStaff>;
  deleteOfficeStaff(id: string): Promise<void>;

  // Office Expenses operations
  getOfficeExpenses(officeId: string): Promise<OfficeExpense[]>;
  getOfficeExpense(id: string): Promise<OfficeExpense | undefined>;
  createOfficeExpense(expense: InsertOfficeExpense): Promise<OfficeExpense>;
  updateOfficeExpense(id: string, expense: Partial<InsertOfficeExpense>): Promise<OfficeExpense>;
  deleteOfficeExpense(id: string): Promise<void>;

  // Eligibility Check operations
  getEligibilityChecksByClient(clientId: string): Promise<EligibilityCheck[]>;
  getEligibilityCheck(id: string): Promise<EligibilityCheck | undefined>;
  getLatestEligibilityCheck(clientId: string): Promise<EligibilityCheck | undefined>;
  createEligibilityCheck(check: InsertEligibilityCheck): Promise<EligibilityCheck>;
  updateEligibilityCheck(id: string, check: Partial<InsertEligibilityCheck>): Promise<EligibilityCheck>;
  deleteEligibilityCheck(id: string): Promise<void>;

  // Eligibility Schedule operations
  getEligibilitySchedule(clientId: string): Promise<EligibilitySchedule | undefined>;
  getAllEligibilitySchedules(): Promise<EligibilitySchedule[]>;
  createEligibilitySchedule(schedule: InsertEligibilitySchedule): Promise<EligibilitySchedule>;
  updateEligibilitySchedule(id: string, schedule: Partial<InsertEligibilitySchedule>): Promise<EligibilitySchedule>;
  deleteEligibilitySchedule(id: string): Promise<void>;
  getDueEligibilityChecks(): Promise<EligibilitySchedule[]>;
  updateClientEligibilityStatus(clientId: string, medicaidStatus?: string, snapStatus?: string): Promise<Client>;

  // Caregiver Compliance operations
  getCaregiverComplianceByCaregiver(caregiverId: string): Promise<CaregiverCompliance[]>;
  getCaregiverCompliance(id: string): Promise<CaregiverCompliance | undefined>;
  createCaregiverCompliance(compliance: InsertCaregiverCompliance): Promise<CaregiverCompliance>;
  updateCaregiverCompliance(id: string, compliance: Partial<InsertCaregiverCompliance>): Promise<CaregiverCompliance>;
  deleteCaregiverCompliance(id: string): Promise<void>;

  // Birthday notification operations
  getBirthdayNotifications(officeId?: string, limit?: number): Promise<BirthdayNotification[]>;
  createBirthdayNotification(notification: InsertBirthdayNotification): Promise<BirthdayNotification>;
  checkBirthdayNotificationSentToday(recipientType: string, recipientId: string, dateString: string): Promise<boolean>;
  updateBirthdayNotificationStatus(id: string, smsStatus: string, emailStatus: string, smsError?: string, emailError?: string): Promise<void>;
  getTodaysBirthdays(officeId?: string): Promise<{ clients: Client[]; caregivers: Caregiver[] }>;
  getUpcomingBirthdays(days: number, officeId?: string): Promise<{ clients: Client[]; caregivers: Caregiver[] }>;

  // Medication operations
  getMedicationsByClient(clientId: string): Promise<Medication[]>;
  getMedication(id: string): Promise<Medication | undefined>;
  createMedication(medication: InsertMedication): Promise<Medication>;
  updateMedication(id: string, medication: Partial<InsertMedication>): Promise<Medication>;
  deleteMedication(id: string): Promise<void>;

  // Medication Log operations
  getMedicationLogs(medicationId: string): Promise<MedicationLog[]>;
  createMedicationLog(log: InsertMedicationLog): Promise<MedicationLog>;
  getMedicationAdherence(medicationId: string): Promise<{ total: number; taken: number; skipped: number; refused: number; adherenceRate: number }>;

  // Vital Signs operations
  createVitalSign(vitalSign: InsertVitalSign): Promise<VitalSign>;
  getVitalSignsByClient(clientId: string, limit?: number): Promise<VitalSign[]>;
  getVitalSignsHistory(clientId: string, startDate: Date, endDate: Date): Promise<VitalSign[]>;
  getVitalSignTrends(clientId: string, startDate: Date, endDate: Date): Promise<{
    avgBloodPressureSystolic: number | null;
    avgBloodPressureDiastolic: number | null;
    avgHeartRate: number | null;
    avgTemperature: number | null;
    avgRespiratoryRate: number | null;
    avgOxygenSaturation: number | null;
    avgWeight: number | null;
    avgBloodSugar: number | null;
    avgPainLevel: number | null;
    count: number;
  }>;

  // Notification Template operations
  getAllNotificationTemplates(): Promise<NotificationTemplate[]>;
  getNotificationTemplate(id: string): Promise<NotificationTemplate | undefined>;
  getNotificationTemplateByName(name: string): Promise<NotificationTemplate | undefined>;
  createNotificationTemplate(template: InsertNotificationTemplate): Promise<NotificationTemplate>;
  updateNotificationTemplate(id: string, template: Partial<InsertNotificationTemplate>): Promise<NotificationTemplate>;
  deleteNotificationTemplate(id: string): Promise<void>;

  // Notification Queue operations
  createNotificationQueueItem(item: InsertNotificationQueueItem): Promise<NotificationQueueItem>;
  getPendingNotifications(): Promise<NotificationQueueItem[]>;
  getNotificationHistory(recipientId?: string, recipientType?: string, limit?: number): Promise<NotificationQueueItem[]>;
  updateNotificationQueueItem(id: string, item: Partial<InsertNotificationQueueItem>): Promise<NotificationQueueItem>;

  // Notification Preferences operations
  getNotificationPreferences(userId: string): Promise<NotificationPreference | undefined>;
  createNotificationPreferences(prefs: InsertNotificationPreference): Promise<NotificationPreference>;
  updateNotificationPreferences(userId: string, prefs: Partial<InsertNotificationPreference>): Promise<NotificationPreference>;

  // Mileage Log operations
  createMileageLog(log: InsertMileageLog): Promise<MileageLog>;
  updateMileageLog(id: string, log: Partial<InsertMileageLog>): Promise<MileageLog>;
  getMileageLog(id: string): Promise<MileageLog | undefined>;
  getMileageLogsByCaregiver(caregiverId: string, startDate?: Date, endDate?: Date): Promise<MileageLog[]>;
  getMileageLogsByStatus(status: string): Promise<MileageLog[]>;
  approveMileageLog(id: string, approvedBy: string): Promise<MileageLog>;
  getMileageReimbursementTotals(caregiverId: string, startDate?: Date, endDate?: Date): Promise<{ totalMiles: number; totalReimbursement: number; pendingAmount: number; approvedAmount: number; paidAmount: number }>;

  // Applicant operations
  getAllApplicants(officeId?: string): Promise<Applicant[]>;
  getApplicant(id: string): Promise<Applicant | undefined>;
  createApplicant(applicant: InsertApplicant): Promise<Applicant>;
  updateApplicant(id: string, applicant: Partial<InsertApplicant>): Promise<Applicant>;
  deleteApplicant(id: string): Promise<void>;
  getApplicantsByStatus(status: string, officeId?: string): Promise<Applicant[]>;
  getApplicantsByOffice(officeId: string): Promise<Applicant[]>;
  moveApplicantToStage(id: string, newStatus: string): Promise<Applicant>;
  getApplicantPipelineCounts(officeId?: string): Promise<{ status: string; count: number }[]>;
  convertApplicantToCaregiver(applicantId: string): Promise<Caregiver>;

  // Applicant Notes operations
  getApplicantNotes(applicantId: string): Promise<ApplicantNote[]>;
  createApplicantNote(note: InsertApplicantNote): Promise<ApplicantNote>;

  // Applicant Interviews operations
  getApplicantInterviews(applicantId: string): Promise<ApplicantInterview[]>;
  getApplicantInterview(id: string): Promise<ApplicantInterview | undefined>;
  createApplicantInterview(interview: InsertApplicantInterview): Promise<ApplicantInterview>;
  updateApplicantInterview(id: string, interview: Partial<InsertApplicantInterview>): Promise<ApplicantInterview>;

  // Background Check operations
  createBackgroundCheck(check: InsertBackgroundCheck): Promise<BackgroundCheck>;
  updateBackgroundCheck(id: string, check: Partial<InsertBackgroundCheck>): Promise<BackgroundCheck>;
  getBackgroundCheck(id: string): Promise<BackgroundCheck | undefined>;
  getBackgroundChecksByApplicant(applicantId: string): Promise<BackgroundCheck[]>;
  getBackgroundChecksByCaregiver(caregiverId: string): Promise<BackgroundCheck[]>;
  getExpiringBackgroundChecks(daysAhead: number): Promise<BackgroundCheck[]>;
  getPendingBackgroundChecks(): Promise<BackgroundCheck[]>;
  getBackgroundChecksByStatus(status: string): Promise<BackgroundCheck[]>;
  bulkCreateBackgroundChecks(applicantId: string | null, caregiverId: string | null, checkTypes: string[], requestedBy?: string): Promise<BackgroundCheck[]>;

  // Shift Differential operations
  getShiftDifferentials(officeId?: string, mcoId?: string): Promise<ShiftDifferential[]>;
  getShiftDifferential(id: string): Promise<ShiftDifferential | undefined>;
  createShiftDifferential(differential: InsertShiftDifferential): Promise<ShiftDifferential>;
  updateShiftDifferential(id: string, differential: Partial<InsertShiftDifferential>): Promise<ShiftDifferential>;
  deleteShiftDifferential(id: string): Promise<void>;
  getApplicableDifferentials(date: Date, startTime: string, endTime: string, officeId?: string, mcoId?: string): Promise<ShiftDifferential[]>;
  calculateShiftDifferential(caregiverId: string, date: Date, startTime: string, endTime: string, baseRate: number): Promise<{ totalPay: number; baseAmount: number; differentialAmount: number; appliedDifferentials: { name: string; type: string; amount: number }[] }>;

  // Holiday operations
  getHolidays(officeId?: string): Promise<Holiday[]>;
  getHoliday(id: string): Promise<Holiday | undefined>;
  createHoliday(holiday: InsertHoliday): Promise<Holiday>;
  updateHoliday(id: string, holiday: Partial<InsertHoliday>): Promise<Holiday>;
  deleteHoliday(id: string): Promise<void>;
  isHolidayDate(date: Date, officeId?: string): Promise<boolean>;

  // Performance Review operations
  createPerformanceReview(review: InsertPerformanceReview): Promise<PerformanceReview>;
  updatePerformanceReview(id: string, review: Partial<InsertPerformanceReview>): Promise<PerformanceReview>;
  getPerformanceReview(id: string): Promise<PerformanceReview | undefined>;
  getPerformanceReviewsByCaregiver(caregiverId: string): Promise<PerformanceReview[]>;
  getAllPerformanceReviews(): Promise<PerformanceReview[]>;
  getUpcomingReviews(daysAhead: number): Promise<PerformanceReview[]>;
  acknowledgeReview(reviewId: string, caregiverId: string): Promise<PerformanceReview>;

  // Performance Metrics operations
  createPerformanceMetric(metric: InsertPerformanceMetric): Promise<PerformanceMetric>;
  getPerformanceMetrics(reviewId: string): Promise<PerformanceMetric[]>;
  calculateOverallRating(reviewId: string): Promise<number | null>;

  // Time-off Request operations
  createTimeOffRequest(request: InsertTimeOffRequest): Promise<TimeOffRequest>;
  updateTimeOffRequest(id: string, request: Partial<InsertTimeOffRequest>): Promise<TimeOffRequest>;
  getTimeOffRequest(id: string): Promise<TimeOffRequest | undefined>;
  getTimeOffRequestsByCaregiver(caregiverId: string): Promise<TimeOffRequest[]>;
  getTimeOffRequestsByStatus(status: string): Promise<TimeOffRequest[]>;
  getAllTimeOffRequests(): Promise<TimeOffRequest[]>;
  approveTimeOffRequest(id: string, reviewerId: string, notes?: string): Promise<TimeOffRequest>;
  denyTimeOffRequest(id: string, reviewerId: string, notes?: string): Promise<TimeOffRequest>;
  cancelTimeOffRequest(id: string): Promise<TimeOffRequest>;

  // PTO Balance operations
  getPtoBalance(caregiverId: string, year: number): Promise<PtoBalance[]>;
  getPtoBalanceByType(caregiverId: string, year: number, ptoType: string): Promise<PtoBalance | undefined>;
  createPtoBalance(balance: InsertPtoBalance): Promise<PtoBalance>;
  updatePtoBalance(id: string, balance: Partial<InsertPtoBalance>): Promise<PtoBalance>;
  calculatePtoUsed(caregiverId: string, year: number, ptoType: string): Promise<number>;

  // Survey Template operations
  getSurveyTemplates(isActive?: boolean): Promise<SurveyTemplate[]>;
  getSurveyTemplate(id: string): Promise<SurveyTemplate | undefined>;
  createSurveyTemplate(template: InsertSurveyTemplate): Promise<SurveyTemplate>;
  updateSurveyTemplate(id: string, template: Partial<InsertSurveyTemplate>): Promise<SurveyTemplate>;
  deleteSurveyTemplate(id: string): Promise<void>;

  // Survey Response operations
  getSurveyResponses(officeId?: string): Promise<SurveyResponse[]>;
  getSurveyResponse(id: string): Promise<SurveyResponse | undefined>;
  getSurveyResponseByToken(token: string): Promise<SurveyResponse | undefined>;
  getSurveyResponsesByClient(clientId: string): Promise<SurveyResponse[]>;
  getSurveyResponsesByCaregiver(caregiverId: string): Promise<SurveyResponse[]>;
  createSurveyResponse(response: InsertSurveyResponse): Promise<SurveyResponse>;
  updateSurveyResponse(id: string, response: Partial<InsertSurveyResponse>): Promise<SurveyResponse>;
  completeSurvey(id: string, responses: any, overallRating: number, comments?: string): Promise<SurveyResponse>;
  getSatisfactionStats(officeId?: string, startDate?: Date, endDate?: Date): Promise<{
    averageRating: number;
    totalResponses: number;
    completedResponses: number;
    pendingResponses: number;
    responseRate: number;
    ratingDistribution: { rating: number; count: number }[];
  }>;

  // Claims operations
  getAllClaims(officeId?: string): Promise<Claim[]>;
  getClaim(id: string): Promise<Claim | undefined>;
  createClaim(claim: InsertClaim): Promise<Claim>;
  updateClaim(id: string, claim: Partial<InsertClaim>): Promise<Claim>;
  getClaimsByClient(clientId: string): Promise<Claim[]>;
  getClaimsByStatus(status: string): Promise<Claim[]>;
  submitClaim(id: string): Promise<Claim>;
  voidClaim(id: string, reason: string): Promise<Claim>;
  resubmitClaim(id: string, createdBy: string): Promise<Claim>;
  getClaimsByDateRange(startDate: Date, endDate: Date, officeId?: string): Promise<Claim[]>;
  getClaimsAgingReport(officeId?: string): Promise<{
    current: { count: number; amount: number };
    days30: { count: number; amount: number };
    days60: { count: number; amount: number };
    days90: { count: number; amount: number };
    over90: { count: number; amount: number };
  }>;
  getClaimsSummary(officeId?: string, startDate?: Date, endDate?: Date): Promise<{
    totalClaims: number;
    totalBilled: number;
    totalApproved: number;
    totalPaid: number;
    totalDenied: number;
    byStatus: { status: string; count: number; amount: number }[];
  }>;

  // Claim Line Items operations
  createClaimLineItem(lineItem: InsertClaimLineItem): Promise<ClaimLineItem>;
  getClaimLineItems(claimId: string): Promise<ClaimLineItem[]>;
  deleteClaimLineItem(id: string): Promise<void>;

  // Analytics operations
  getActiveClientCount(officeId?: string, asOfDate?: Date): Promise<number>;
  getActiveCaregiverCount(officeId?: string, asOfDate?: Date): Promise<number>;
  getVisitStats(officeId?: string, startDate?: Date, endDate?: Date): Promise<{
    completed: number;
    missed: number;
    cancelled: number;
    totalHours: number;
  }>;
  getRevenueStats(officeId?: string, startDate?: Date, endDate?: Date): Promise<{
    billed: number;
    collected: number;
    outstanding: number;
  }>;
  getTrainingComplianceRate(officeId?: string): Promise<number>;
  getCaregiverTurnover(officeId?: string, startDate?: Date, endDate?: Date): Promise<{
    hired: number;
    terminated: number;
    turnoverRate: number;
  }>;
  getMonthlyMetrics(metric: string, officeId?: string, months?: number): Promise<{
    month: string;
    value: number;
  }[]>;

  // Referral Source operations
  getReferralSources(officeId?: string): Promise<ReferralSource[]>;
  getReferralSource(id: string): Promise<ReferralSource | undefined>;
  createReferralSource(source: InsertReferralSource): Promise<ReferralSource>;
  updateReferralSource(id: string, source: Partial<InsertReferralSource>): Promise<ReferralSource>;
  deleteReferralSource(id: string): Promise<void>;

  // Client Referral operations
  getClientReferrals(officeId?: string): Promise<ClientReferral[]>;
  getClientReferral(id: string): Promise<ClientReferral | undefined>;
  createClientReferral(referral: InsertClientReferral): Promise<ClientReferral>;
  updateClientReferral(id: string, referral: Partial<InsertClientReferral>): Promise<ClientReferral>;
  getReferralsBySource(sourceId: string): Promise<ClientReferral[]>;
  convertReferral(id: string): Promise<ClientReferral>;
  getReferralStats(officeId?: string, startDate?: Date, endDate?: Date): Promise<{
    totalReferrals: number;
    converted: number;
    lost: number;
    inProgress: number;
    conversionRate: number;
    bySource: { sourceId: string; sourceName: string; sourceType: string; total: number; converted: number; conversionRate: number }[];
  }>;
  getTopReferralSources(officeId?: string, limit?: number): Promise<{ id: string; name: string; type: string; totalReferrals: number; converted: number; conversionRate: number }[]>;

  // HHAX Integration operations
  getCaregiverByHhaxCode(hhaxCode: string): Promise<Caregiver | undefined>;
  getClientByHhaxAdmissionId(admissionId: string): Promise<Client | undefined>;
  getHhaxOfficeMappings(): Promise<HhaxOfficeMapping[]>;
  createHhaxOfficeMapping(mapping: InsertHhaxOfficeMapping): Promise<HhaxOfficeMapping>;
  updateHhaxOfficeMapping(id: string, mapping: Partial<InsertHhaxOfficeMapping>): Promise<HhaxOfficeMapping>;
  deleteHhaxOfficeMapping(id: string): Promise<void>;
  createHhaxSyncLog(log: InsertHhaxSyncLog): Promise<HhaxSyncLog>;
  updateHhaxSyncLog(id: string, log: Partial<InsertHhaxSyncLog>): Promise<HhaxSyncLog>;
  getHhaxSyncLogs(limit?: number): Promise<HhaxSyncLog[]>;
  createSchedule(schedule: { clientId: string; caregiverId: string; officeId?: string | null; date: Date; startTime: string; endTime: string; status: string; notes?: string }): Promise<ClientSchedule>;

  // API Key operations
  createApiKey(data: InsertApiKey): Promise<ApiKey>;
  getApiKeysByOrganization(organizationId: string): Promise<ApiKey[]>;
  getApiKeyByPrefix(prefix: string): Promise<ApiKey | null>;
  updateApiKey(id: string, data: Partial<ApiKey>): Promise<ApiKey>;
  deleteApiKey(id: string): Promise<void>;
  incrementApiKeyRequestCount(id: string): Promise<void>;

  // API Usage Log operations
  createApiUsageLog(data: InsertApiUsageLog): Promise<ApiUsageLog>;
  getApiUsageLogsByOrganization(organizationId: string, startDate?: Date, endDate?: Date): Promise<ApiUsageLog[]>;
  getApiUsageCountToday(organizationId: string): Promise<number>;

  // Support Ticket operations
  createSupportTicket(data: InsertSupportTicket): Promise<SupportTicket>;
  getSupportTicketsByOrganization(organizationId: string): Promise<SupportTicket[]>;
  getSupportTicket(id: string): Promise<SupportTicket | null>;
  updateSupportTicket(id: string, data: Partial<SupportTicket>): Promise<SupportTicket>;
  createTicketMessage(data: InsertTicketMessage): Promise<TicketMessage>;
  getTicketMessages(ticketId: string): Promise<TicketMessage[]>;

  // Custom Integration operations
  createCustomIntegration(data: InsertCustomIntegration): Promise<CustomIntegration>;
  getCustomIntegrationsByOrganization(organizationId: string): Promise<CustomIntegration[]>;
  getCustomIntegration(id: string): Promise<CustomIntegration | null>;
  updateCustomIntegration(id: string, data: Partial<CustomIntegration>): Promise<CustomIntegration>;
  deleteCustomIntegration(id: string): Promise<void>;

  // Letter Template operations
  getLetterTemplates(officeId?: string): Promise<LetterTemplate[]>;
  getLetterTemplate(id: string): Promise<LetterTemplate | undefined>;
  createLetterTemplate(template: InsertLetterTemplate): Promise<LetterTemplate>;
  updateLetterTemplate(id: string, template: Partial<InsertLetterTemplate>): Promise<LetterTemplate>;
  deleteLetterTemplate(id: string): Promise<void>;
  getLetterTemplatesByScope(scope: string, officeId?: string): Promise<LetterTemplate[]>;

  // Letter Template Version operations
  getLetterTemplateVersions(templateId: string): Promise<LetterTemplateVersion[]>;
  createLetterTemplateVersion(version: InsertLetterTemplateVersion): Promise<LetterTemplateVersion>;

  // Generated Letter operations
  createGeneratedLetter(letter: InsertGeneratedLetter): Promise<GeneratedLetter>;
  getGeneratedLettersByTarget(scope: string, targetId: string): Promise<GeneratedLetter[]>;

  // Coordinator Pay Record operations
  getCoordinatorPayRecords(officeId?: string, year?: number, quarter?: number): Promise<CoordinatorPayRecord[]>;
  getCoordinatorPayRecord(id: string): Promise<CoordinatorPayRecord | undefined>;
  getCoordinatorPayRecordsByCoordinator(coordinatorId: string): Promise<CoordinatorPayRecord[]>;
  createCoordinatorPayRecord(record: InsertCoordinatorPayRecord): Promise<CoordinatorPayRecord>;
  updateCoordinatorPayRecord(id: string, record: Partial<InsertCoordinatorPayRecord>): Promise<CoordinatorPayRecord>;
  deleteCoordinatorPayRecord(id: string): Promise<void>;

  // Email Template operations
  getEmailTemplates(): Promise<EmailTemplate[]>;
  getEmailTemplate(id: string): Promise<EmailTemplate | undefined>;
  getEmailTemplateByType(type: string): Promise<EmailTemplate | undefined>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: string, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate>;
  deleteEmailTemplate(id: string): Promise<void>;

  // Shift Swap Request operations
  getShiftSwapRequests(filters?: { status?: string; officeId?: string; caregiverId?: string }): Promise<ShiftSwapRequest[]>;
  getShiftSwapRequest(id: string): Promise<ShiftSwapRequest | undefined>;
  createShiftSwapRequest(request: InsertShiftSwapRequest): Promise<ShiftSwapRequest>;
  updateShiftSwapRequest(id: string, request: Partial<InsertShiftSwapRequest>): Promise<ShiftSwapRequest>;
  approveShiftSwapRequest(id: string, reviewedBy: string, notes?: string): Promise<ShiftSwapRequest>;
  rejectShiftSwapRequest(id: string, reviewedBy: string, notes?: string): Promise<ShiftSwapRequest>;
  cancelShiftSwapRequest(id: string): Promise<ShiftSwapRequest>;

  // E-Signature Template operations
  getESignatureTemplates(filters?: { officeId?: string; status?: string }): Promise<ESignatureTemplate[]>;
  getESignatureTemplate(id: string): Promise<ESignatureTemplate | undefined>;
  createESignatureTemplate(template: InsertESignatureTemplate): Promise<ESignatureTemplate>;
  updateESignatureTemplate(id: string, template: Partial<InsertESignatureTemplate>): Promise<ESignatureTemplate>;
  deleteESignatureTemplate(id: string): Promise<void>;

  // E-Signature Request operations
  getESignatureRequests(filters?: { status?: string; sentBy?: string }): Promise<ESignatureRequest[]>;
  getESignatureRequest(id: string): Promise<ESignatureRequest | undefined>;
  getESignatureRequestByToken(token: string): Promise<ESignatureRequest | undefined>;
  createESignatureRequest(request: InsertESignatureRequest): Promise<ESignatureRequest>;
  updateESignatureRequest(id: string, request: Partial<InsertESignatureRequest>): Promise<ESignatureRequest>;

  // Help Article operations
  getHelpArticles(filters?: { category?: string; published?: boolean }): Promise<HelpArticle[]>;
  getHelpArticle(id: string): Promise<HelpArticle | undefined>;
  getHelpArticleBySlug(slug: string): Promise<HelpArticle | undefined>;
  createHelpArticle(article: InsertHelpArticle): Promise<HelpArticle>;
  updateHelpArticle(id: string, article: Partial<InsertHelpArticle>): Promise<HelpArticle>;
  deleteHelpArticle(id: string): Promise<void>;
  incrementHelpArticleViewCount(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserByUsernameOrEmail(identifier: string): Promise<User | undefined> {
    const lowerIdentifier = identifier.toLowerCase();
    const [user] = await db
      .select()
      .from(users)
      .where(or(
        sql`LOWER(${users.username}) = ${lowerIdentifier}`,
        sql`LOWER(${users.email}) = ${lowerIdentifier}`
      ));
    return user;
  }

  async updateUserLastLogin(id: string): Promise<void> {
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, id));
  }

  async updateUserPassword(id: string, passwordHash: string, mustResetPassword: boolean = false): Promise<void> {
    await db.update(users).set({ 
      passwordHash, 
      mustResetPassword,
      updatedAt: new Date() 
    }).where(eq(users.id, id));
  }

  async setUserResetToken(id: string, token: string, expiry: Date): Promise<void> {
    await db.update(users).set({ 
      resetToken: token,
      resetTokenExpiry: expiry,
      updatedAt: new Date() 
    }).where(eq(users.id, id));
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.resetToken, token),
        gte(users.resetTokenExpiry, new Date())
      ));
    return user;
  }

  async clearUserResetToken(id: string): Promise<void> {
    await db.update(users).set({ 
      resetToken: null,
      resetTokenExpiry: null,
      updatedAt: new Date() 
    }).where(eq(users.id, id));
  }

  // SMS login operations
  async getUserByMobilePhone(phone: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.mobilePhone, phone),
        eq(users.mobileVerified, true),
        eq(users.isActive, true)
      ));
    return user;
  }

  async setUserSmsCode(id: string, code: string, expiry: Date): Promise<void> {
    await db.update(users).set({ 
      smsVerificationCode: code,
      smsCodeExpiry: expiry,
      updatedAt: new Date() 
    }).where(eq(users.id, id));
  }

  async clearUserSmsCode(id: string): Promise<void> {
    await db.update(users).set({ 
      smsVerificationCode: null,
      smsCodeExpiry: null,
      updatedAt: new Date() 
    }).where(eq(users.id, id));
  }

  async updateUserMobilePhone(id: string, phone: string, verified: boolean): Promise<void> {
    await db.update(users).set({ 
      mobilePhone: phone,
      mobileVerified: verified,
      smsVerificationCode: null,
      smsCodeExpiry: null,
      updatedAt: new Date() 
    }).where(eq(users.id, id));
  }

  // Google OAuth operations
  async getUserByEmail(email: string): Promise<User | undefined> {
    // Case-insensitive email lookup to handle legacy mixed-case emails
    const [user] = await db.select().from(users).where(
      sql`LOWER(${users.email}) = ${email.toLowerCase()}`
    );
    return user;
  }

  async linkGoogleAccount(userId: string, googleId: string): Promise<void> {
    await db.update(users).set({
      googleId: googleId,
      googleLinkedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(users.id, userId));
  }

  async createGoogleUser(userData: { email: string; firstName: string; lastName: string; profileImageUrl?: string; googleId: string }): Promise<User> {
    const [user] = await db.insert(users).values({
      email: userData.email.toLowerCase(),
      firstName: userData.firstName,
      lastName: userData.lastName,
      profileImageUrl: userData.profileImageUrl,
      googleId: userData.googleId,
      googleLinkedAt: new Date(),
      role: "caregiver", // Default role for new Google sign-ups
      isActive: true,
    }).returning();
    return user;
  }

  // Office operations
  async getAllOffices(): Promise<Office[]> {
    return await db.select().from(offices).orderBy(desc(offices.createdAt));
  }

  async getOffice(id: string): Promise<Office | undefined> {
    const [office] = await db.select().from(offices).where(eq(offices.id, id));
    return office;
  }

  async createOffice(office: InsertOffice): Promise<Office> {
    const [newOffice] = await db.insert(offices).values(office).returning();
    return newOffice;
  }

  async updateOffice(id: string, office: Partial<InsertOffice>): Promise<Office> {
    const [updatedOffice] = await db
      .update(offices)
      .set({ ...office, updatedAt: new Date() })
      .where(eq(offices.id, id))
      .returning();
    return updatedOffice;
  }

  async deleteOffice(id: string): Promise<void> {
    await db.delete(offices).where(eq(offices.id, id));
  }

  // Office Dashboard Links
  async getOfficeDashboardLinks(officeId: string): Promise<OfficeDashboardLink[]> {
    return await db.select().from(officeDashboardLinks)
      .where(and(eq(officeDashboardLinks.officeId, officeId), eq(officeDashboardLinks.isActive, true)))
      .orderBy(asc(officeDashboardLinks.sortOrder));
  }

  async getOfficeDashboardLink(id: string): Promise<OfficeDashboardLink | undefined> {
    const [link] = await db.select().from(officeDashboardLinks).where(eq(officeDashboardLinks.id, id));
    return link;
  }

  async createOfficeDashboardLink(link: InsertOfficeDashboardLink): Promise<OfficeDashboardLink> {
    const [created] = await db.insert(officeDashboardLinks).values(link).returning();
    return created;
  }

  async updateOfficeDashboardLink(id: string, link: Partial<InsertOfficeDashboardLink>): Promise<OfficeDashboardLink> {
    const [updated] = await db.update(officeDashboardLinks)
      .set({ ...link, updatedAt: new Date() })
      .where(eq(officeDashboardLinks.id, id))
      .returning();
    return updated;
  }

  async deleteOfficeDashboardLink(id: string): Promise<void> {
    await db.delete(officeDashboardLinks).where(eq(officeDashboardLinks.id, id));
  }

  // Coordinator operations
  async getAllCoordinators(officeId?: string): Promise<Coordinator[]> {
    if (officeId) {
      return await db.select().from(coordinators).where(eq(coordinators.officeId, officeId)).orderBy(asc(coordinators.lastName));
    }
    return await db.select().from(coordinators).orderBy(asc(coordinators.lastName));
  }

  async getCoordinator(id: string): Promise<Coordinator | undefined> {
    const [coordinator] = await db.select().from(coordinators).where(eq(coordinators.id, id));
    return coordinator;
  }

  async createCoordinator(coordinator: InsertCoordinator): Promise<Coordinator> {
    const [created] = await db.insert(coordinators).values(coordinator).returning();
    return created;
  }

  async updateCoordinator(id: string, coordinator: Partial<InsertCoordinator>): Promise<Coordinator> {
    const [updated] = await db.update(coordinators).set({ ...coordinator, updatedAt: new Date() }).where(eq(coordinators.id, id)).returning();
    return updated;
  }

  async deleteCoordinator(id: string): Promise<void> {
    await db.delete(coordinators).where(eq(coordinators.id, id));
  }

  // Client operations
  async getAllClients(officeId?: string): Promise<Client[]> {
    if (officeId) {
      return await db.select().from(clients).where(eq(clients.officeId, officeId)).orderBy(desc(clients.createdAt));
    }
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  async updateClient(id: string, client: Partial<InsertClient>): Promise<Client> {
    const [updatedClient] = await db
      .update(clients)
      .set({ ...client, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return updatedClient;
  }

  async updateClientsBulk(clientIds: string[], updates: Partial<InsertClient>): Promise<Client[]> {
    const updatedClients = await db
      .update(clients)
      .set({ ...updates, updatedAt: new Date() })
      .where(inArray(clients.id, clientIds))
      .returning();
    return updatedClients;
  }

  async deleteClient(id: string): Promise<void> {
    // Delete all related records first to handle foreign key constraints
    // Order matters - delete child tables before parent
    
    // Delete caregiver assignments
    await db.delete(clientCaregiverAssignments).where(eq(clientCaregiverAssignments.clientId, id));
    
    // Delete caregiver schedules related to this client
    await db.delete(caregiverSchedules).where(eq(caregiverSchedules.clientId, id));
    
    // Delete caregiver time entries related to this client
    await db.delete(caregiverTimeEntries).where(eq(caregiverTimeEntries.clientId, id));
    
    // Delete master week slots first (they reference master week templates)
    const templates = await db.select().from(masterWeekTemplates).where(eq(masterWeekTemplates.clientId, id));
    for (const template of templates) {
      await db.delete(masterWeekSlots).where(eq(masterWeekSlots.templateId, template.id));
    }
    await db.delete(masterWeekTemplates).where(eq(masterWeekTemplates.clientId, id));
    
    // Delete schedule change logs first (they reference schedules)
    const schedules = await db.select().from(clientSchedules).where(eq(clientSchedules.clientId, id));
    for (const schedule of schedules) {
      await db.delete(scheduleChangeLog).where(eq(scheduleChangeLog.scheduleId, schedule.id));
    }
    await db.delete(clientSchedules).where(eq(clientSchedules.clientId, id));
    
    // Delete client communications
    await db.delete(clientCommunications).where(eq(clientCommunications.clientId, id));
    
    // Delete client MCOs
    await db.delete(clientMcos).where(eq(clientMcos.clientId, id));
    
    // Delete eligibility schedule and checks
    await db.delete(eligibilitySchedule).where(eq(eligibilitySchedule.clientId, id));
    await db.delete(eligibilityChecks).where(eq(eligibilityChecks.clientId, id));
    
    // Delete medication logs first (they reference medications)
    await db.delete(medicationLogs).where(eq(medicationLogs.clientId, id));
    
    // Delete medications
    await db.delete(medications).where(eq(medications.clientId, id));
    
    // Delete vital signs
    await db.delete(vitalSigns).where(eq(vitalSigns.clientId, id));
    
    // Delete documents related to client
    await db.delete(documents).where(eq(documents.clientId, id));
    
    // Delete mileage logs
    await db.delete(mileageLogs).where(eq(mileageLogs.clientId, id));
    
    // Delete generated letters for this client (using targetId with scope=client)
    await db.delete(generatedLetters).where(
      and(eq(generatedLetters.targetId, id), eq(generatedLetters.scope, "client"))
    );
    
    // Delete incident follow-ups first (they reference incident reports)
    const incidents = await db.select().from(incidentReports).where(eq(incidentReports.clientId, id));
    for (const incident of incidents) {
      await db.delete(incidentFollowUps).where(eq(incidentFollowUps.incidentId, incident.id));
    }
    await db.delete(incidentReports).where(eq(incidentReports.clientId, id));
    
    // Delete care plans and related data
    const carePlansToDelete = await db.select().from(carePlans).where(eq(carePlans.clientId, id));
    for (const carePlan of carePlansToDelete) {
      await db.delete(carePlanInterventions).where(eq(carePlanInterventions.carePlanId, carePlan.id));
      await db.delete(carePlanGoals).where(eq(carePlanGoals.carePlanId, carePlan.id));
    }
    await db.delete(carePlans).where(eq(carePlans.clientId, id));
    
    // Delete progress notes
    await db.delete(progressNotes).where(eq(progressNotes.clientId, id));
    
    // Delete claims
    await db.delete(claims).where(eq(claims.clientId, id));
    
    // Delete survey responses
    await db.delete(surveyResponses).where(eq(surveyResponses.clientId, id));
    
    // Delete client referrals
    await db.delete(clientReferrals).where(eq(clientReferrals.clientId, id));
    
    // Delete client family member associations
    await db.delete(clientFamilyMembers).where(eq(clientFamilyMembers.clientId, id));
    
    // Finally delete the client
    await db.delete(clients).where(eq(clients.id, id));
  }

  async searchClients(searchTerm: string, officeId?: string): Promise<Client[]> {
    const searchCondition = or(
      like(clients.firstName, `%${searchTerm}%`),
      like(clients.lastName, `%${searchTerm}%`),
      like(clients.phone, `%${searchTerm}%`)
    );
    
    if (officeId) {
      return await db
        .select()
        .from(clients)
        .where(and(searchCondition, eq(clients.officeId, officeId)));
    }
    
    return await db
      .select()
      .from(clients)
      .where(searchCondition);
  }

  // Caregiver operations
  async getAllCaregivers(officeId?: string): Promise<Caregiver[]> {
    if (officeId) {
      return await db.select().from(caregivers).where(eq(caregivers.officeId, officeId)).orderBy(desc(caregivers.createdAt));
    }
    return await db.select().from(caregivers).orderBy(desc(caregivers.createdAt));
  }

  async getCaregiver(id: string): Promise<Caregiver | undefined> {
    const [caregiver] = await db.select().from(caregivers).where(eq(caregivers.id, id));
    return caregiver;
  }

  async getCaregiverByUserId(userId: string): Promise<Caregiver | undefined> {
    const [caregiver] = await db.select().from(caregivers).where(eq(caregivers.userId, userId));
    return caregiver;
  }

  async getCaregiverByEmail(email: string): Promise<Caregiver | undefined> {
    const [caregiver] = await db.select().from(caregivers).where(eq(caregivers.email, email));
    return caregiver;
  }

  async createCaregiver(caregiver: InsertCaregiver): Promise<Caregiver> {
    const [newCaregiver] = await db.insert(caregivers).values(caregiver).returning();
    return newCaregiver;
  }

  async updateCaregiver(id: string, caregiver: Partial<InsertCaregiver>): Promise<Caregiver> {
    const [updatedCaregiver] = await db
      .update(caregivers)
      .set({ ...caregiver, updatedAt: new Date() })
      .where(eq(caregivers.id, id))
      .returning();
    return updatedCaregiver;
  }

  async updateCaregiversBulk(caregiverIds: string[], updates: Partial<InsertCaregiver>): Promise<Caregiver[]> {
    const updatedCaregivers = await db
      .update(caregivers)
      .set({ ...updates, updatedAt: new Date() })
      .where(inArray(caregivers.id, caregiverIds))
      .returning();
    return updatedCaregivers;
  }

  async deleteCaregiver(id: string): Promise<void> {
    await db.delete(caregivers).where(eq(caregivers.id, id));
  }

  async deleteCaregiversBulk(caregiverIds: string[]): Promise<void> {
    await db.delete(caregivers).where(inArray(caregivers.id, caregiverIds));
  }

  // Client-Caregiver assignment operations
  async assignClientsToCaregiver(caregiverId: string, clientIds: string[]): Promise<void> {
    if (clientIds.length === 0) return;
    
    const assignments = clientIds.map(clientId => ({
      caregiverId,
      clientId,
      assignedDate: new Date(),
    }));
    
    await db.insert(clientCaregiverAssignments).values(assignments).onConflictDoNothing();
    
    // Automatically assign MCO from the first client with an active MCO
    for (const clientId of clientIds) {
      const clientMcoRecords = await this.getClientMcosByClient(clientId);
      // Find active MCO - check for active status and no discharge date
      // Status can be 'active', null, or missing - we want non-discharged MCOs
      const activeMco = clientMcoRecords.find(m => 
        !m.dischargeDate && (m.status === 'active' || m.status === null || m.status === undefined)
      );
      if (activeMco) {
        // Update caregiver's MCO to match the client's active MCO
        await db.update(caregivers)
          .set({ mcoId: activeMco.mcoId, updatedAt: new Date() })
          .where(eq(caregivers.id, caregiverId));
        break; // Only set from the first client with an active MCO
      }
    }
  }

  async unassignClientsFromCaregiver(caregiverId: string, clientIds: string[]): Promise<void> {
    if (clientIds.length === 0) return;
    
    await db
      .delete(clientCaregiverAssignments)
      .where(
        and(
          eq(clientCaregiverAssignments.caregiverId, caregiverId),
          or(...clientIds.map(clientId => eq(clientCaregiverAssignments.clientId, clientId)))
        )
      );
  }

  async getAssignedClientsByCaregiver(caregiverId: string): Promise<Client[]> {
    const result = await db
      .select({
        client: clients,
      })
      .from(clientCaregiverAssignments)
      .innerJoin(clients, eq(clientCaregiverAssignments.clientId, clients.id))
      .where(eq(clientCaregiverAssignments.caregiverId, caregiverId));
    
    return result.map(row => row.client);
  }

  async getAssignedCaregiversByClient(clientId: string): Promise<Caregiver[]> {
    const result = await db
      .select({
        caregiver: caregivers,
      })
      .from(clientCaregiverAssignments)
      .innerJoin(caregivers, eq(clientCaregiverAssignments.caregiverId, caregivers.id))
      .where(eq(clientCaregiverAssignments.clientId, clientId));
    
    return result.map(row => row.caregiver);
  }

  // Care plan operations
  async getCarePlansByClient(clientId: string): Promise<CarePlan[]> {
    return await db
      .select()
      .from(carePlans)
      .where(eq(carePlans.clientId, clientId))
      .orderBy(desc(carePlans.createdAt));
  }

  async createCarePlan(carePlan: InsertCarePlan): Promise<CarePlan> {
    const [newCarePlan] = await db.insert(carePlans).values(carePlan).returning();
    return newCarePlan;
  }

  async updateCarePlan(id: string, carePlan: Partial<InsertCarePlan>): Promise<CarePlan> {
    const [updatedCarePlan] = await db
      .update(carePlans)
      .set({ ...carePlan, updatedAt: new Date() })
      .where(eq(carePlans.id, id))
      .returning();
    return updatedCarePlan;
  }

  // Care plan goals operations
  async getCarePlanGoals(carePlanId: string): Promise<CarePlanGoal[]> {
    return await db
      .select()
      .from(carePlanGoals)
      .where(eq(carePlanGoals.carePlanId, carePlanId))
      .orderBy(desc(carePlanGoals.createdAt));
  }

  async createCarePlanGoal(goal: InsertCarePlanGoal): Promise<CarePlanGoal> {
    const [newGoal] = await db.insert(carePlanGoals).values(goal).returning();
    return newGoal;
  }

  async updateCarePlanGoal(id: string, goal: Partial<InsertCarePlanGoal>): Promise<CarePlanGoal> {
    const [updatedGoal] = await db
      .update(carePlanGoals)
      .set({ ...goal, updatedAt: new Date() })
      .where(eq(carePlanGoals.id, id))
      .returning();
    return updatedGoal;
  }

  // Care plan interventions operations
  async getCarePlanInterventions(carePlanId: string): Promise<CarePlanIntervention[]> {
    return await db
      .select()
      .from(carePlanInterventions)
      .where(eq(carePlanInterventions.carePlanId, carePlanId))
      .orderBy(desc(carePlanInterventions.createdAt));
  }

  async createCarePlanIntervention(intervention: InsertCarePlanIntervention): Promise<CarePlanIntervention> {
    const [newIntervention] = await db.insert(carePlanInterventions).values(intervention).returning();
    return newIntervention;
  }

  async updateCarePlanIntervention(id: string, intervention: Partial<InsertCarePlanIntervention>): Promise<CarePlanIntervention> {
    const [updatedIntervention] = await db
      .update(carePlanInterventions)
      .set(intervention)
      .where(eq(carePlanInterventions.id, id))
      .returning();
    return updatedIntervention;
  }

  // Progress notes operations
  async getProgressNotesByClient(clientId: string): Promise<ProgressNote[]> {
    const results = await db
      .select()
      .from(progressNotes)
      .where(eq(progressNotes.clientId, clientId))
      .orderBy(desc(progressNotes.visitDate));
    return results.map(r => ({
      ...r,
      notes: decryptNote(r.notes) || r.notes,
    }));
  }

  async createProgressNote(note: InsertProgressNote): Promise<ProgressNote> {
    const encryptedData = {
      ...note,
      notes: encryptNote(note.notes) || note.notes,
    };
    const [newNote] = await db.insert(progressNotes).values(encryptedData).returning();
    return {
      ...newNote,
      notes: decryptNote(newNote.notes) || newNote.notes,
    };
  }

  // Document operations
  async getAllDocuments(officeId?: string): Promise<Document[]> {
    const conditions = [];
    if (officeId) {
      conditions.push(eq(documents.officeId, officeId));
    }
    return await db
      .select()
      .from(documents)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(documents.createdAt));
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document;
  }

  async getDocumentsByClient(clientId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.clientId, clientId))
      .orderBy(desc(documents.createdAt));
  }

  async getDocumentsByCaregiver(caregiverId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.caregiverId, caregiverId))
      .orderBy(desc(documents.createdAt));
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [newDocument] = await db.insert(documents).values(document).returning();
    return newDocument;
  }

  async updateDocument(id: string, document: Partial<InsertDocument>): Promise<Document> {
    const [updatedDocument] = await db
      .update(documents)
      .set(document)
      .where(eq(documents.id, id))
      .returning();
    return updatedDocument;
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }


  // Task operations
  async getAllTasks(officeId?: string): Promise<Task[]> {
    const conditions = [];
    if (officeId) {
      conditions.push(eq(tasks.officeId, officeId));
    }
    return await db
      .select()
      .from(tasks)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(tasks.dueDate));
  }

  async getTasksByUser(userId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.assignedTo, userId))
      .orderBy(desc(tasks.dueDate));
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: string, task: Partial<InsertTask>): Promise<Task> {
    const [updatedTask] = await db
      .update(tasks)
      .set({ ...task, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask;
  }

  async deleteTask(id: string): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // Message operations
  async getMessagesByUser(userId: string, officeId?: string): Promise<Message[]> {
    let results: Message[];
    if (officeId) {
      results = await db
        .select({
          id: messages.id,
          senderId: messages.senderId,
          recipientId: messages.recipientId,
          subject: messages.subject,
          content: messages.content,
          isRead: messages.isRead,
          senderStatus: messages.senderStatus,
          recipientStatus: messages.recipientStatus,
          messageType: messages.messageType,
          priority: messages.priority,
          communicationType: messages.communicationType,
          recipientEmail: messages.recipientEmail,
          recipientPhone: messages.recipientPhone,
          deliveryStatus: messages.deliveryStatus,
          deliveryAttempts: messages.deliveryAttempts,
          lastDeliveryAttempt: messages.lastDeliveryAttempt,
          externalId: messages.externalId,
          relatedClientId: messages.relatedClientId,
          attachmentUrl: messages.attachmentUrl,
          parentMessageId: messages.parentMessageId,
          createdAt: messages.createdAt,
          updatedAt: messages.updatedAt,
        })
        .from(messages)
        .leftJoin(clients, eq(messages.relatedClientId, clients.id))
        .where(
          and(
            or(
              eq(messages.senderId, userId),
              eq(messages.recipientId, userId)
            ),
            eq(clients.officeId, officeId)
          )
        )
        .orderBy(desc(messages.createdAt));
    } else {
      results = await db
        .select()
        .from(messages)
        .where(
          or(
            eq(messages.senderId, userId),
            eq(messages.recipientId, userId)
          )
        )
        .orderBy(desc(messages.createdAt));
    }
    return results.map(r => ({
      ...r,
      content: decryptNote(r.content) || r.content,
    }));
  }

  // Channel messages operations (unified communication)
  async getAllChannelMessages(): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.messageType, "channel"))
      .orderBy(asc(messages.createdAt));
  }

  async createChannelMessage(senderId: string, content: string, priority: string = "normal"): Promise<Message> {
    const messageData = {
      senderId,
      recipientId: null, // No specific recipient for channel messages
      content,
      messageType: "channel",
      priority,
      subject: null,
      isRead: true, // Channel messages are considered read by sender
      senderStatus: "read" as const,
      recipientStatus: "read" as const,
    };
    
    const [newMessage] = await db.insert(messages).values(messageData).returning();
    return newMessage;
  }

  async getSentMessagesByUser(userId: string, status?: string): Promise<Message[]> {
    const conditions = [eq(messages.senderId, userId)];
    if (status) {
      conditions.push(eq(messages.senderStatus, status as any));
    }

    const results = await db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt));
    return results.map(r => ({
      ...r,
      content: decryptNote(r.content) || r.content,
    }));
  }

  async getReceivedMessagesByUser(userId: string, status?: string): Promise<Message[]> {
    const conditions = [eq(messages.recipientId, userId)];
    if (status) {
      conditions.push(eq(messages.recipientStatus, status as any));
    }

    const results = await db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt));
    return results.map(r => ({
      ...r,
      content: decryptNote(r.content) || r.content,
    }));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const encryptedData = {
      ...message,
      content: encryptNote(message.content) || message.content,
    };
    const [newMessage] = await db.insert(messages).values(encryptedData).returning();
    return {
      ...newMessage,
      content: decryptNote(newMessage.content) || newMessage.content,
    };
  }

  async markMessageAsRead(id: string): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, id));
  }

  async updateMessageStatus(messageId: string, userId: string, status: 'unread' | 'read' | 'archived'): Promise<void> {
    // Get the message to determine if user is sender or recipient
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, messageId))
      .limit(1);

    if (!message) {
      throw new Error('Message not found');
    }

    const updateData: any = { updatedAt: new Date() };
    
    if (message.senderId === userId) {
      updateData.senderStatus = status;
    } else if (message.recipientId === userId) {
      updateData.recipientStatus = status;
      if (status === 'read') {
        updateData.isRead = true;
      } else if (status === 'unread') {
        updateData.isRead = false;
      }
    } else {
      throw new Error('User not authorized to update this message');
    }

    await db
      .update(messages)
      .set(updateData)
      .where(eq(messages.id, messageId));
  }

  // Certification operations
  async getCertificationsByCaregiver(caregiverId: string): Promise<Certification[]> {
    return await db
      .select()
      .from(certifications)
      .where(eq(certifications.caregiverId, caregiverId))
      .orderBy(desc(certifications.expirationDate));
  }

  async createCertification(certification: InsertCertification): Promise<Certification> {
    const [newCertification] = await db.insert(certifications).values(certification).returning();
    return newCertification;
  }

  async updateCertification(id: string, certification: Partial<InsertCertification>): Promise<Certification> {
    const [updatedCertification] = await db
      .update(certifications)
      .set(certification)
      .where(eq(certifications.id, id))
      .returning();
    return updatedCertification;
  }

  // Compliance operations
  async getAllComplianceItems(officeId?: string): Promise<ComplianceItem[]> {
    if (officeId) {
      return await db
        .select()
        .from(complianceItems)
        .where(eq(complianceItems.officeId, officeId))
        .orderBy(desc(complianceItems.dueDate));
    }
    return await db
      .select()
      .from(complianceItems)
      .orderBy(desc(complianceItems.dueDate));
  }

  async getComplianceItemsByCaregiver(caregiverId: string): Promise<ComplianceItem[]> {
    return await db
      .select()
      .from(complianceItems)
      .where(eq(complianceItems.caregiverId, caregiverId))
      .orderBy(desc(complianceItems.dueDate));
  }

  async createComplianceItem(item: InsertComplianceItem): Promise<ComplianceItem> {
    const [newItem] = await db.insert(complianceItems).values(item).returning();
    return newItem;
  }

  async updateComplianceItem(id: string, item: Partial<InsertComplianceItem>): Promise<ComplianceItem> {
    const [updatedItem] = await db
      .update(complianceItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(complianceItems.id, id))
      .returning();
    return updatedItem;
  }

  // Dashboard metrics
  async getDashboardMetrics(officeId?: string): Promise<{
    activeClients: number;
    activeCaregivers: number;
    pendingTasks: number;
    complianceRate: number;
    criticalAlerts: number;
  }> {
    const clientCondition = officeId 
      ? and(eq(clients.status, "active"), eq(clients.officeId, officeId))
      : eq(clients.status, "active");
    
    const [clientCount] = await db
      .select({ count: count() })
      .from(clients)
      .where(clientCondition);

    const caregiverCondition = officeId
      ? and(eq(caregivers.isActive, true), eq(caregivers.officeId, officeId))
      : eq(caregivers.isActive, true);

    const [caregiverCount] = await db
      .select({ count: count() })
      .from(caregivers)
      .where(caregiverCondition);

    // Filter tasks by office via client relationship
    let taskCount: { count: number };
    let criticalTasks: { count: number };
    if (officeId) {
      [taskCount] = await db
        .select({ count: count() })
        .from(tasks)
        .innerJoin(clients, eq(tasks.clientId, clients.id))
        .where(and(eq(tasks.status, "pending"), eq(clients.officeId, officeId)));
      
      [criticalTasks] = await db
        .select({ count: count() })
        .from(tasks)
        .innerJoin(clients, eq(tasks.clientId, clients.id))
        .where(
          and(
            eq(clients.officeId, officeId),
            eq(tasks.priority, "critical"),
            or(eq(tasks.status, "pending"), eq(tasks.status, "overdue"))
          )
        );
    } else {
      [taskCount] = await db
        .select({ count: count() })
        .from(tasks)
        .where(eq(tasks.status, "pending"));

      [criticalTasks] = await db
        .select({ count: count() })
        .from(tasks)
        .where(
          and(
            eq(tasks.priority, "critical"),
            or(eq(tasks.status, "pending"), eq(tasks.status, "overdue"))
          )
        );
    }

    // Filter compliance items by office via caregiver relationship
    let totalCompliance: { count: number };
    let compliantItems: { count: number };
    if (officeId) {
      [totalCompliance] = await db
        .select({ count: count() })
        .from(complianceItems)
        .innerJoin(caregivers, eq(complianceItems.caregiverId, caregivers.id))
        .where(eq(caregivers.officeId, officeId));

      [compliantItems] = await db
        .select({ count: count() })
        .from(complianceItems)
        .innerJoin(caregivers, eq(complianceItems.caregiverId, caregivers.id))
        .where(and(eq(complianceItems.status, "compliant"), eq(caregivers.officeId, officeId)));
    } else {
      [totalCompliance] = await db
        .select({ count: count() })
        .from(complianceItems);

      [compliantItems] = await db
        .select({ count: count() })
        .from(complianceItems)
        .where(eq(complianceItems.status, "compliant"));
    }

    const complianceRate = totalCompliance.count > 0 
      ? Math.round((compliantItems.count / totalCompliance.count) * 100)
      : 100;

    return {
      activeClients: clientCount.count,
      activeCaregivers: caregiverCount.count,
      pendingTasks: taskCount.count,
      complianceRate,
      criticalAlerts: criticalTasks.count,
    };
  }

  // Audit logging
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }


  // Training operations
  async getAllTrainings(officeId?: string): Promise<Training[]> {
    const conditions = [];
    if (officeId) {
      conditions.push(eq(trainings.officeId, officeId));
    }
    return await db
      .select()
      .from(trainings)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(trainings.createdAt));
  }

  async createTraining(training: InsertTraining): Promise<Training> {
    const [newTraining] = await db.insert(trainings).values(training).returning();
    return newTraining;
  }

  async updateTraining(id: string, training: Partial<InsertTraining>): Promise<Training> {
    const [updated] = await db
      .update(trainings)
      .set({ ...training, updatedAt: new Date() })
      .where(eq(trainings.id, id))
      .returning();
    return updated;
  }

  // Training record operations
  async getAllTrainingRecords(): Promise<TrainingRecord[]> {
    return await db.select().from(trainingRecords).orderBy(desc(trainingRecords.createdAt));
  }

  async createTrainingRecord(record: InsertTrainingRecord): Promise<TrainingRecord> {
    const [newRecord] = await db.insert(trainingRecords).values(record).returning();
    return newRecord;
  }

  async getAllCertifications(): Promise<Certification[]> {
    return await db.select().from(certifications).orderBy(desc(certifications.createdAt));
  }

  // Additional user operations for communication
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateMessage(id: string, data: Partial<InsertMessage>): Promise<Message> {
    const encryptedData = data.content !== undefined
      ? { ...data, content: encryptNote(data.content) || data.content }
      : data;
    const [updated] = await db
      .update(messages)
      .set(encryptedData)
      .where(eq(messages.id, id))
      .returning();
    return {
      ...updated,
      content: decryptNote(updated.content) || updated.content,
    };
  }

  async updateMessageDelivery(messageId: string, delivery: {
    deliveryStatus: string;
    externalId?: string;
    deliveryAttempts: number;
    lastDeliveryAttempt: Date;
  }): Promise<void> {
    await db
      .update(messages)
      .set({
        deliveryStatus: delivery.deliveryStatus as any,
        externalId: delivery.externalId,
        deliveryAttempts: delivery.deliveryAttempts,
        lastDeliveryAttempt: delivery.lastDeliveryAttempt,
        updatedAt: new Date()
      })
      .where(eq(messages.id, messageId));
  }

  // User management operations
  async createUser(userData: Partial<UpsertUser>): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User> {
    const [updated] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Incident report operations
  async getAllIncidentReports(officeId?: string): Promise<IncidentReport[]> {
    const conditions = [];
    if (officeId) {
      conditions.push(eq(incidentReports.officeId, officeId));
    }
    return await db
      .select()
      .from(incidentReports)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(incidentReports.createdAt));
  }

  async getIncidentReport(id: string): Promise<IncidentReport | undefined> {
    const [incident] = await db.select().from(incidentReports).where(eq(incidentReports.id, id));
    return incident;
  }

  async createIncidentReport(report: InsertIncidentReport): Promise<IncidentReport> {
    const [newReport] = await db.insert(incidentReports).values(report).returning();
    return newReport;
  }

  async updateIncidentReport(id: string, reportData: Partial<InsertIncidentReport>): Promise<IncidentReport> {
    const [updated] = await db
      .update(incidentReports)
      .set(reportData)
      .where(eq(incidentReports.id, id))
      .returning();
    return updated;
  }

  // Incident follow-up operations
  async createIncidentFollowUp(followUp: InsertIncidentFollowUp): Promise<IncidentFollowUp> {
    const [newFollowUp] = await db.insert(incidentFollowUps).values(followUp).returning();
    return newFollowUp;
  }

  async getIncidentFollowUps(incidentId: string): Promise<IncidentFollowUp[]> {
    return await db
      .select()
      .from(incidentFollowUps)
      .where(eq(incidentFollowUps.incidentId, incidentId))
      .orderBy(desc(incidentFollowUps.createdAt));
  }

  async getIncidentFollowUp(id: string): Promise<IncidentFollowUp | undefined> {
    const [followUp] = await db.select().from(incidentFollowUps).where(eq(incidentFollowUps.id, id));
    return followUp;
  }

  async updateIncidentFollowUp(id: string, followUpData: Partial<InsertIncidentFollowUp>): Promise<IncidentFollowUp> {
    const [updated] = await db
      .update(incidentFollowUps)
      .set({ ...followUpData, updatedAt: new Date() })
      .where(eq(incidentFollowUps.id, id))
      .returning();
    return updated;
  }

  async getOverdueFollowUps(): Promise<IncidentFollowUp[]> {
    const now = new Date();
    return await db
      .select()
      .from(incidentFollowUps)
      .where(
        and(
          lte(incidentFollowUps.dueDate, now),
          or(
            eq(incidentFollowUps.status, 'pending'),
            eq(incidentFollowUps.status, 'in_progress')
          )
        )
      )
      .orderBy(asc(incidentFollowUps.dueDate));
  }

  async getFollowUpsByAssignee(userId: string): Promise<IncidentFollowUp[]> {
    return await db
      .select()
      .from(incidentFollowUps)
      .where(eq(incidentFollowUps.assignedToId, userId))
      .orderBy(asc(incidentFollowUps.dueDate));
  }

  async completeFollowUp(id: string, completedBy: string): Promise<IncidentFollowUp> {
    const [updated] = await db
      .update(incidentFollowUps)
      .set({
        status: 'completed',
        completedAt: new Date(),
        completedBy: completedBy,
        updatedAt: new Date(),
      })
      .where(eq(incidentFollowUps.id, id))
      .returning();
    return updated;
  }

  // Family member operations
  async getFamilyMember(id: string): Promise<FamilyMember | undefined> {
    const [familyMember] = await db.select().from(familyMembers).where(eq(familyMembers.id, id));
    return familyMember;
  }

  async getFamilyMemberByUserId(userId: string): Promise<FamilyMember | undefined> {
    const [familyMember] = await db.select().from(familyMembers).where(eq(familyMembers.userId, userId));
    return familyMember;
  }

  async createFamilyMember(familyMemberData: InsertFamilyMember): Promise<FamilyMember> {
    const [familyMember] = await db.insert(familyMembers).values(familyMemberData).returning();
    return familyMember;
  }

  async updateFamilyMember(id: string, familyMemberData: Partial<InsertFamilyMember>): Promise<FamilyMember> {
    const [updated] = await db
      .update(familyMembers)
      .set({ ...familyMemberData, updatedAt: new Date() })
      .where(eq(familyMembers.id, id))
      .returning();
    return updated;
  }

  // Client-Family relationship operations
  async getClientFamilyMembers(clientId: string): Promise<(ClientFamilyMember & { familyMember: FamilyMember & { user: User } })[]> {
    return await db
      .select()
      .from(clientFamilyMembers)
      .innerJoin(familyMembers, eq(clientFamilyMembers.familyMemberId, familyMembers.id))
      .innerJoin(users, eq(familyMembers.userId, users.id))
      .where(eq(clientFamilyMembers.clientId, clientId)) as any;
  }

  async getFamilyMemberClients(familyMemberId: string): Promise<(ClientFamilyMember & { client: Client })[]> {
    return await db
      .select()
      .from(clientFamilyMembers)
      .innerJoin(clients, eq(clientFamilyMembers.clientId, clients.id))
      .where(eq(clientFamilyMembers.familyMemberId, familyMemberId)) as any;
  }

  async addFamilyMemberToClient(relationship: InsertClientFamilyMember): Promise<ClientFamilyMember> {
    const [clientFamilyMember] = await db.insert(clientFamilyMembers).values(relationship).returning();
    return clientFamilyMember;
  }

  async updateClientFamilyAccess(clientId: string, familyMemberId: string, access: Partial<InsertClientFamilyMember>): Promise<ClientFamilyMember> {
    const [updated] = await db
      .update(clientFamilyMembers)
      .set({ ...access, updatedAt: new Date() })
      .where(and(
        eq(clientFamilyMembers.clientId, clientId),
        eq(clientFamilyMembers.familyMemberId, familyMemberId)
      ))
      .returning();
    return updated;
  }

  async removeFamilyMemberFromClient(clientId: string, familyMemberId: string): Promise<void> {
    await db.delete(clientFamilyMembers).where(and(
      eq(clientFamilyMembers.clientId, clientId),
      eq(clientFamilyMembers.familyMemberId, familyMemberId)
    ));
  }

  // Family portal update operations
  async getFamilyUpdates(clientId?: string, familyMemberId?: string): Promise<FamilyUpdate[]> {
    let query = db.select().from(familyUpdates);
    
    if (clientId && familyMemberId) {
      // Get family member's user ID first
      const familyMember = await this.getFamilyMember(familyMemberId);
      if (familyMember?.userId) {
        return await query.where(and(
          eq(familyUpdates.clientId, clientId),
          eq(familyUpdates.submittedBy, familyMember.userId)
        )).orderBy(desc(familyUpdates.createdAt));
      }
    } else if (clientId) {
      return await query.where(eq(familyUpdates.clientId, clientId)).orderBy(desc(familyUpdates.createdAt));
    } else if (familyMemberId) {
      const familyMember = await this.getFamilyMember(familyMemberId);
      if (familyMember?.userId) {
        return await query.where(eq(familyUpdates.submittedBy, familyMember.userId)).orderBy(desc(familyUpdates.createdAt));
      }
    }
    
    return await query.orderBy(desc(familyUpdates.createdAt));
  }

  async createFamilyUpdate(updateData: InsertFamilyUpdate): Promise<FamilyUpdate> {
    const [familyUpdate] = await db.insert(familyUpdates).values(updateData).returning();
    return familyUpdate;
  }

  async updateFamilyUpdate(id: string, updateData: Partial<InsertFamilyUpdate>): Promise<FamilyUpdate> {
    const [updated] = await db
      .update(familyUpdates)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(familyUpdates.id, id))
      .returning();
    return updated;
  }

  async reviewFamilyUpdate(id: string, reviewedBy: string, status: string, reviewNotes?: string): Promise<FamilyUpdate> {
    const [updated] = await db
      .update(familyUpdates)
      .set({
        status,
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes,
        updatedAt: new Date()
      })
      .where(eq(familyUpdates.id, id))
      .returning();
    return updated;
  }

  // Role and Permission management implementations
  async getAllCustomRoles(): Promise<CustomRole[]> {
    return await db.select().from(customRoles).where(eq(customRoles.isActive, true)).orderBy(customRoles.displayName);
  }

  async getCustomRole(id: string): Promise<CustomRole | undefined> {
    const [role] = await db.select().from(customRoles).where(eq(customRoles.id, id));
    return role;
  }

  async createCustomRole(role: InsertCustomRole): Promise<CustomRole> {
    const [newRole] = await db.insert(customRoles).values(role).returning();
    return newRole;
  }

  async updateCustomRole(id: string, role: Partial<InsertCustomRole>): Promise<CustomRole> {
    const [updatedRole] = await db
      .update(customRoles)
      .set({ ...role, updatedAt: new Date() })
      .where(eq(customRoles.id, id))
      .returning();
    return updatedRole;
  }

  async deleteCustomRole(id: string): Promise<void> {
    await db.update(customRoles)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(customRoles.id, id));
  }

  async getAllPermissions(): Promise<Permission[]> {
    return await db.select().from(permissions).orderBy(permissions.category, permissions.displayName);
  }

  async getPermission(id: string): Promise<Permission | undefined> {
    const [permission] = await db.select().from(permissions).where(eq(permissions.id, id));
    return permission;
  }

  async createPermission(permission: InsertPermission): Promise<Permission> {
    const [newPermission] = await db.insert(permissions).values(permission).returning();
    return newPermission;
  }

  async updatePermission(id: string, permission: Partial<InsertPermission>): Promise<Permission> {
    const [updatedPermission] = await db
      .update(permissions)
      .set(permission)
      .where(eq(permissions.id, id))
      .returning();
    return updatedPermission;
  }

  async deletePermission(id: string): Promise<void> {
    await db.delete(permissions).where(eq(permissions.id, id));
  }

  async getPermissionsByCategory(category: string): Promise<Permission[]> {
    return await db.select().from(permissions)
      .where(eq(permissions.category, category))
      .orderBy(permissions.displayName);
  }

  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const result = await db
      .select({
        id: permissions.id,
        name: permissions.name,
        displayName: permissions.displayName,
        description: permissions.description,
        category: permissions.category,
        resource: permissions.resource,
        action: permissions.action,
        isSystemPermission: permissions.isSystemPermission,
        createdAt: permissions.createdAt,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId));
    
    return result;
  }

  async addPermissionToRole(rolePermission: InsertRolePermission): Promise<RolePermission> {
    const [newRolePermission] = await db.insert(rolePermissions).values(rolePermission).returning();
    return newRolePermission;
  }

  async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    await db.delete(rolePermissions)
      .where(and(
        eq(rolePermissions.roleId, roleId),
        eq(rolePermissions.permissionId, permissionId)
      ));
  }

  async getUserCustomRoles(userId: string): Promise<CustomRole[]> {
    const result = await db
      .select({
        id: customRoles.id,
        name: customRoles.name,
        displayName: customRoles.displayName,
        description: customRoles.description,
        isActive: customRoles.isActive,
        createdBy: customRoles.createdBy,
        officeId: customRoles.officeId,
        createdAt: customRoles.createdAt,
        updatedAt: customRoles.updatedAt,
      })
      .from(userCustomRoles)
      .innerJoin(customRoles, eq(userCustomRoles.roleId, customRoles.id))
      .where(and(
        eq(userCustomRoles.userId, userId),
        eq(userCustomRoles.isActive, true),
        eq(customRoles.isActive, true)
      ));
    
    return result;
  }

  async assignRoleToUser(userRole: InsertUserCustomRole): Promise<UserCustomRole> {
    const [newUserRole] = await db.insert(userCustomRoles).values(userRole).returning();
    return newUserRole;
  }

  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await db.update(userCustomRoles)
      .set({ isActive: false })
      .where(and(
        eq(userCustomRoles.userId, userId),
        eq(userCustomRoles.roleId, roleId)
      ));
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    // Get all permissions from user's custom roles
    const result = await db
      .select({
        id: permissions.id,
        name: permissions.name,
        displayName: permissions.displayName,
        description: permissions.description,
        category: permissions.category,
        resource: permissions.resource,
        action: permissions.action,
        isSystemPermission: permissions.isSystemPermission,
        createdAt: permissions.createdAt,
      })
      .from(userCustomRoles)
      .innerJoin(customRoles, eq(userCustomRoles.roleId, customRoles.id))
      .innerJoin(rolePermissions, eq(customRoles.id, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(and(
        eq(userCustomRoles.userId, userId),
        eq(userCustomRoles.isActive, true),
        eq(customRoles.isActive, true)
      ));
    
    // Remove duplicates
    const uniquePermissions = result.reduce((acc, permission) => {
      if (!acc.find(p => p.id === permission.id)) {
        acc.push(permission);
      }
      return acc;
    }, [] as Permission[]);
    
    return uniquePermissions;
  }

  // Scheduling operations implementation
  async getMasterWeekTemplatesByClient(clientId: string): Promise<MasterWeekTemplate[]> {
    return await db.select().from(masterWeekTemplates)
      .where(eq(masterWeekTemplates.clientId, clientId))
      .orderBy(desc(masterWeekTemplates.createdAt));
  }

  async getMasterWeekTemplate(id: string): Promise<MasterWeekTemplate | undefined> {
    const [template] = await db.select().from(masterWeekTemplates)
      .where(eq(masterWeekTemplates.id, id));
    return template;
  }

  async createMasterWeekTemplate(template: InsertMasterWeekTemplate): Promise<MasterWeekTemplate> {
    const [newTemplate] = await db.insert(masterWeekTemplates).values(template).returning();
    return newTemplate;
  }

  async updateMasterWeekTemplate(id: string, template: Partial<InsertMasterWeekTemplate>): Promise<MasterWeekTemplate> {
    const [updatedTemplate] = await db.update(masterWeekTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(masterWeekTemplates.id, id))
      .returning();
    return updatedTemplate;
  }

  async deleteMasterWeekTemplate(id: string): Promise<void> {
    await db.delete(masterWeekTemplates).where(eq(masterWeekTemplates.id, id));
  }

  async getMasterWeekSlots(templateId: string): Promise<MasterWeekSlot[]> {
    return await db.select().from(masterWeekSlots)
      .where(eq(masterWeekSlots.templateId, templateId))
      .orderBy(asc(masterWeekSlots.dayOfWeek), asc(masterWeekSlots.startTime));
  }

  async createMasterWeekSlot(slot: InsertMasterWeekSlot): Promise<MasterWeekSlot> {
    const [newSlot] = await db.insert(masterWeekSlots).values(slot).returning();
    return newSlot;
  }

  async updateMasterWeekSlot(id: string, slot: Partial<InsertMasterWeekSlot>): Promise<MasterWeekSlot> {
    const [updatedSlot] = await db.update(masterWeekSlots)
      .set(slot)
      .where(eq(masterWeekSlots.id, id))
      .returning();
    return updatedSlot;
  }

  async deleteMasterWeekSlot(id: string): Promise<void> {
    await db.delete(masterWeekSlots).where(eq(masterWeekSlots.id, id));
  }

  async getClientSchedules(clientId: string, startDate?: Date, endDate?: Date): Promise<ClientSchedule[]> {
    const conditions = [eq(clientSchedules.clientId, clientId)];
    
    if (startDate && endDate) {
      conditions.push(gte(clientSchedules.scheduledDate, startDate));
      conditions.push(lte(clientSchedules.scheduledDate, endDate));
    }
    
    return await db.select().from(clientSchedules)
      .where(and(...conditions))
      .orderBy(asc(clientSchedules.scheduledDate), asc(clientSchedules.startTime));
  }

  async getSchedulesByCaregiver(caregiverId: string, startDate?: Date, endDate?: Date): Promise<ClientSchedule[]> {
    const conditions = [eq(clientSchedules.caregiverId, caregiverId)];
    
    if (startDate && endDate) {
      conditions.push(gte(clientSchedules.scheduledDate, startDate));
      conditions.push(lte(clientSchedules.scheduledDate, endDate));
    }
    
    return await db.select().from(clientSchedules)
      .where(and(...conditions))
      .orderBy(asc(clientSchedules.scheduledDate), asc(clientSchedules.startTime));
  }

  async getSchedulesByOffice(officeId: string, startDate?: Date, endDate?: Date): Promise<ClientSchedule[]> {
    const officeClients = await db.select({ id: clients.id }).from(clients)
      .where(eq(clients.officeId, officeId));
    
    if (officeClients.length === 0) {
      return [];
    }
    
    const clientIds = officeClients.map(c => c.id);
    const conditions: any[] = [inArray(clientSchedules.clientId, clientIds)];
    
    if (startDate) {
      conditions.push(gte(clientSchedules.scheduledDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(clientSchedules.scheduledDate, endDate));
    }
    
    return await db.select().from(clientSchedules)
      .where(and(...conditions))
      .orderBy(asc(clientSchedules.scheduledDate), asc(clientSchedules.startTime));
  }

  async createClientSchedule(schedule: InsertClientSchedule): Promise<ClientSchedule> {
    const [newSchedule] = await db.insert(clientSchedules).values(schedule).returning();
    return newSchedule;
  }

  async updateClientSchedule(id: string, schedule: Partial<InsertClientSchedule>): Promise<ClientSchedule> {
    const [updatedSchedule] = await db.update(clientSchedules)
      .set({ ...schedule, updatedAt: new Date() })
      .where(eq(clientSchedules.id, id))
      .returning();
    return updatedSchedule;
  }

  async deleteClientSchedule(id: string): Promise<void> {
    await db.delete(clientSchedules).where(eq(clientSchedules.id, id));
  }

  async applyMasterWeekToSchedules(templateId: string, fromDate: Date, toDate: Date): Promise<ClientSchedule[]> {
    // Get template and its slots
    const template = await this.getMasterWeekTemplate(templateId);
    if (!template || !template.isActive) {
      throw new Error('Template not found or inactive');
    }

    const slots = await this.getMasterWeekSlots(templateId);
    const newSchedules: ClientSchedule[] = [];

    // Helper to calculate hours from start/end time
    const calculateHours = (startTime: string, endTime: string): number => {
      if (!startTime || !endTime) return 0;
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
      if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight
      return totalMinutes / 60;
    };

    // Get the start of the week (Sunday) for the fromDate
    const getWeekStart = (date: Date): Date => {
      const d = new Date(date);
      const day = d.getDay();
      d.setDate(d.getDate() - day);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    // Iterate through each week in the date range
    let currentWeekStart = getWeekStart(fromDate);
    const endDateObj = new Date(toDate);
    endDateObj.setHours(23, 59, 59, 999);

    while (currentWeekStart <= endDateObj) {
      // Create schedules for each slot for this week
      for (const slot of slots) {
        const scheduleDate = new Date(currentWeekStart);
        scheduleDate.setDate(scheduleDate.getDate() + slot.dayOfWeek);

        // Skip if schedule date is before fromDate or after toDate
        if (scheduleDate < fromDate || scheduleDate > endDateObj) {
          continue;
        }

        // Calculate hours and billing amount
        const totalHours = calculateHours(slot.startTime, slot.endTime);
        const hourlyRate = (slot as any).hourlyRate ? parseFloat((slot as any).hourlyRate) : null;
        const billingAmount = hourlyRate ? totalHours * hourlyRate : null;

        const scheduleData: InsertClientSchedule = {
          clientId: template.clientId,
          caregiverId: slot.caregiverId,
          scheduledDate: scheduleDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
          serviceType: slot.serviceType,
          status: 'scheduled',
          notes: slot.notes,
          masterWeekSlotId: slot.id,
          createdBy: template.createdBy,
          scheduleType: (slot as any).scheduleType,
          payCode: (slot as any).payCode,
          poc: (slot as any).poc,
          primaryBillTo: (slot as any).primaryBillTo,
          serviceCode: (slot as any).serviceCode,
          budgetNumber: (slot as any).budgetNumber,
          rateType: (slot as any).rateType,
          hourlyRate: hourlyRate?.toString(),
          totalHours: totalHours.toFixed(2),
          billingAmount: billingAmount?.toFixed(2),
          includeMileage: (slot as any).includeMileage,
        };

        const newSchedule = await this.createClientSchedule(scheduleData);
        newSchedules.push(newSchedule);
      }

      // Move to next week
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    return newSchedules;
  }

  async createScheduleChangeLog(log: InsertScheduleChangeLog): Promise<ScheduleChangeLog> {
    const [newLog] = await db.insert(scheduleChangeLog).values(log).returning();
    return newLog;
  }

  async getScheduleChangeLogs(scheduleId: string): Promise<ScheduleChangeLog[]> {
    return await db.select().from(scheduleChangeLog)
      .where(eq(scheduleChangeLog.scheduleId, scheduleId))
      .orderBy(desc(scheduleChangeLog.createdAt));
  }

  // AI Issue Detection operations
  async getAllAiDetectedIssues(): Promise<AiDetectedIssue[]> {
    return await db.select().from(aiDetectedIssues).orderBy(desc(aiDetectedIssues.createdAt));
  }

  async getAiDetectedIssue(id: string): Promise<AiDetectedIssue | undefined> {
    const [issue] = await db.select().from(aiDetectedIssues).where(eq(aiDetectedIssues.id, id));
    return issue;
  }

  async createAiDetectedIssue(issue: InsertAiDetectedIssue): Promise<AiDetectedIssue> {
    const [newIssue] = await db.insert(aiDetectedIssues).values(issue).returning();
    return newIssue;
  }

  async updateAiDetectedIssue(id: string, issue: Partial<InsertAiDetectedIssue>): Promise<AiDetectedIssue> {
    const [updatedIssue] = await db.update(aiDetectedIssues)
      .set({ ...issue, updatedAt: new Date() })
      .where(eq(aiDetectedIssues.id, id))
      .returning();
    return updatedIssue;
  }

  async deleteAiDetectedIssue(id: string): Promise<void> {
    await db.delete(aiDetectedIssues).where(eq(aiDetectedIssues.id, id));
  }

  // EVV Data operations
  async getAllEvvData(officeId?: string): Promise<EvvData[]> {
    if (officeId) {
      return await db
        .select()
        .from(evvData)
        .where(eq(evvData.officeId, officeId))
        .orderBy(desc(evvData.createdAt));
    }
    return await db
      .select()
      .from(evvData)
      .orderBy(desc(evvData.createdAt));
  }

  async getEvvData(id: string): Promise<EvvData | undefined> {
    const [data] = await db.select().from(evvData).where(eq(evvData.id, id));
    return data;
  }

  async getEvvDataByMonthYear(month: number, year: number): Promise<EvvData[]> {
    return await db.select().from(evvData)
      .where(and(eq(evvData.month, month), eq(evvData.year, year)));
  }

  async createEvvData(data: InsertEvvData): Promise<EvvData> {
    const [newData] = await db.insert(evvData).values(data).returning();
    return newData;
  }

  async updateEvvData(id: string, data: Partial<InsertEvvData>): Promise<EvvData> {
    const [updatedData] = await db.update(evvData)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(evvData.id, id))
      .returning();
    return updatedData;
  }

  async deleteEvvData(id: string): Promise<void> {
    await db.delete(evvData).where(eq(evvData.id, id));
  }

  // Monthly dashboard statistics
  async getMonthlyStats(year: number, officeId?: string): Promise<{
    month: number;
    activeDcwCount: number;
    evvPercentage: number;
    clientCount: number;
  }[]> {
    const stats = [];
    
    for (let month = 1; month <= 12; month++) {
      const monthEnd = new Date(year, month, 0, 23, 59, 59);
      
      // Count active caregivers (DCWs) - those created before or during this month and still active
      const dcwConditions = [
        lte(caregivers.createdAt, monthEnd),
        eq(caregivers.isActive, true)
      ];
      if (officeId) {
        dcwConditions.push(eq(caregivers.officeId, officeId));
      }
      const dcwResult = await db
        .select({ count: count() })
        .from(caregivers)
        .where(and(...dcwConditions));
      
      // Count active clients - those created before or during this month and active
      const clientConditions = [
        lte(clients.createdAt, monthEnd),
        eq(clients.status, "active")
      ];
      if (officeId) {
        clientConditions.push(eq(clients.officeId, officeId));
      }
      const clientResult = await db
        .select({ count: count() })
        .from(clients)
        .where(and(...clientConditions));
      
      // Get average EVV percentage for this month from evv_data table
      const evvConditions = [
        eq(evvData.month, month),
        eq(evvData.year, year)
      ];
      if (officeId) {
        evvConditions.push(eq(evvData.officeId, officeId));
      }
      const evvResult = await db
        .select({ percentage: evvData.percentage })
        .from(evvData)
        .where(and(...evvConditions));
      
      // Calculate average EVV percentage if there are multiple MCOs
      let avgEvvPercentage = 0;
      if (evvResult.length > 0) {
        const total = evvResult.reduce((sum, row) => sum + Number(row.percentage || 0), 0);
        avgEvvPercentage = Math.round(total / evvResult.length);
      }
      
      stats.push({
        month,
        activeDcwCount: Number(dcwResult[0]?.count) || 0,
        evvPercentage: avgEvvPercentage,
        clientCount: Number(clientResult[0]?.count) || 0,
      });
    }
    
    return stats;
  }

  // Incident report statistics by month
  async getIncidentStatsByMonth(year?: number): Promise<{
    month: number;
    year: number;
    total: number;
    solved: number;
    unsolved: number;
  }[]> {
    const targetYear = year || new Date().getFullYear();
    const stats: { month: number; year: number; total: number; solved: number; unsolved: number; }[] = [];
    
    for (let month = 1; month <= 12; month++) {
      const monthStart = new Date(targetYear, month - 1, 1);
      const monthEnd = new Date(targetYear, month, 0, 23, 59, 59);
      
      // Get all incidents for this month
      const incidents = await db
        .select()
        .from(incidentReports)
        .where(
          and(
            gte(incidentReports.incidentDate, monthStart),
            lte(incidentReports.incidentDate, monthEnd)
          )
        );
      
      // Count solved (resolved, closed) and unsolved (open, under_investigation)
      const solved = incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length;
      const unsolved = incidents.filter(i => i.status === 'open' || i.status === 'under_investigation').length;
      
      stats.push({
        month,
        year: targetYear,
        total: incidents.length,
        solved,
        unsolved,
      });
    }
    
    return stats;
  }

  // MCO Type operations
  async getAllMcoTypes(): Promise<McoType[]> {
    return await db.select().from(mcoTypes).orderBy(asc(mcoTypes.name));
  }

  async getMcoType(id: string): Promise<McoType | undefined> {
    const [mcoType] = await db.select().from(mcoTypes).where(eq(mcoTypes.id, id));
    return mcoType;
  }

  async createMcoType(mcoType: InsertMcoType): Promise<McoType> {
    const [newMcoType] = await db.insert(mcoTypes).values(mcoType).returning();
    return newMcoType;
  }

  async updateMcoType(id: string, mcoType: Partial<InsertMcoType>): Promise<McoType> {
    const [updatedMcoType] = await db
      .update(mcoTypes)
      .set({ ...mcoType, updatedAt: new Date() })
      .where(eq(mcoTypes.id, id))
      .returning();
    return updatedMcoType;
  }

  async deleteMcoType(id: string): Promise<void> {
    await db.delete(mcoTypes).where(eq(mcoTypes.id, id));
  }

  // MCO operations
  async getAllMcos(): Promise<Mco[]> {
    return await db.select().from(mcos).orderBy(asc(mcos.name));
  }

  async getMco(id: string): Promise<Mco | undefined> {
    const [mco] = await db.select().from(mcos).where(eq(mcos.id, id));
    return mco;
  }

  async getMcosByType(typeId: string): Promise<Mco[]> {
    return await db.select().from(mcos).where(eq(mcos.typeId, typeId)).orderBy(asc(mcos.name));
  }

  async getMcosByOffice(officeId: string): Promise<Mco[]> {
    // Get MCO IDs linked to this office via the billing rates junction table
    const linkedMcoIds = await db
      .selectDistinct({ mcoId: officeMcoBillingRates.mcoId })
      .from(officeMcoBillingRates)
      .where(eq(officeMcoBillingRates.officeId, officeId));
    
    const linkedIds = linkedMcoIds.map(r => r.mcoId);
    
    // Return MCOs that either have direct office_id OR are linked via billing rates
    if (linkedIds.length > 0) {
      return await db.select().from(mcos)
        .where(or(eq(mcos.officeId, officeId), inArray(mcos.id, linkedIds)))
        .orderBy(asc(mcos.name));
    }
    
    // If no linked MCOs, just return direct office MCOs
    return await db.select().from(mcos).where(eq(mcos.officeId, officeId)).orderBy(asc(mcos.name));
  }

  async createMco(mco: InsertMco): Promise<Mco> {
    const [newMco] = await db.insert(mcos).values(mco).returning();
    return newMco;
  }

  async updateMco(id: string, mco: Partial<InsertMco>): Promise<Mco> {
    const [updatedMco] = await db
      .update(mcos)
      .set({ ...mco, updatedAt: new Date() })
      .where(eq(mcos.id, id))
      .returning();
    return updatedMco;
  }

  async deleteMco(id: string): Promise<void> {
    await db.delete(mcos).where(eq(mcos.id, id));
  }

  // System Settings operations
  async getAllSystemSettings(): Promise<SystemSetting[]> {
    return await db.select().from(systemSettings).orderBy(asc(systemSettings.key));
  }

  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return setting;
  }

  async createSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting> {
    const [newSetting] = await db.insert(systemSettings).values(setting).returning();
    return newSetting;
  }

  async updateSystemSetting(key: string, setting: Partial<InsertSystemSetting>): Promise<SystemSetting> {
    const [updatedSetting] = await db
      .update(systemSettings)
      .set({ ...setting, updatedAt: new Date() })
      .where(eq(systemSettings.key, key))
      .returning();
    return updatedSetting;
  }

  async upsertSystemSetting(key: string, value: string): Promise<SystemSetting> {
    const existing = await this.getSystemSetting(key);
    if (existing) {
      return await this.updateSystemSetting(key, { value });
    } else {
      return await this.createSystemSetting({ key, value });
    }
  }

  async deleteSystemSetting(key: string): Promise<void> {
    await db.delete(systemSettings).where(eq(systemSettings.key, key));
  }

  // Entity Field Config operations
  async getAllEntityFieldConfigs(): Promise<EntityFieldConfig[]> {
    return await db.select().from(entityFieldConfigs).orderBy(asc(entityFieldConfigs.displayOrder));
  }

  async getEntityFieldConfigsByType(entityType: 'client' | 'caregiver'): Promise<EntityFieldConfig[]> {
    return await db.select().from(entityFieldConfigs)
      .where(eq(entityFieldConfigs.entityType, entityType))
      .orderBy(asc(entityFieldConfigs.displayOrder));
  }

  async getEntityFieldConfig(id: string): Promise<EntityFieldConfig | undefined> {
    const [config] = await db.select().from(entityFieldConfigs).where(eq(entityFieldConfigs.id, id));
    return config;
  }

  async createEntityFieldConfig(config: InsertEntityFieldConfig): Promise<EntityFieldConfig> {
    const [newConfig] = await db.insert(entityFieldConfigs).values(config).returning();
    return newConfig;
  }

  async updateEntityFieldConfig(id: string, config: Partial<InsertEntityFieldConfig>): Promise<EntityFieldConfig> {
    const [updatedConfig] = await db
      .update(entityFieldConfigs)
      .set({ ...config, updatedAt: new Date() })
      .where(eq(entityFieldConfigs.id, id))
      .returning();
    return updatedConfig;
  }

  async deleteEntityFieldConfig(id: string): Promise<void> {
    await db.delete(entityFieldConfigs).where(eq(entityFieldConfigs.id, id));
  }

  // Client Communications operations
  async getClientCommunications(clientId: string): Promise<ClientCommunication[]> {
    const results = await db.select().from(clientCommunications)
      .where(eq(clientCommunications.clientId, clientId))
      .orderBy(desc(clientCommunications.createdAt));
    return results.map(r => ({
      ...r,
      message: decryptNote(r.message) || r.message,
    }));
  }

  async createClientCommunication(communication: InsertClientCommunication): Promise<ClientCommunication> {
    const encryptedData = {
      ...communication,
      message: encryptNote(communication.message) || communication.message,
    };
    const [newCommunication] = await db.insert(clientCommunications).values(encryptedData).returning();
    return {
      ...newCommunication,
      message: decryptNote(newCommunication.message) || newCommunication.message,
    };
  }

  async updateClientCommunication(id: string, communication: Partial<InsertClientCommunication>): Promise<ClientCommunication> {
    const encryptedData = {
      ...communication,
      ...(communication.message !== undefined && { message: encryptNote(communication.message) || communication.message }),
      updatedAt: new Date(),
    };
    const [updatedCommunication] = await db
      .update(clientCommunications)
      .set(encryptedData)
      .where(eq(clientCommunications.id, id))
      .returning();
    return {
      ...updatedCommunication,
      message: decryptNote(updatedCommunication.message) || updatedCommunication.message,
    };
  }

  async deleteClientCommunication(id: string): Promise<void> {
    await db.delete(clientCommunications).where(eq(clientCommunications.id, id));
  }

  // Office MCO Billing Rate operations
  async getOfficeMcoBillingRates(officeId: string, mcoId?: string): Promise<OfficeMcoBillingRate[]> {
    if (mcoId) {
      return await db.select().from(officeMcoBillingRates)
        .where(and(
          eq(officeMcoBillingRates.officeId, officeId),
          eq(officeMcoBillingRates.mcoId, mcoId)
        ))
        .orderBy(asc(officeMcoBillingRates.serviceCode));
    }
    return await db.select().from(officeMcoBillingRates)
      .where(eq(officeMcoBillingRates.officeId, officeId))
      .orderBy(asc(officeMcoBillingRates.serviceCode));
  }

  async getOfficeMcoBillingRate(id: string): Promise<OfficeMcoBillingRate | undefined> {
    const [rate] = await db.select().from(officeMcoBillingRates).where(eq(officeMcoBillingRates.id, id));
    return rate;
  }

  async createOfficeMcoBillingRate(rate: InsertOfficeMcoBillingRate): Promise<OfficeMcoBillingRate> {
    const [newRate] = await db.insert(officeMcoBillingRates).values(rate).returning();
    return newRate;
  }

  async updateOfficeMcoBillingRate(id: string, rate: Partial<InsertOfficeMcoBillingRate>): Promise<OfficeMcoBillingRate> {
    const [updatedRate] = await db
      .update(officeMcoBillingRates)
      .set({ ...rate, updatedAt: new Date() })
      .where(eq(officeMcoBillingRates.id, id))
      .returning();
    return updatedRate;
  }

  async deleteOfficeMcoBillingRate(id: string): Promise<void> {
    await db.delete(officeMcoBillingRates).where(eq(officeMcoBillingRates.id, id));
  }

  // Schedule rollover operations
  async rolloverSchedules(clientId: string, days: number = 30): Promise<ClientSchedule[]> {
    const templates = await this.getMasterWeekTemplatesByClient(clientId);
    if (templates.length === 0) {
      return [];
    }

    const activeTemplate = templates[0];
    const slots = await this.getMasterWeekSlots(activeTemplate.id);
    
    if (slots.length === 0) {
      return [];
    }

    const existingSchedules = await this.getClientSchedules(clientId);
    const latestSchedule = existingSchedules.sort((a, b) => 
      new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime()
    )[0];

    const startDate = latestSchedule 
      ? new Date(new Date(latestSchedule.scheduledDate).getTime() + 24 * 60 * 60 * 1000)
      : new Date();
    
    const endDate = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);
    const newSchedules: ClientSchedule[] = [];

    for (let date = new Date(startDate); date < endDate; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay();
      const daySlots = slots.filter(s => s.dayOfWeek === dayOfWeek);

      for (const slot of daySlots) {
        const schedule = await this.createClientSchedule({
          clientId,
          caregiverId: slot.caregiverId,
          scheduledDate: new Date(date),
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: 'scheduled',
          masterWeekSlotId: slot.id,
        });
        newSchedules.push(schedule);
      }
    }

    return newSchedules;
  }

  // ==================== BILLING RECORDS ====================
  async getBillingRecords(officeId?: string): Promise<BillingRecord[]> {
    const conditions = [];
    if (officeId) {
      conditions.push(eq(billingRecords.officeId, officeId));
    }
    return await db
      .select()
      .from(billingRecords)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(billingRecords.createdAt));
  }

  async getBillingRecord(id: string): Promise<BillingRecord | undefined> {
    const [record] = await db.select().from(billingRecords).where(eq(billingRecords.id, id));
    return record;
  }

  async createBillingRecord(data: InsertBillingRecord): Promise<BillingRecord> {
    const [record] = await db.insert(billingRecords).values(data).returning();
    return record;
  }

  async updateBillingRecord(id: string, data: Partial<InsertBillingRecord>): Promise<BillingRecord> {
    const [record] = await db.update(billingRecords).set({ ...data, updatedAt: new Date() }).where(eq(billingRecords.id, id)).returning();
    return record;
  }

  async deleteBillingRecord(id: string): Promise<void> {
    await db.delete(billingRecords).where(eq(billingRecords.id, id));
  }

  // ==================== PAYROLL CONFIGURATION ====================
  async getOfficePayrollConfig(officeId: string): Promise<OfficePayrollConfig | undefined> {
    const [config] = await db.select().from(officePayrollConfigs).where(eq(officePayrollConfigs.officeId, officeId));
    return config;
  }

  async getAllOfficePayrollConfigs(): Promise<OfficePayrollConfig[]> {
    return await db.select().from(officePayrollConfigs);
  }

  async upsertOfficePayrollConfig(data: InsertOfficePayrollConfig): Promise<OfficePayrollConfig> {
    const existing = await this.getOfficePayrollConfig(data.officeId);
    if (existing) {
      const [config] = await db.update(officePayrollConfigs).set({ ...data, updatedAt: new Date() }).where(eq(officePayrollConfigs.officeId, data.officeId)).returning();
      return config;
    }
    const [config] = await db.insert(officePayrollConfigs).values(data).returning();
    return config;
  }

  // ==================== PAYROLL RUNS ====================
  async getPayrollRuns(officeId?: string): Promise<PayrollRun[]> {
    if (officeId) {
      return await db.select().from(payrollRuns).where(eq(payrollRuns.officeId, officeId)).orderBy(desc(payrollRuns.paycheckDate));
    }
    return await db.select().from(payrollRuns).orderBy(desc(payrollRuns.paycheckDate));
  }

  async getPayrollRun(id: string): Promise<PayrollRun | undefined> {
    const [run] = await db.select().from(payrollRuns).where(eq(payrollRuns.id, id));
    return run;
  }

  async createPayrollRun(data: InsertPayrollRun): Promise<PayrollRun> {
    const [run] = await db.insert(payrollRuns).values(data).returning();
    return run;
  }

  async updatePayrollRun(id: string, data: Partial<InsertPayrollRun>): Promise<PayrollRun> {
    const [run] = await db.update(payrollRuns).set({ ...data, updatedAt: new Date() }).where(eq(payrollRuns.id, id)).returning();
    return run;
  }

  async deletePayrollRun(id: string): Promise<void> {
    await db.delete(payrollLineItems).where(eq(payrollLineItems.payrollRunId, id));
    await db.delete(payrollRuns).where(eq(payrollRuns.id, id));
  }

  // ==================== PAYROLL LINE ITEMS ====================
  async getPayrollLineItems(payrollRunId: string): Promise<PayrollLineItem[]> {
    return await db.select().from(payrollLineItems).where(eq(payrollLineItems.payrollRunId, payrollRunId));
  }

  async createPayrollLineItem(data: InsertPayrollLineItem): Promise<PayrollLineItem> {
    const [item] = await db.insert(payrollLineItems).values(data).returning();
    return item;
  }

  async updatePayrollLineItem(id: string, data: Partial<InsertPayrollLineItem>): Promise<PayrollLineItem> {
    const [item] = await db.update(payrollLineItems).set(data).where(eq(payrollLineItems.id, id)).returning();
    return item;
  }

  async deletePayrollLineItem(id: string): Promise<void> {
    await db.delete(payrollLineItems).where(eq(payrollLineItems.id, id));
  }

  // ==================== CAREGIVER TIME ENTRIES ====================
  async getTimeEntriesByPayrollRun(payrollRunId: string): Promise<CaregiverTimeEntry[]> {
    return await db.select().from(caregiverTimeEntries)
      .where(eq(caregiverTimeEntries.payrollRunId, payrollRunId))
      .orderBy(caregiverTimeEntries.entryDate);
  }

  async getTimeEntriesByCaregiver(caregiverId: string, payrollRunId?: string): Promise<CaregiverTimeEntry[]> {
    if (payrollRunId) {
      return await db.select().from(caregiverTimeEntries)
        .where(and(
          eq(caregiverTimeEntries.caregiverId, caregiverId),
          eq(caregiverTimeEntries.payrollRunId, payrollRunId)
        ))
        .orderBy(caregiverTimeEntries.entryDate);
    }
    return await db.select().from(caregiverTimeEntries)
      .where(eq(caregiverTimeEntries.caregiverId, caregiverId))
      .orderBy(caregiverTimeEntries.entryDate);
  }

  async createTimeEntry(data: InsertCaregiverTimeEntry): Promise<CaregiverTimeEntry> {
    const [entry] = await db.insert(caregiverTimeEntries).values(data).returning();
    return entry;
  }

  async createTimeEntries(entries: InsertCaregiverTimeEntry[]): Promise<CaregiverTimeEntry[]> {
    if (entries.length === 0) return [];
    return await db.insert(caregiverTimeEntries).values(entries).returning();
  }

  async deleteTimeEntriesByPayrollRun(payrollRunId: string): Promise<void> {
    await db.delete(caregiverTimeEntries).where(eq(caregiverTimeEntries.payrollRunId, payrollRunId));
  }

  async deleteTimeEntriesByImportBatch(importBatchId: string): Promise<void> {
    await db.delete(caregiverTimeEntries).where(eq(caregiverTimeEntries.importBatchId, importBatchId));
  }

  // Find caregiver by assignment ID for billing import matching
  async getCaregiverByAssignmentId(assignmentId: string): Promise<Caregiver | undefined> {
    const [caregiver] = await db.select().from(caregivers).where(eq(caregivers.assignmentId, assignmentId));
    return caregiver;
  }

  // Find caregiver by ADP code for import matching
  async getCaregiverByAdpCode(adpCode: string): Promise<Caregiver | undefined> {
    const [caregiver] = await db.select().from(caregivers).where(eq(caregivers.adpCode, adpCode));
    return caregiver;
  }

  // Find client by HHAX admission ID for billing import matching
  async getClientByHhaxId(hhaxAdmissionId: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.hhaxAdmissionId, hhaxAdmissionId));
    return client;
  }

  // ==================== PAYROLL HOLIDAYS ====================
  async getPayrollHolidays(officeId: string, year?: number): Promise<PayrollHoliday[]> {
    if (year) {
      return await db.select().from(payrollHolidays)
        .where(and(eq(payrollHolidays.officeId, officeId), eq(payrollHolidays.year, year)))
        .orderBy(payrollHolidays.date);
    }
    return await db.select().from(payrollHolidays)
      .where(eq(payrollHolidays.officeId, officeId))
      .orderBy(payrollHolidays.date);
  }

  async createPayrollHoliday(data: InsertPayrollHoliday): Promise<PayrollHoliday> {
    const [holiday] = await db.insert(payrollHolidays).values(data).returning();
    return holiday;
  }

  async updatePayrollHoliday(id: string, data: Partial<InsertPayrollHoliday>): Promise<PayrollHoliday> {
    const [holiday] = await db.update(payrollHolidays).set(data).where(eq(payrollHolidays.id, id)).returning();
    return holiday;
  }

  async deletePayrollHoliday(id: string): Promise<void> {
    await db.delete(payrollHolidays).where(eq(payrollHolidays.id, id));
  }

  async initializeDefaultHolidays(officeId: string, year: number): Promise<PayrollHoliday[]> {
    const existing = await this.getPayrollHolidays(officeId, year);
    if (existing.length > 0) return existing;
    
    const getUSHolidays = (yr: number): { date: Date; name: string }[] => {
      const holidays: { date: Date; name: string }[] = [];
      holidays.push({ date: new Date(yr, 0, 1), name: "New Year's Day" });
      const janFirst = new Date(yr, 0, 1);
      let mlkDay = new Date(yr, 0, 15 + ((8 - janFirst.getDay()) % 7));
      holidays.push({ date: mlkDay, name: "MLK Jr. Day" });
      const febFirst = new Date(yr, 1, 1);
      let presidentsDay = new Date(yr, 1, 15 + ((8 - febFirst.getDay()) % 7));
      holidays.push({ date: presidentsDay, name: "Presidents' Day" });
      let memorialDay = new Date(yr, 4, 31);
      while (memorialDay.getDay() !== 1) memorialDay.setDate(memorialDay.getDate() - 1);
      holidays.push({ date: memorialDay, name: "Memorial Day" });
      holidays.push({ date: new Date(yr, 6, 4), name: "Independence Day" });
      const sepFirst = new Date(yr, 8, 1);
      let laborDay = new Date(yr, 8, 1 + ((8 - sepFirst.getDay()) % 7));
      holidays.push({ date: laborDay, name: "Labor Day" });
      const octFirst = new Date(yr, 9, 1);
      let columbusDay = new Date(yr, 9, 8 + ((8 - octFirst.getDay()) % 7));
      holidays.push({ date: columbusDay, name: "Columbus Day" });
      holidays.push({ date: new Date(yr, 10, 11), name: "Veterans Day" });
      const novFirst = new Date(yr, 10, 1);
      let thanksgiving = new Date(yr, 10, 22 + ((11 - novFirst.getDay()) % 7));
      holidays.push({ date: thanksgiving, name: "Thanksgiving" });
      holidays.push({ date: new Date(yr, 11, 25), name: "Christmas Day" });
      return holidays;
    };
    
    const defaultHolidays = getUSHolidays(year);
    const createdHolidays: PayrollHoliday[] = [];
    for (const h of defaultHolidays) {
      const holiday = await this.createPayrollHoliday({
        officeId,
        name: h.name,
        date: h.date,
        isDefault: true,
        year,
      });
      createdHolidays.push(holiday);
    }
    return createdHolidays;
  }

  // ==================== PA SURVEY CHECKLIST ====================
  async getPaSurveyChecklistItems(): Promise<PaSurveyChecklistItem[]> {
    return await db.select().from(paSurveyChecklistItems).where(eq(paSurveyChecklistItems.isActive, true)).orderBy(paSurveyChecklistItems.section, paSurveyChecklistItems.sortOrder);
  }

  async createPaSurveyChecklistItem(data: InsertPaSurveyChecklistItem): Promise<PaSurveyChecklistItem> {
    const [item] = await db.insert(paSurveyChecklistItems).values(data).returning();
    return item;
  }

  async updatePaSurveyChecklistItem(id: string, data: Partial<InsertPaSurveyChecklistItem>): Promise<PaSurveyChecklistItem> {
    const [item] = await db.update(paSurveyChecklistItems).set({ ...data, updatedAt: new Date() }).where(eq(paSurveyChecklistItems.id, id)).returning();
    return item;
  }

  async deletePaSurveyChecklistItem(id: string): Promise<void> {
    await db.delete(officePaSurveyStatuses).where(eq(officePaSurveyStatuses.checklistItemId, id));
    await db.delete(paSurveyChecklistItems).where(eq(paSurveyChecklistItems.id, id));
  }

  // ==================== OFFICE PA SURVEY STATUSES ====================
  async getOfficePaSurveyStatuses(officeId: string): Promise<OfficePaSurveyStatus[]> {
    return await db.select().from(officePaSurveyStatuses).where(eq(officePaSurveyStatuses.officeId, officeId));
  }

  async upsertOfficePaSurveyStatus(data: InsertOfficePaSurveyStatus): Promise<OfficePaSurveyStatus> {
    const [existing] = await db.select().from(officePaSurveyStatuses)
      .where(and(
        eq(officePaSurveyStatuses.officeId, data.officeId),
        eq(officePaSurveyStatuses.checklistItemId, data.checklistItemId)
      ));
    
    if (existing) {
      const [status] = await db.update(officePaSurveyStatuses)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(officePaSurveyStatuses.id, existing.id))
        .returning();
      return status;
    }
    const [status] = await db.insert(officePaSurveyStatuses).values(data).returning();
    return status;
  }

  async initializeOfficePaSurveyStatuses(officeId: string): Promise<OfficePaSurveyStatus[]> {
    const checklistItems = await this.getPaSurveyChecklistItems();
    const existingStatuses = await this.getOfficePaSurveyStatuses(officeId);
    const existingItemIds = new Set(existingStatuses.map(s => s.checklistItemId));
    
    const newStatuses: OfficePaSurveyStatus[] = [];
    for (const item of checklistItems) {
      if (!existingItemIds.has(item.id)) {
        const status = await this.upsertOfficePaSurveyStatus({
          officeId,
          checklistItemId: item.id,
          status: 'not_started',
        });
        newStatuses.push(status);
      }
    }
    
    return [...existingStatuses, ...newStatuses];
  }

  async seedDefaultPaSurveyChecklistItems(): Promise<void> {
    const existingItems = await this.getPaSurveyChecklistItems();
    if (existingItems.length > 0) return;

    const defaultItems = [
      { section: "Personnel Records", title: "Criminal Background Checks", description: "All staff must have current FBI and PA State Police clearances on file", regulationRef: "28 Pa. Code § 611.52", sortOrder: 1 },
      { section: "Personnel Records", title: "Child Abuse Clearances", description: "Current child abuse clearances for all direct care staff", regulationRef: "23 Pa.C.S. § 6344", sortOrder: 2 },
      { section: "Personnel Records", title: "Tuberculosis Testing", description: "Annual TB testing documentation for all staff", regulationRef: "28 Pa. Code § 611.52", sortOrder: 3 },
      { section: "Personnel Records", title: "Health Assessment Records", description: "Physical examination records within past 2 years", regulationRef: "28 Pa. Code § 611.52", sortOrder: 4 },
      { section: "Personnel Records", title: "Training Documentation", description: "Initial and ongoing training records for all caregivers", regulationRef: "28 Pa. Code § 611.53", sortOrder: 5 },
      { section: "Personnel Records", title: "CPR/First Aid Certification", description: "Current CPR and First Aid certifications", regulationRef: "28 Pa. Code § 611.53", sortOrder: 6 },
      { section: "Client Records", title: "Service Agreements", description: "Signed service agreements with all clients", regulationRef: "28 Pa. Code § 611.55", sortOrder: 7 },
      { section: "Client Records", title: "Care Plans", description: "Current individualized care plans for all clients", regulationRef: "28 Pa. Code § 611.55", sortOrder: 8 },
      { section: "Client Records", title: "Physician Orders", description: "Current physician orders where applicable", regulationRef: "28 Pa. Code § 611.55", sortOrder: 9 },
      { section: "Client Records", title: "Emergency Contact Information", description: "Updated emergency contacts for all clients", regulationRef: "28 Pa. Code § 611.55", sortOrder: 10 },
      { section: "Client Records", title: "Incident Reports", description: "Complete incident reporting documentation", regulationRef: "28 Pa. Code § 611.57", sortOrder: 11 },
      { section: "Client Records", title: "Progress Notes", description: "Timely and complete service documentation", regulationRef: "28 Pa. Code § 611.55", sortOrder: 12 },
      { section: "Policies & Procedures", title: "HIPAA Compliance Policies", description: "Privacy and security policies in place", regulationRef: "45 CFR § 164", sortOrder: 13 },
      { section: "Policies & Procedures", title: "Infection Control Policies", description: "Current infection control procedures", regulationRef: "28 Pa. Code § 611.56", sortOrder: 14 },
      { section: "Policies & Procedures", title: "Emergency Preparedness Plan", description: "Documented emergency and disaster plans", regulationRef: "28 Pa. Code § 611.56", sortOrder: 15 },
      { section: "Policies & Procedures", title: "Complaint/Grievance Procedures", description: "Written complaint handling procedures", regulationRef: "28 Pa. Code § 611.54", sortOrder: 16 },
      { section: "Policies & Procedures", title: "Quality Assurance Program", description: "Active QA program with documentation", regulationRef: "28 Pa. Code § 611.58", sortOrder: 17 },
      { section: "Administrative", title: "Current License Display", description: "License displayed in visible location", regulationRef: "28 Pa. Code § 611.51", sortOrder: 18 },
      { section: "Administrative", title: "Insurance Documentation", description: "Current liability insurance certificates", regulationRef: "28 Pa. Code § 611.51", sortOrder: 19 },
      { section: "Administrative", title: "Organizational Chart", description: "Current organizational structure", regulationRef: "28 Pa. Code § 611.51", sortOrder: 20 },
    ];

    for (const item of defaultItems) {
      await this.createPaSurveyChecklistItem(item);
    }
  }

  // ==================== CAREGIVER PROFILE OPERATIONS ====================

  // Caregiver Notes
  async getCaregiverNotes(caregiverId: string): Promise<CaregiverNote[]> {
    const results = await db.select().from(caregiverNotes).where(eq(caregiverNotes.caregiverId, caregiverId)).orderBy(desc(caregiverNotes.createdAt));
    return results.map(r => ({
      ...r,
      content: decryptNote(r.content) || r.content,
    }));
  }

  async createCaregiverNote(note: InsertCaregiverNote): Promise<CaregiverNote> {
    const encryptedData = {
      ...note,
      content: encryptNote(note.content) || note.content,
    };
    const [created] = await db.insert(caregiverNotes).values(encryptedData).returning();
    return {
      ...created,
      content: decryptNote(created.content) || created.content,
    };
  }

  async updateCaregiverNote(id: string, note: Partial<InsertCaregiverNote>): Promise<CaregiverNote> {
    const encryptedData = {
      ...note,
      ...(note.content !== undefined && { content: encryptNote(note.content) || note.content }),
      updatedAt: new Date(),
    };
    const [updated] = await db.update(caregiverNotes).set(encryptedData).where(eq(caregiverNotes.id, id)).returning();
    return {
      ...updated,
      content: decryptNote(updated.content) || updated.content,
    };
  }

  async deleteCaregiverNote(id: string): Promise<void> {
    await db.delete(caregiverNotes).where(eq(caregiverNotes.id, id));
  }

  // Caregiver Preferences
  async getCaregiverPreferences(caregiverId: string): Promise<CaregiverPreference[]> {
    return await db.select().from(caregiverPreferences).where(eq(caregiverPreferences.caregiverId, caregiverId)).orderBy(asc(caregiverPreferences.priority));
  }

  async createCaregiverPreference(preference: InsertCaregiverPreference): Promise<CaregiverPreference> {
    const [created] = await db.insert(caregiverPreferences).values(preference).returning();
    return created;
  }

  async updateCaregiverPreference(id: string, preference: Partial<InsertCaregiverPreference>): Promise<CaregiverPreference> {
    const [updated] = await db.update(caregiverPreferences).set({ ...preference, updatedAt: new Date() }).where(eq(caregiverPreferences.id, id)).returning();
    return updated;
  }

  async deleteCaregiverPreference(id: string): Promise<void> {
    await db.delete(caregiverPreferences).where(eq(caregiverPreferences.id, id));
  }

  // Caregiver Absences
  async getCaregiverAbsences(caregiverId: string): Promise<CaregiverAbsence[]> {
    return await db.select().from(caregiverAbsences).where(eq(caregiverAbsences.caregiverId, caregiverId)).orderBy(desc(caregiverAbsences.startDate));
  }

  async createCaregiverAbsence(absence: InsertCaregiverAbsence): Promise<CaregiverAbsence> {
    const [created] = await db.insert(caregiverAbsences).values(absence).returning();
    return created;
  }

  async updateCaregiverAbsence(id: string, absence: Partial<InsertCaregiverAbsence>): Promise<CaregiverAbsence> {
    const [updated] = await db.update(caregiverAbsences).set({ ...absence, updatedAt: new Date() }).where(eq(caregiverAbsences.id, id)).returning();
    return updated;
  }

  async deleteCaregiverAbsence(id: string): Promise<void> {
    await db.delete(caregiverAbsences).where(eq(caregiverAbsences.id, id));
  }

  // Caregiver Availability
  async getCaregiverAvailability(caregiverId: string): Promise<CaregiverAvailability[]> {
    return await db.select().from(caregiverAvailability).where(eq(caregiverAvailability.caregiverId, caregiverId)).orderBy(asc(caregiverAvailability.dayOfWeek));
  }

  async createCaregiverAvailability(availability: InsertCaregiverAvailability): Promise<CaregiverAvailability> {
    const [created] = await db.insert(caregiverAvailability).values(availability).returning();
    return created;
  }

  async updateCaregiverAvailability(id: string, availability: Partial<InsertCaregiverAvailability>): Promise<CaregiverAvailability> {
    const [updated] = await db.update(caregiverAvailability).set({ ...availability, updatedAt: new Date() }).where(eq(caregiverAvailability.id, id)).returning();
    return updated;
  }

  async deleteCaregiverAvailability(id: string): Promise<void> {
    await db.delete(caregiverAvailability).where(eq(caregiverAvailability.id, id));
  }

  async setWeeklyAvailability(caregiverId: string, availability: InsertCaregiverAvailability[]): Promise<CaregiverAvailability[]> {
    await db.delete(caregiverAvailability).where(eq(caregiverAvailability.caregiverId, caregiverId));
    if (availability.length === 0) return [];
    const toInsert = availability.map(a => ({ ...a, caregiverId }));
    const created = await db.insert(caregiverAvailability).values(toInsert).returning();
    return created;
  }

  // Caregiver Availability Exceptions
  async getAvailabilityExceptions(caregiverId: string, startDate?: Date, endDate?: Date): Promise<CaregiverAvailabilityException[]> {
    const conditions = [eq(caregiverAvailabilityExceptions.caregiverId, caregiverId)];
    if (startDate) {
      conditions.push(gte(caregiverAvailabilityExceptions.date, startDate));
    }
    if (endDate) {
      conditions.push(lte(caregiverAvailabilityExceptions.date, endDate));
    }
    return await db.select().from(caregiverAvailabilityExceptions).where(and(...conditions)).orderBy(asc(caregiverAvailabilityExceptions.date));
  }

  async createAvailabilityException(exception: InsertCaregiverAvailabilityException): Promise<CaregiverAvailabilityException> {
    const [created] = await db.insert(caregiverAvailabilityExceptions).values(exception).returning();
    return created;
  }

  async deleteAvailabilityException(id: string): Promise<void> {
    await db.delete(caregiverAvailabilityExceptions).where(eq(caregiverAvailabilityExceptions.id, id));
  }

  // Availability checking - find available caregivers for a time slot
  async getAvailableCaregivers(date: Date, startTime: string, endTime: string, officeId?: string): Promise<Caregiver[]> {
    const dayOfWeek = date.getDay();
    
    const allCaregivers = officeId 
      ? await db.select().from(caregivers).where(and(eq(caregivers.officeId, officeId), eq(caregivers.isActive, true)))
      : await db.select().from(caregivers).where(eq(caregivers.isActive, true));
    
    const availableCaregivers: Caregiver[] = [];
    
    for (const caregiver of allCaregivers) {
      const result = await this.checkCaregiverAvailability(caregiver.id, date, startTime, endTime);
      if (result.available) {
        availableCaregivers.push(caregiver);
      }
    }
    
    return availableCaregivers;
  }

  async checkCaregiverAvailability(caregiverId: string, date: Date, startTime: string, endTime: string): Promise<{ available: boolean; reason?: string }> {
    const dayOfWeek = date.getDay();
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);
    
    const exceptions = await db.select().from(caregiverAvailabilityExceptions).where(
      and(
        eq(caregiverAvailabilityExceptions.caregiverId, caregiverId),
        gte(caregiverAvailabilityExceptions.date, dateStart),
        lte(caregiverAvailabilityExceptions.date, dateEnd)
      )
    );
    
    for (const exception of exceptions) {
      if (!exception.isAvailable) {
        if (!exception.startTime || !exception.endTime) {
          return { available: false, reason: exception.reason || 'Has exception for this date' };
        }
        if (this.timeRangesOverlap(startTime, endTime, exception.startTime, exception.endTime)) {
          return { available: false, reason: exception.reason || 'Has exception for this time' };
        }
      }
    }
    
    const weeklyAvail = await db.select().from(caregiverAvailability).where(
      and(
        eq(caregiverAvailability.caregiverId, caregiverId),
        eq(caregiverAvailability.dayOfWeek, dayOfWeek),
        eq(caregiverAvailability.isAvailable, true)
      )
    );
    
    if (weeklyAvail.length === 0) {
      return { available: false, reason: 'No weekly availability set for this day' };
    }
    
    for (const slot of weeklyAvail) {
      if (this.timeRangesOverlap(startTime, endTime, slot.startTime, slot.endTime)) {
        return { available: true };
      }
    }
    
    return { available: false, reason: 'Not available during requested time' };
  }

  private timeRangesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    const toMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };
    const s1 = toMinutes(start1), e1 = toMinutes(end1);
    const s2 = toMinutes(start2), e2 = toMinutes(end2);
    return s1 < e2 && e1 > s2;
  }

  // Shift matching operations
  async getCaregiversWithMatchCriteria(officeId?: string, skills?: string[], availableOnDate?: Date): Promise<Caregiver[]> {
    let allCaregivers: Caregiver[];
    
    if (officeId) {
      allCaregivers = await db.select().from(caregivers).where(
        and(eq(caregivers.officeId, officeId), eq(caregivers.isActive, true))
      );
    } else {
      allCaregivers = await db.select().from(caregivers).where(eq(caregivers.isActive, true));
    }

    let filteredCaregivers = allCaregivers;

    if (skills && skills.length > 0) {
      filteredCaregivers = filteredCaregivers.filter(caregiver => {
        const caregiverSkills = caregiver.specializations || [];
        return skills.some(skill => 
          caregiverSkills.some(cs => cs.toLowerCase().includes(skill.toLowerCase()))
        );
      });
    }

    if (availableOnDate) {
      const dayOfWeek = availableOnDate.getDay();
      const availableCaregivers: Caregiver[] = [];
      
      for (const caregiver of filteredCaregivers) {
        const availability = await db.select().from(caregiverAvailability).where(
          and(
            eq(caregiverAvailability.caregiverId, caregiver.id),
            eq(caregiverAvailability.dayOfWeek, dayOfWeek),
            eq(caregiverAvailability.isAvailable, true)
          )
        );
        if (availability.length > 0) {
          availableCaregivers.push(caregiver);
        }
      }
      filteredCaregivers = availableCaregivers;
    }

    return filteredCaregivers;
  }

  async getCaregiverScheduleConflicts(caregiverId: string, date: Date, startTime: string, endTime: string): Promise<CaregiverSchedule[]> {
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);

    const schedules = await db.select().from(caregiverSchedules).where(
      and(
        eq(caregiverSchedules.caregiverId, caregiverId),
        gte(caregiverSchedules.scheduledDate, dateStart),
        lte(caregiverSchedules.scheduledDate, dateEnd)
      )
    );

    const conflicts: CaregiverSchedule[] = [];
    for (const schedule of schedules) {
      if (schedule.status === 'cancelled') continue;
      if (this.timeRangesOverlap(startTime, endTime, schedule.startTime, schedule.endTime)) {
        conflicts.push(schedule);
      }
    }

    return conflicts;
  }

  // Caregiver Payroll Info
  async getCaregiverPayrollInfo(caregiverId: string): Promise<CaregiverPayrollInfo | undefined> {
    const [info] = await db.select().from(caregiverPayrollInfo).where(eq(caregiverPayrollInfo.caregiverId, caregiverId));
    return info;
  }

  async upsertCaregiverPayrollInfo(info: InsertCaregiverPayrollInfo): Promise<CaregiverPayrollInfo> {
    const existing = await this.getCaregiverPayrollInfo(info.caregiverId);
    if (existing) {
      const [updated] = await db.update(caregiverPayrollInfo).set({ ...info, updatedAt: new Date() }).where(eq(caregiverPayrollInfo.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(caregiverPayrollInfo).values(info).returning();
    return created;
  }

  // Caregiver Expenses
  async getCaregiverExpenses(caregiverId: string): Promise<CaregiverExpense[]> {
    return await db.select().from(caregiverExpenses).where(eq(caregiverExpenses.caregiverId, caregiverId)).orderBy(desc(caregiverExpenses.expenseDate));
  }

  async createCaregiverExpense(expense: InsertCaregiverExpense): Promise<CaregiverExpense> {
    const [created] = await db.insert(caregiverExpenses).values(expense).returning();
    return created;
  }

  async updateCaregiverExpense(id: string, expense: Partial<InsertCaregiverExpense>): Promise<CaregiverExpense> {
    const [updated] = await db.update(caregiverExpenses).set({ ...expense, updatedAt: new Date() }).where(eq(caregiverExpenses.id, id)).returning();
    return updated;
  }

  async deleteCaregiverExpense(id: string): Promise<void> {
    await db.delete(caregiverExpenses).where(eq(caregiverExpenses.id, id));
  }

  // Caregiver Paychecks
  async getCaregiverPaychecks(caregiverId: string): Promise<CaregiverPaycheck[]> {
    return await db.select().from(caregiverPaychecks).where(eq(caregiverPaychecks.caregiverId, caregiverId)).orderBy(desc(caregiverPaychecks.payDate));
  }

  async createCaregiverPaycheck(paycheck: InsertCaregiverPaycheck): Promise<CaregiverPaycheck> {
    const [created] = await db.insert(caregiverPaychecks).values(paycheck).returning();
    return created;
  }

  async updateCaregiverPaycheck(id: string, paycheck: Partial<InsertCaregiverPaycheck>): Promise<CaregiverPaycheck> {
    const [updated] = await db.update(caregiverPaychecks).set({ ...paycheck, updatedAt: new Date() }).where(eq(caregiverPaychecks.id, id)).returning();
    return updated;
  }

  // Caregiver Rates
  async getCaregiverRates(caregiverId: string): Promise<CaregiverRate[]> {
    return await db.select().from(caregiverRates).where(eq(caregiverRates.caregiverId, caregiverId)).orderBy(desc(caregiverRates.createdAt));
  }

  async createCaregiverRate(rate: InsertCaregiverRate): Promise<CaregiverRate> {
    const [created] = await db.insert(caregiverRates).values(rate).returning();
    return created;
  }

  async updateCaregiverRate(id: string, rate: Partial<InsertCaregiverRate>): Promise<CaregiverRate> {
    const [updated] = await db.update(caregiverRates).set({ ...rate, updatedAt: new Date() }).where(eq(caregiverRates.id, id)).returning();
    return updated;
  }

  async deleteCaregiverRate(id: string): Promise<void> {
    await db.delete(caregiverRates).where(eq(caregiverRates.id, id));
  }

  // Caregiver In-Service
  async getCaregiverInServices(caregiverId: string): Promise<CaregiverInService[]> {
    return await db.select().from(caregiverInServices).where(eq(caregiverInServices.caregiverId, caregiverId)).orderBy(desc(caregiverInServices.trainingDate));
  }

  async createCaregiverInService(inService: InsertCaregiverInService): Promise<CaregiverInService> {
    const [created] = await db.insert(caregiverInServices).values(inService).returning();
    return created;
  }

  async updateCaregiverInService(id: string, inService: Partial<InsertCaregiverInService>): Promise<CaregiverInService> {
    const [updated] = await db.update(caregiverInServices).set({ ...inService, updatedAt: new Date() }).where(eq(caregiverInServices.id, id)).returning();
    return updated;
  }

  async deleteCaregiverInService(id: string): Promise<void> {
    await db.delete(caregiverInServices).where(eq(caregiverInServices.id, id));
  }

  // Caregiver Office Moves
  async getCaregiverOfficeMoves(caregiverId: string): Promise<CaregiverOfficeMove[]> {
    return await db.select().from(caregiverOfficeMoves).where(eq(caregiverOfficeMoves.caregiverId, caregiverId)).orderBy(desc(caregiverOfficeMoves.moveDate));
  }

  async createCaregiverOfficeMove(move: InsertCaregiverOfficeMove): Promise<CaregiverOfficeMove> {
    const [created] = await db.insert(caregiverOfficeMoves).values(move).returning();
    return created;
  }

  async updateCaregiverOfficeMove(id: string, move: Partial<InsertCaregiverOfficeMove>): Promise<CaregiverOfficeMove> {
    const [updated] = await db.update(caregiverOfficeMoves).set({ ...move, updatedAt: new Date() }).where(eq(caregiverOfficeMoves.id, id)).returning();
    return updated;
  }

  // Caregiver Schedules
  async getCaregiverSchedules(caregiverId: string, startDate?: Date, endDate?: Date): Promise<CaregiverSchedule[]> {
    if (startDate && endDate) {
      return await db.select().from(caregiverSchedules)
        .where(and(
          eq(caregiverSchedules.caregiverId, caregiverId),
          gte(caregiverSchedules.scheduledDate, startDate),
          lte(caregiverSchedules.scheduledDate, endDate)
        ))
        .orderBy(asc(caregiverSchedules.scheduledDate));
    }
    return await db.select().from(caregiverSchedules).where(eq(caregiverSchedules.caregiverId, caregiverId)).orderBy(asc(caregiverSchedules.scheduledDate));
  }

  async createCaregiverSchedule(schedule: InsertCaregiverSchedule): Promise<CaregiverSchedule> {
    const [created] = await db.insert(caregiverSchedules).values(schedule).returning();
    return created;
  }

  async updateCaregiverSchedule(id: string, schedule: Partial<InsertCaregiverSchedule>): Promise<CaregiverSchedule> {
    const [updated] = await db.update(caregiverSchedules).set({ ...schedule, updatedAt: new Date() }).where(eq(caregiverSchedules.id, id)).returning();
    return updated;
  }

  async deleteCaregiverSchedule(id: string): Promise<void> {
    await db.delete(caregiverSchedules).where(eq(caregiverSchedules.id, id));
  }

  async getCaregiverSchedule(id: string): Promise<CaregiverSchedule | undefined> {
    const [schedule] = await db.select().from(caregiverSchedules).where(eq(caregiverSchedules.id, id));
    return schedule;
  }

  async getAllCaregiverSchedules(officeId?: string): Promise<CaregiverSchedule[]> {
    if (officeId) {
      const officeCaregivers = await db.select({ id: caregivers.id })
        .from(caregivers)
        .where(eq(caregivers.officeId, officeId));
      
      const caregiverIds = officeCaregivers.map(c => c.id);
      if (caregiverIds.length === 0) {
        return [];
      }
      
      return await db.select().from(caregiverSchedules)
        .where(inArray(caregiverSchedules.caregiverId, caregiverIds))
        .orderBy(desc(caregiverSchedules.scheduledDate));
    }
    return await db.select().from(caregiverSchedules).orderBy(desc(caregiverSchedules.scheduledDate));
  }

  // EVV (Electronic Visit Verification) operations
  async clockInWithLocation(scheduleId: string, latitude: string, longitude: string, distance?: string, photo?: string): Promise<CaregiverSchedule> {
    const [updated] = await db.update(caregiverSchedules)
      .set({
        clockInTime: new Date(),
        clockInLatitude: latitude,
        clockInLongitude: longitude,
        clockInDistance: distance || null,
        clockInPhoto: photo || null,
        status: 'in_progress',
        updatedAt: new Date(),
      })
      .where(eq(caregiverSchedules.id, scheduleId))
      .returning();
    return updated;
  }

  async clockOutWithLocation(scheduleId: string, latitude: string, longitude: string, distance?: string, photo?: string): Promise<CaregiverSchedule> {
    const schedule = await this.getCaregiverSchedule(scheduleId);
    
    // Determine EVV status based on distances (compliant if both distances are within threshold)
    const EVV_COMPLIANCE_THRESHOLD = 150; // 150 meters
    let evvStatus = 'pending';
    
    if (schedule?.clockInDistance && distance) {
      const clockInDist = parseFloat(schedule.clockInDistance);
      const clockOutDist = parseFloat(distance);
      
      if (clockInDist <= EVV_COMPLIANCE_THRESHOLD && clockOutDist <= EVV_COMPLIANCE_THRESHOLD) {
        evvStatus = 'compliant';
      } else {
        evvStatus = 'non_compliant';
      }
    }
    
    const [updated] = await db.update(caregiverSchedules)
      .set({
        clockOutTime: new Date(),
        clockOutLatitude: latitude,
        clockOutLongitude: longitude,
        clockOutDistance: distance || null,
        clockOutPhoto: photo || null,
        evvStatus,
        status: 'completed',
        updatedAt: new Date(),
      })
      .where(eq(caregiverSchedules.id, scheduleId))
      .returning();
    return updated;
  }

  async getEvvComplianceStats(officeId?: string, startDate?: Date, endDate?: Date): Promise<{
    totalSchedules: number;
    compliant: number;
    nonCompliant: number;
    pending: number;
    complianceRate: number;
  }> {
    // Build conditions for the query
    const conditions: any[] = [];
    
    if (startDate) {
      conditions.push(gte(caregiverSchedules.scheduledDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(caregiverSchedules.scheduledDate, endDate));
    }
    
    // If officeId is provided, we need to join with caregivers to filter by office
    let schedules: CaregiverSchedule[];
    
    if (officeId) {
      // Get caregiver IDs for the office
      const officeCaregivers = await db.select({ id: caregivers.id })
        .from(caregivers)
        .where(eq(caregivers.officeId, officeId));
      
      const caregiverIds = officeCaregivers.map(c => c.id);
      
      if (caregiverIds.length === 0) {
        return {
          totalSchedules: 0,
          compliant: 0,
          nonCompliant: 0,
          pending: 0,
          complianceRate: 0,
        };
      }
      
      conditions.push(inArray(caregiverSchedules.caregiverId, caregiverIds));
    }
    
    if (conditions.length > 0) {
      schedules = await db.select().from(caregiverSchedules).where(and(...conditions));
    } else {
      schedules = await db.select().from(caregiverSchedules);
    }
    
    const totalSchedules = schedules.length;
    const compliant = schedules.filter(s => s.evvStatus === 'compliant').length;
    const nonCompliant = schedules.filter(s => s.evvStatus === 'non_compliant').length;
    const pending = schedules.filter(s => s.evvStatus === 'pending' || !s.evvStatus).length;
    const complianceRate = totalSchedules > 0 ? (compliant / totalSchedules) * 100 : 0;
    
    return {
      totalSchedules,
      compliant,
      nonCompliant,
      pending,
      complianceRate: Math.round(complianceRate * 100) / 100,
    };
  }

  // Client MCO operations
  async getClientMcosByClient(clientId: string): Promise<ClientMco[]> {
    return await db.select().from(clientMcos).where(eq(clientMcos.clientId, clientId)).orderBy(desc(clientMcos.startDate));
  }

  async getClientMco(id: string): Promise<ClientMco | undefined> {
    const [mco] = await db.select().from(clientMcos).where(eq(clientMcos.id, id));
    return mco;
  }

  async createClientMco(mco: InsertClientMco): Promise<ClientMco> {
    const [created] = await db.insert(clientMcos).values(mco).returning();
    return created;
  }

  async updateClientMco(id: string, mco: Partial<InsertClientMco>): Promise<ClientMco> {
    const [updated] = await db.update(clientMcos).set({ ...mco, updatedAt: new Date() }).where(eq(clientMcos.id, id)).returning();
    return updated;
  }

  async deleteClientMco(id: string): Promise<void> {
    await db.delete(clientMcos).where(eq(clientMcos.id, id));
  }

  // Office Licenses
  async getOfficeLicenses(officeId: string): Promise<OfficeLicense[]> {
    return await db.select().from(officeLicenses).where(eq(officeLicenses.officeId, officeId)).orderBy(desc(officeLicenses.createdAt));
  }

  async getOfficeLicense(id: string): Promise<OfficeLicense | undefined> {
    const [license] = await db.select().from(officeLicenses).where(eq(officeLicenses.id, id));
    return license;
  }

  async createOfficeLicense(license: InsertOfficeLicense): Promise<OfficeLicense> {
    const [created] = await db.insert(officeLicenses).values(license).returning();
    return created;
  }

  async updateOfficeLicense(id: string, license: Partial<InsertOfficeLicense>): Promise<OfficeLicense> {
    const [updated] = await db.update(officeLicenses).set({ ...license, updatedAt: new Date() }).where(eq(officeLicenses.id, id)).returning();
    return updated;
  }

  async deleteOfficeLicense(id: string): Promise<void> {
    await db.delete(officeLicenses).where(eq(officeLicenses.id, id));
  }

  // Office Staff
  async getOfficeStaff(officeId: string): Promise<OfficeStaff[]> {
    return await db.select().from(officeStaff).where(eq(officeStaff.officeId, officeId)).orderBy(desc(officeStaff.createdAt));
  }

  async getOfficeStaffMember(id: string): Promise<OfficeStaff | undefined> {
    const [staff] = await db.select().from(officeStaff).where(eq(officeStaff.id, id));
    return staff;
  }

  async createOfficeStaff(staff: InsertOfficeStaff): Promise<OfficeStaff> {
    const [created] = await db.insert(officeStaff).values(staff).returning();
    return created;
  }

  async updateOfficeStaff(id: string, staff: Partial<InsertOfficeStaff>): Promise<OfficeStaff> {
    const [updated] = await db.update(officeStaff).set({ ...staff, updatedAt: new Date() }).where(eq(officeStaff.id, id)).returning();
    return updated;
  }

  async deleteOfficeStaff(id: string): Promise<void> {
    await db.delete(officeStaff).where(eq(officeStaff.id, id));
  }

  // Office Expenses
  async getOfficeExpenses(officeId: string): Promise<OfficeExpense[]> {
    return await db.select().from(officeExpenses).where(eq(officeExpenses.officeId, officeId)).orderBy(desc(officeExpenses.expenseDate));
  }

  async getOfficeExpense(id: string): Promise<OfficeExpense | undefined> {
    const [expense] = await db.select().from(officeExpenses).where(eq(officeExpenses.id, id));
    return expense;
  }

  async createOfficeExpense(expense: InsertOfficeExpense): Promise<OfficeExpense> {
    const [created] = await db.insert(officeExpenses).values(expense).returning();
    return created;
  }

  async updateOfficeExpense(id: string, expense: Partial<InsertOfficeExpense>): Promise<OfficeExpense> {
    const [updated] = await db.update(officeExpenses).set({ ...expense, updatedAt: new Date() }).where(eq(officeExpenses.id, id)).returning();
    return updated;
  }

  async deleteOfficeExpense(id: string): Promise<void> {
    await db.delete(officeExpenses).where(eq(officeExpenses.id, id));
  }

  // Eligibility Check operations
  async getEligibilityChecksByClient(clientId: string): Promise<EligibilityCheck[]> {
    return await db.select().from(eligibilityChecks).where(eq(eligibilityChecks.clientId, clientId)).orderBy(desc(eligibilityChecks.checkDate));
  }

  async getEligibilityCheck(id: string): Promise<EligibilityCheck | undefined> {
    const [check] = await db.select().from(eligibilityChecks).where(eq(eligibilityChecks.id, id));
    return check;
  }

  async createEligibilityCheck(check: InsertEligibilityCheck): Promise<EligibilityCheck> {
    const [created] = await db.insert(eligibilityChecks).values(check).returning();
    return created;
  }

  async updateEligibilityCheck(id: string, check: Partial<InsertEligibilityCheck>): Promise<EligibilityCheck> {
    const [updated] = await db.update(eligibilityChecks).set({ ...check, updatedAt: new Date() }).where(eq(eligibilityChecks.id, id)).returning();
    return updated;
  }

  async deleteEligibilityCheck(id: string): Promise<void> {
    await db.delete(eligibilityChecks).where(eq(eligibilityChecks.id, id));
  }

  async getLatestEligibilityCheck(clientId: string): Promise<EligibilityCheck | undefined> {
    const [check] = await db.select().from(eligibilityChecks)
      .where(eq(eligibilityChecks.clientId, clientId))
      .orderBy(desc(eligibilityChecks.checkDate))
      .limit(1);
    return check;
  }

  // Eligibility Schedule operations
  async getEligibilitySchedule(clientId: string): Promise<EligibilitySchedule | undefined> {
    const [schedule] = await db.select().from(eligibilitySchedule)
      .where(eq(eligibilitySchedule.clientId, clientId));
    return schedule;
  }

  async getAllEligibilitySchedules(): Promise<EligibilitySchedule[]> {
    return await db.select().from(eligibilitySchedule)
      .orderBy(desc(eligibilitySchedule.nextCheckDate));
  }

  async createEligibilitySchedule(schedule: InsertEligibilitySchedule): Promise<EligibilitySchedule> {
    const [created] = await db.insert(eligibilitySchedule).values(schedule).returning();
    return created;
  }

  async updateEligibilitySchedule(id: string, schedule: Partial<InsertEligibilitySchedule>): Promise<EligibilitySchedule> {
    const [updated] = await db.update(eligibilitySchedule)
      .set({ ...schedule, updatedAt: new Date() })
      .where(eq(eligibilitySchedule.id, id))
      .returning();
    return updated;
  }

  async deleteEligibilitySchedule(id: string): Promise<void> {
    await db.delete(eligibilitySchedule).where(eq(eligibilitySchedule.id, id));
  }

  async getDueEligibilityChecks(): Promise<EligibilitySchedule[]> {
    const now = new Date();
    return await db.select().from(eligibilitySchedule)
      .where(and(
        eq(eligibilitySchedule.isActive, true),
        lte(eligibilitySchedule.nextCheckDate, now)
      ))
      .orderBy(asc(eligibilitySchedule.nextCheckDate));
  }

  async updateClientEligibilityStatus(clientId: string, medicaidStatus?: string, snapStatus?: string): Promise<Client> {
    const updateData: Partial<InsertClient> = { updatedAt: new Date() };
    if (medicaidStatus !== undefined) {
      updateData.medicaidStatus = medicaidStatus;
    }
    if (snapStatus !== undefined) {
      updateData.snapStatus = snapStatus;
    }
    const [updated] = await db.update(clients)
      .set(updateData)
      .where(eq(clients.id, clientId))
      .returning();
    return updated;
  }

  // Caregiver Compliance operations
  async getCaregiverComplianceByCaregiver(caregiverId: string): Promise<CaregiverCompliance[]> {
    return await db.select().from(caregiverCompliance).where(eq(caregiverCompliance.caregiverId, caregiverId)).orderBy(desc(caregiverCompliance.createdAt));
  }

  async getCaregiverCompliance(id: string): Promise<CaregiverCompliance | undefined> {
    const [item] = await db.select().from(caregiverCompliance).where(eq(caregiverCompliance.id, id));
    return item;
  }

  async createCaregiverCompliance(compliance: InsertCaregiverCompliance): Promise<CaregiverCompliance> {
    const [created] = await db.insert(caregiverCompliance).values(compliance).returning();
    return created;
  }

  async updateCaregiverCompliance(id: string, compliance: Partial<InsertCaregiverCompliance>): Promise<CaregiverCompliance> {
    const [updated] = await db.update(caregiverCompliance).set({ ...compliance, updatedAt: new Date() }).where(eq(caregiverCompliance.id, id)).returning();
    return updated;
  }

  async deleteCaregiverCompliance(id: string): Promise<void> {
    await db.delete(caregiverCompliance).where(eq(caregiverCompliance.id, id));
  }

  // Birthday notification operations
  async getBirthdayNotifications(officeId?: string, limit?: number): Promise<BirthdayNotification[]> {
    const conditions = [];
    if (officeId) {
      conditions.push(eq(birthdayNotifications.officeId, officeId));
    }
    return await db
      .select()
      .from(birthdayNotifications)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(birthdayNotifications.sentAt))
      .limit(limit || 100);
  }

  async createBirthdayNotification(notification: InsertBirthdayNotification): Promise<BirthdayNotification> {
    const [newNotification] = await db.insert(birthdayNotifications).values(notification).returning();
    return newNotification;
  }

  async checkBirthdayNotificationSentToday(recipientType: string, recipientId: string, dateString: string): Promise<boolean> {
    const today = new Date(dateString);
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    // Check by sentAt range (when the notification record was created today)
    // This ensures we don't resend if a record was already created today for this recipient
    const existing = await db
      .select()
      .from(birthdayNotifications)
      .where(and(
        eq(birthdayNotifications.recipientType, recipientType),
        eq(birthdayNotifications.recipientId, recipientId),
        sql`${birthdayNotifications.sentAt} >= ${startOfDay}`,
        sql`${birthdayNotifications.sentAt} <= ${endOfDay}`
      ))
      .limit(1);
    
    return existing.length > 0;
  }

  async updateBirthdayNotificationStatus(id: string, smsStatus: string, emailStatus: string, smsError?: string, emailError?: string): Promise<void> {
    await db.update(birthdayNotifications).set({
      smsStatus,
      emailStatus,
      smsError,
      emailError,
    }).where(eq(birthdayNotifications.id, id));
  }

  async getTodaysBirthdays(officeId?: string): Promise<{ clients: Client[]; caregivers: Caregiver[] }> {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    // Get clients with birthdays today
    const clientConditions = [
      sql`EXTRACT(MONTH FROM ${clients.dateOfBirth}) = ${month}`,
      sql`EXTRACT(DAY FROM ${clients.dateOfBirth}) = ${day}`,
      eq(clients.status, 'active'),
    ];
    if (officeId) {
      clientConditions.push(eq(clients.officeId, officeId));
    }
    const birthdayClients = await db
      .select()
      .from(clients)
      .where(and(...clientConditions));

    // Get caregivers with birthdays today (using caregiver's own dateOfBirth field)
    const caregiverConditions = [
      sql`EXTRACT(MONTH FROM ${caregivers.dateOfBirth}) = ${month}`,
      sql`EXTRACT(DAY FROM ${caregivers.dateOfBirth}) = ${day}`,
      eq(caregivers.isActive, true),
    ];
    if (officeId) {
      caregiverConditions.push(eq(caregivers.officeId, officeId));
    }
    const birthdayCaregivers = await db
      .select()
      .from(caregivers)
      .where(and(...caregiverConditions));

    return { clients: birthdayClients, caregivers: birthdayCaregivers };
  }

  async getUpcomingBirthdays(days: number, officeId?: string): Promise<{ clients: Client[]; caregivers: Caregiver[] }> {
    const today = new Date();
    
    // Get all active clients and caregivers, then filter by upcoming birthday
    const clientConditions = [eq(clients.status, 'active')];
    if (officeId) {
      clientConditions.push(eq(clients.officeId, officeId));
    }
    const allClients = await db
      .select()
      .from(clients)
      .where(and(...clientConditions));

    const caregiverConditions = [eq(caregivers.isActive, true)];
    if (officeId) {
      caregiverConditions.push(eq(caregivers.officeId, officeId));
    }
    const allCaregivers = await db
      .select()
      .from(caregivers)
      .where(and(...caregiverConditions));

    // Filter by upcoming birthdays within the specified days
    const upcomingClients = allClients.filter(client => {
      if (!client.dateOfBirth) return false;
      const dob = new Date(client.dateOfBirth);
      const thisYearBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
      if (thisYearBirthday < today) {
        thisYearBirthday.setFullYear(today.getFullYear() + 1);
      }
      const diffDays = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= days;
    });

    const upcomingCaregivers = allCaregivers.filter(caregiver => {
      if (!caregiver.dateOfBirth) return false;
      const dob = new Date(caregiver.dateOfBirth);
      const thisYearBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
      if (thisYearBirthday < today) {
        thisYearBirthday.setFullYear(today.getFullYear() + 1);
      }
      const diffDays = Math.ceil((thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= days;
    });

    return { clients: upcomingClients, caregivers: upcomingCaregivers };
  }

  // Medication operations
  async getMedicationsByClient(clientId: string): Promise<Medication[]> {
    return await db.select().from(medications).where(eq(medications.clientId, clientId)).orderBy(desc(medications.createdAt));
  }

  async getMedication(id: string): Promise<Medication | undefined> {
    const [medication] = await db.select().from(medications).where(eq(medications.id, id));
    return medication;
  }

  async createMedication(medication: InsertMedication): Promise<Medication> {
    const [created] = await db.insert(medications).values(medication).returning();
    return created;
  }

  async updateMedication(id: string, medication: Partial<InsertMedication>): Promise<Medication> {
    const [updated] = await db.update(medications).set({ ...medication, updatedAt: new Date() }).where(eq(medications.id, id)).returning();
    return updated;
  }

  async deleteMedication(id: string): Promise<void> {
    await db.delete(medications).where(eq(medications.id, id));
  }

  // Medication Log operations
  async getMedicationLogs(medicationId: string): Promise<MedicationLog[]> {
    return await db.select().from(medicationLogs).where(eq(medicationLogs.medicationId, medicationId)).orderBy(desc(medicationLogs.createdAt));
  }

  async createMedicationLog(log: InsertMedicationLog): Promise<MedicationLog> {
    const [created] = await db.insert(medicationLogs).values(log).returning();
    return created;
  }

  async getMedicationAdherence(medicationId: string): Promise<{ total: number; taken: number; skipped: number; refused: number; adherenceRate: number }> {
    const logs = await db.select().from(medicationLogs).where(eq(medicationLogs.medicationId, medicationId));
    
    const total = logs.length;
    const taken = logs.filter(l => l.status === 'taken').length;
    const skipped = logs.filter(l => l.status === 'skipped').length;
    const refused = logs.filter(l => l.status === 'refused').length;
    const adherenceRate = total > 0 ? (taken / total) * 100 : 0;

    return { total, taken, skipped, refused, adherenceRate };
  }

  // Vital Signs operations
  async createVitalSign(vitalSign: InsertVitalSign): Promise<VitalSign> {
    const [created] = await db.insert(vitalSigns).values(vitalSign).returning();
    return created;
  }

  async getVitalSignsByClient(clientId: string, limit: number = 50): Promise<VitalSign[]> {
    return await db
      .select()
      .from(vitalSigns)
      .where(eq(vitalSigns.clientId, clientId))
      .orderBy(desc(vitalSigns.recordedAt))
      .limit(limit);
  }

  async getVitalSignsHistory(clientId: string, startDate: Date, endDate: Date): Promise<VitalSign[]> {
    return await db
      .select()
      .from(vitalSigns)
      .where(
        and(
          eq(vitalSigns.clientId, clientId),
          gte(vitalSigns.recordedAt, startDate),
          lte(vitalSigns.recordedAt, endDate)
        )
      )
      .orderBy(asc(vitalSigns.recordedAt));
  }

  async getVitalSignTrends(clientId: string, startDate: Date, endDate: Date): Promise<{
    avgBloodPressureSystolic: number | null;
    avgBloodPressureDiastolic: number | null;
    avgHeartRate: number | null;
    avgTemperature: number | null;
    avgRespiratoryRate: number | null;
    avgOxygenSaturation: number | null;
    avgWeight: number | null;
    avgBloodSugar: number | null;
    avgPainLevel: number | null;
    count: number;
  }> {
    const [result] = await db
      .select({
        avgBloodPressureSystolic: sql<number>`AVG(${vitalSigns.bloodPressureSystolic})`,
        avgBloodPressureDiastolic: sql<number>`AVG(${vitalSigns.bloodPressureDiastolic})`,
        avgHeartRate: sql<number>`AVG(${vitalSigns.heartRate})`,
        avgTemperature: sql<number>`AVG(${vitalSigns.temperature}::numeric)`,
        avgRespiratoryRate: sql<number>`AVG(${vitalSigns.respiratoryRate})`,
        avgOxygenSaturation: sql<number>`AVG(${vitalSigns.oxygenSaturation})`,
        avgWeight: sql<number>`AVG(${vitalSigns.weight}::numeric)`,
        avgBloodSugar: sql<number>`AVG(${vitalSigns.bloodSugar})`,
        avgPainLevel: sql<number>`AVG(${vitalSigns.painLevel})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(vitalSigns)
      .where(
        and(
          eq(vitalSigns.clientId, clientId),
          gte(vitalSigns.recordedAt, startDate),
          lte(vitalSigns.recordedAt, endDate)
        )
      );

    return {
      avgBloodPressureSystolic: result.avgBloodPressureSystolic ? Number(result.avgBloodPressureSystolic) : null,
      avgBloodPressureDiastolic: result.avgBloodPressureDiastolic ? Number(result.avgBloodPressureDiastolic) : null,
      avgHeartRate: result.avgHeartRate ? Number(result.avgHeartRate) : null,
      avgTemperature: result.avgTemperature ? Number(result.avgTemperature) : null,
      avgRespiratoryRate: result.avgRespiratoryRate ? Number(result.avgRespiratoryRate) : null,
      avgOxygenSaturation: result.avgOxygenSaturation ? Number(result.avgOxygenSaturation) : null,
      avgWeight: result.avgWeight ? Number(result.avgWeight) : null,
      avgBloodSugar: result.avgBloodSugar ? Number(result.avgBloodSugar) : null,
      avgPainLevel: result.avgPainLevel ? Number(result.avgPainLevel) : null,
      count: Number(result.count) || 0,
    };
  }

  // Notification Template operations
  async getAllNotificationTemplates(): Promise<NotificationTemplate[]> {
    return await db.select().from(notificationTemplates).orderBy(desc(notificationTemplates.createdAt));
  }

  async getNotificationTemplate(id: string): Promise<NotificationTemplate | undefined> {
    const [template] = await db.select().from(notificationTemplates).where(eq(notificationTemplates.id, id));
    return template;
  }

  async getNotificationTemplateByName(name: string): Promise<NotificationTemplate | undefined> {
    const [template] = await db.select().from(notificationTemplates).where(eq(notificationTemplates.name, name));
    return template;
  }

  async createNotificationTemplate(template: InsertNotificationTemplate): Promise<NotificationTemplate> {
    const [created] = await db.insert(notificationTemplates).values(template).returning();
    return created;
  }

  async updateNotificationTemplate(id: string, template: Partial<InsertNotificationTemplate>): Promise<NotificationTemplate> {
    const [updated] = await db.update(notificationTemplates).set(template).where(eq(notificationTemplates.id, id)).returning();
    return updated;
  }

  async deleteNotificationTemplate(id: string): Promise<void> {
    await db.delete(notificationTemplates).where(eq(notificationTemplates.id, id));
  }

  // Notification Queue operations
  async createNotificationQueueItem(item: InsertNotificationQueueItem): Promise<NotificationQueueItem> {
    const [created] = await db.insert(notificationQueue).values(item).returning();
    return created;
  }

  async getPendingNotifications(): Promise<NotificationQueueItem[]> {
    return await db
      .select()
      .from(notificationQueue)
      .where(
        and(
          eq(notificationQueue.status, 'pending'),
          or(
            sql`${notificationQueue.scheduledFor} IS NULL`,
            lte(notificationQueue.scheduledFor, new Date())
          )
        )
      )
      .orderBy(asc(notificationQueue.createdAt));
  }

  async getNotificationHistory(recipientId?: string, recipientType?: string, limit: number = 50): Promise<NotificationQueueItem[]> {
    const conditions = [];
    if (recipientId) {
      conditions.push(eq(notificationQueue.recipientId, recipientId));
    }
    if (recipientType) {
      conditions.push(eq(notificationQueue.recipientType, recipientType as any));
    }
    
    const query = db
      .select()
      .from(notificationQueue)
      .orderBy(desc(notificationQueue.createdAt))
      .limit(limit);
    
    if (conditions.length > 0) {
      return await query.where(and(...conditions));
    }
    return await query;
  }

  async updateNotificationQueueItem(id: string, item: Partial<InsertNotificationQueueItem>): Promise<NotificationQueueItem> {
    const [updated] = await db.update(notificationQueue).set(item).where(eq(notificationQueue.id, id)).returning();
    return updated;
  }

  // Notification Preferences operations
  async getNotificationPreferences(userId: string): Promise<NotificationPreference | undefined> {
    const [prefs] = await db.select().from(notificationPreferences).where(eq(notificationPreferences.userId, userId));
    return prefs;
  }

  async createNotificationPreferences(prefs: InsertNotificationPreference): Promise<NotificationPreference> {
    const [created] = await db.insert(notificationPreferences).values(prefs).returning();
    return created;
  }

  async updateNotificationPreferences(userId: string, prefs: Partial<InsertNotificationPreference>): Promise<NotificationPreference> {
    const [updated] = await db
      .update(notificationPreferences)
      .set({ ...prefs, updatedAt: new Date() })
      .where(eq(notificationPreferences.userId, userId))
      .returning();
    return updated;
  }

  // Mileage Log operations
  async createMileageLog(log: InsertMileageLog): Promise<MileageLog> {
    const [created] = await db.insert(mileageLogs).values(log).returning();
    return created;
  }

  async updateMileageLog(id: string, log: Partial<InsertMileageLog>): Promise<MileageLog> {
    const [updated] = await db
      .update(mileageLogs)
      .set({ ...log, updatedAt: new Date() })
      .where(eq(mileageLogs.id, id))
      .returning();
    return updated;
  }

  async getMileageLog(id: string): Promise<MileageLog | undefined> {
    const [log] = await db.select().from(mileageLogs).where(eq(mileageLogs.id, id));
    return log;
  }

  async getMileageLogsByCaregiver(caregiverId: string, startDate?: Date, endDate?: Date): Promise<MileageLog[]> {
    const conditions = [eq(mileageLogs.caregiverId, caregiverId)];
    if (startDate) {
      conditions.push(gte(mileageLogs.date, startDate));
    }
    if (endDate) {
      conditions.push(lte(mileageLogs.date, endDate));
    }
    return await db
      .select()
      .from(mileageLogs)
      .where(and(...conditions))
      .orderBy(desc(mileageLogs.date));
  }

  async getMileageLogsByStatus(status: string): Promise<MileageLog[]> {
    return await db
      .select()
      .from(mileageLogs)
      .where(eq(mileageLogs.status, status as any))
      .orderBy(desc(mileageLogs.date));
  }

  async approveMileageLog(id: string, approvedBy: string): Promise<MileageLog> {
    const [updated] = await db
      .update(mileageLogs)
      .set({
        status: 'approved',
        approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(mileageLogs.id, id))
      .returning();
    return updated;
  }

  async getMileageReimbursementTotals(caregiverId: string, startDate?: Date, endDate?: Date): Promise<{ totalMiles: number; totalReimbursement: number; pendingAmount: number; approvedAmount: number; paidAmount: number }> {
    const conditions = [eq(mileageLogs.caregiverId, caregiverId)];
    if (startDate) {
      conditions.push(gte(mileageLogs.date, startDate));
    }
    if (endDate) {
      conditions.push(lte(mileageLogs.date, endDate));
    }

    const logs = await db
      .select()
      .from(mileageLogs)
      .where(and(...conditions));

    const totalMiles = logs.reduce((sum, log) => sum + Number(log.totalMiles || 0), 0);
    const totalReimbursement = logs.reduce((sum, log) => sum + Number(log.reimbursementAmount || 0), 0);
    const pendingAmount = logs
      .filter(log => log.status === 'pending')
      .reduce((sum, log) => sum + Number(log.reimbursementAmount || 0), 0);
    const approvedAmount = logs
      .filter(log => log.status === 'approved')
      .reduce((sum, log) => sum + Number(log.reimbursementAmount || 0), 0);
    const paidAmount = logs
      .filter(log => log.status === 'paid')
      .reduce((sum, log) => sum + Number(log.reimbursementAmount || 0), 0);

    return { totalMiles, totalReimbursement, pendingAmount, approvedAmount, paidAmount };
  }

  // Applicant operations
  async getAllApplicants(officeId?: string): Promise<Applicant[]> {
    if (officeId) {
      return await db.select().from(applicants).where(eq(applicants.officeId, officeId)).orderBy(desc(applicants.createdAt));
    }
    return await db.select().from(applicants).orderBy(desc(applicants.createdAt));
  }

  async getApplicant(id: string): Promise<Applicant | undefined> {
    const [applicant] = await db.select().from(applicants).where(eq(applicants.id, id));
    return applicant;
  }

  async createApplicant(applicant: InsertApplicant): Promise<Applicant> {
    const [created] = await db.insert(applicants).values(applicant).returning();
    return created;
  }

  async updateApplicant(id: string, applicant: Partial<InsertApplicant>): Promise<Applicant> {
    const [updated] = await db
      .update(applicants)
      .set({ ...applicant, updatedAt: new Date() })
      .where(eq(applicants.id, id))
      .returning();
    return updated;
  }

  async deleteApplicant(id: string): Promise<void> {
    await db.delete(applicants).where(eq(applicants.id, id));
  }

  async getApplicantsByStatus(status: string, officeId?: string): Promise<Applicant[]> {
    const conditions = [eq(applicants.status, status as any)];
    if (officeId) {
      conditions.push(eq(applicants.officeId, officeId));
    }
    return await db.select().from(applicants).where(and(...conditions)).orderBy(desc(applicants.createdAt));
  }

  async getApplicantsByOffice(officeId: string): Promise<Applicant[]> {
    return await db.select().from(applicants).where(eq(applicants.officeId, officeId)).orderBy(desc(applicants.createdAt));
  }

  async moveApplicantToStage(id: string, newStatus: string): Promise<Applicant> {
    const [updated] = await db
      .update(applicants)
      .set({ status: newStatus as any, updatedAt: new Date() })
      .where(eq(applicants.id, id))
      .returning();
    return updated;
  }

  async getApplicantPipelineCounts(officeId?: string): Promise<{ status: string; count: number }[]> {
    const statuses = ['new', 'screening', 'interview_scheduled', 'interview_completed', 'background_check', 'offer_pending', 'hired', 'rejected', 'withdrawn'];
    const results: { status: string; count: number }[] = [];
    
    for (const status of statuses) {
      const conditions = [eq(applicants.status, status as any)];
      if (officeId) {
        conditions.push(eq(applicants.officeId, officeId));
      }
      const [result] = await db
        .select({ count: count() })
        .from(applicants)
        .where(and(...conditions));
      results.push({ status, count: Number(result?.count || 0) });
    }
    
    return results;
  }

  async convertApplicantToCaregiver(applicantId: string): Promise<Caregiver> {
    const applicant = await this.getApplicant(applicantId);
    if (!applicant) {
      throw new Error('Applicant not found');
    }

    const [caregiver] = await db.insert(caregivers).values({
      firstName: applicant.firstName,
      lastName: applicant.lastName,
      email: applicant.email,
      phone: applicant.phone,
      address: applicant.address,
      city: applicant.city,
      state: applicant.state,
      zipCode: applicant.zipCode,
      dateOfBirth: applicant.dateOfBirth,
      officeId: applicant.officeId,
      startDate: applicant.expectedStartDate,
      isActive: true,
    }).returning();

    await this.updateApplicant(applicantId, { status: 'hired' });
    
    return caregiver;
  }

  // Applicant Notes operations
  async getApplicantNotes(applicantId: string): Promise<ApplicantNote[]> {
    return await db
      .select()
      .from(applicantNotes)
      .where(eq(applicantNotes.applicantId, applicantId))
      .orderBy(desc(applicantNotes.createdAt));
  }

  async createApplicantNote(note: InsertApplicantNote): Promise<ApplicantNote> {
    const [created] = await db.insert(applicantNotes).values(note).returning();
    return created;
  }

  // Applicant Interviews operations
  async getApplicantInterviews(applicantId: string): Promise<ApplicantInterview[]> {
    return await db
      .select()
      .from(applicantInterviews)
      .where(eq(applicantInterviews.applicantId, applicantId))
      .orderBy(desc(applicantInterviews.scheduledDate));
  }

  async getApplicantInterview(id: string): Promise<ApplicantInterview | undefined> {
    const [interview] = await db.select().from(applicantInterviews).where(eq(applicantInterviews.id, id));
    return interview;
  }

  async createApplicantInterview(interview: InsertApplicantInterview): Promise<ApplicantInterview> {
    const [created] = await db.insert(applicantInterviews).values(interview).returning();
    return created;
  }

  async updateApplicantInterview(id: string, interview: Partial<InsertApplicantInterview>): Promise<ApplicantInterview> {
    const [updated] = await db
      .update(applicantInterviews)
      .set(interview)
      .where(eq(applicantInterviews.id, id))
      .returning();
    return updated;
  }

  // Background Check operations
  async createBackgroundCheck(check: InsertBackgroundCheck): Promise<BackgroundCheck> {
    const [created] = await db.insert(backgroundChecks).values(check).returning();
    return created;
  }

  async updateBackgroundCheck(id: string, check: Partial<InsertBackgroundCheck>): Promise<BackgroundCheck> {
    const [updated] = await db
      .update(backgroundChecks)
      .set({ ...check, updatedAt: new Date() })
      .where(eq(backgroundChecks.id, id))
      .returning();
    return updated;
  }

  async getBackgroundCheck(id: string): Promise<BackgroundCheck | undefined> {
    const [check] = await db.select().from(backgroundChecks).where(eq(backgroundChecks.id, id));
    return check;
  }

  async getBackgroundChecksByApplicant(applicantId: string): Promise<BackgroundCheck[]> {
    return await db
      .select()
      .from(backgroundChecks)
      .where(eq(backgroundChecks.applicantId, applicantId))
      .orderBy(desc(backgroundChecks.createdAt));
  }

  async getBackgroundChecksByCaregiver(caregiverId: string): Promise<BackgroundCheck[]> {
    return await db
      .select()
      .from(backgroundChecks)
      .where(eq(backgroundChecks.caregiverId, caregiverId))
      .orderBy(desc(backgroundChecks.createdAt));
  }

  async getExpiringBackgroundChecks(daysAhead: number): Promise<BackgroundCheck[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    const now = new Date();
    
    return await db
      .select()
      .from(backgroundChecks)
      .where(
        and(
          gte(backgroundChecks.expirationDate, now),
          lte(backgroundChecks.expirationDate, futureDate)
        )
      )
      .orderBy(asc(backgroundChecks.expirationDate));
  }

  async getPendingBackgroundChecks(): Promise<BackgroundCheck[]> {
    return await db
      .select()
      .from(backgroundChecks)
      .where(
        or(
          eq(backgroundChecks.status, 'pending'),
          eq(backgroundChecks.status, 'in_progress')
        )
      )
      .orderBy(asc(backgroundChecks.requestedDate));
  }

  async getBackgroundChecksByStatus(status: string): Promise<BackgroundCheck[]> {
    return await db
      .select()
      .from(backgroundChecks)
      .where(eq(backgroundChecks.status, status as any))
      .orderBy(desc(backgroundChecks.createdAt));
  }

  async bulkCreateBackgroundChecks(
    applicantId: string | null, 
    caregiverId: string | null, 
    checkTypes: string[], 
    requestedBy?: string
  ): Promise<BackgroundCheck[]> {
    const checksToCreate = checkTypes.map(checkType => ({
      applicantId,
      caregiverId,
      checkType: checkType as any,
      requestedDate: new Date(),
      status: 'pending' as const,
      requestedBy,
    }));
    
    const created = await db.insert(backgroundChecks).values(checksToCreate).returning();
    return created;
  }

  // Shift Differential operations
  async getShiftDifferentials(officeId?: string, mcoId?: string): Promise<ShiftDifferential[]> {
    const conditions = [];
    if (officeId) {
      conditions.push(or(eq(shiftDifferentials.officeId, officeId), sql`${shiftDifferentials.officeId} IS NULL`));
    }
    if (mcoId) {
      conditions.push(or(eq(shiftDifferentials.mcoId, mcoId), sql`${shiftDifferentials.mcoId} IS NULL`));
    }
    
    if (conditions.length > 0) {
      return await db.select().from(shiftDifferentials).where(and(...conditions)).orderBy(desc(shiftDifferentials.createdAt));
    }
    return await db.select().from(shiftDifferentials).orderBy(desc(shiftDifferentials.createdAt));
  }

  async getShiftDifferential(id: string): Promise<ShiftDifferential | undefined> {
    const [differential] = await db.select().from(shiftDifferentials).where(eq(shiftDifferentials.id, id));
    return differential;
  }

  async createShiftDifferential(differential: InsertShiftDifferential): Promise<ShiftDifferential> {
    const [created] = await db.insert(shiftDifferentials).values(differential).returning();
    return created;
  }

  async updateShiftDifferential(id: string, differential: Partial<InsertShiftDifferential>): Promise<ShiftDifferential> {
    const [updated] = await db
      .update(shiftDifferentials)
      .set({ ...differential, updatedAt: new Date() })
      .where(eq(shiftDifferentials.id, id))
      .returning();
    return updated;
  }

  async deleteShiftDifferential(id: string): Promise<void> {
    await db.delete(shiftDifferentials).where(eq(shiftDifferentials.id, id));
  }

  async getApplicableDifferentials(date: Date, startTime: string, endTime: string, officeId?: string, mcoId?: string): Promise<ShiftDifferential[]> {
    const now = date;
    const dayOfWeek = now.getDay();
    const startHour = parseInt(startTime.split(':')[0], 10);
    
    const conditions = [
      eq(shiftDifferentials.isActive, true),
      lte(shiftDifferentials.effectiveDate, now),
      or(sql`${shiftDifferentials.endDate} IS NULL`, gte(shiftDifferentials.endDate, now)),
    ];
    
    if (officeId) {
      conditions.push(or(eq(shiftDifferentials.officeId, officeId), sql`${shiftDifferentials.officeId} IS NULL`));
    }
    if (mcoId) {
      conditions.push(or(eq(shiftDifferentials.mcoId, mcoId), sql`${shiftDifferentials.mcoId} IS NULL`));
    }
    
    const allDifferentials = await db.select().from(shiftDifferentials).where(and(...conditions));
    
    const applicable: ShiftDifferential[] = [];
    const isHoliday = await this.isHolidayDate(date, officeId);
    
    for (const diff of allDifferentials) {
      const conditions = diff.conditions as any;
      let applies = false;
      
      switch (diff.type) {
        case 'weekend':
          if (conditions?.dayOfWeek) {
            applies = conditions.dayOfWeek.includes(dayOfWeek);
          } else {
            applies = dayOfWeek === 0 || dayOfWeek === 6;
          }
          break;
        case 'holiday':
          applies = isHoliday;
          break;
        case 'evening':
          if (conditions?.startHour) {
            applies = startHour >= conditions.startHour;
          } else {
            applies = startHour >= 18;
          }
          break;
        case 'night':
          if (conditions?.startHour) {
            applies = startHour >= conditions.startHour || startHour < 6;
          } else {
            applies = startHour >= 22 || startHour < 6;
          }
          break;
        case 'overtime':
        case 'on_call':
          applies = true;
          break;
      }
      
      if (applies) {
        applicable.push(diff);
      }
    }
    
    return applicable;
  }

  async calculateShiftDifferential(
    caregiverId: string, 
    date: Date, 
    startTime: string, 
    endTime: string, 
    baseRate: number
  ): Promise<{ totalPay: number; baseAmount: number; differentialAmount: number; appliedDifferentials: { name: string; type: string; amount: number }[] }> {
    const caregiver = await this.getCaregiver(caregiverId);
    const officeId = caregiver?.officeId ?? undefined;
    const mcoId = caregiver?.mcoId ?? undefined;
    
    const startParts = startTime.split(':').map(Number);
    const endParts = endTime.split(':').map(Number);
    const startMinutes = startParts[0] * 60 + startParts[1];
    let endMinutes = endParts[0] * 60 + endParts[1];
    if (endMinutes < startMinutes) endMinutes += 24 * 60;
    const hoursWorked = (endMinutes - startMinutes) / 60;
    
    const baseAmount = hoursWorked * baseRate;
    
    const applicableDifferentials = await this.getApplicableDifferentials(date, startTime, endTime, officeId, mcoId);
    
    let differentialAmount = 0;
    const appliedDifferentials: { name: string; type: string; amount: number }[] = [];
    
    for (const diff of applicableDifferentials) {
      let amount = 0;
      
      if (diff.multiplier) {
        amount = baseAmount * (parseFloat(diff.multiplier) - 1);
      } else if (diff.flatBonus) {
        amount = parseFloat(diff.flatBonus);
      }
      
      if (amount > 0) {
        differentialAmount += amount;
        appliedDifferentials.push({
          name: diff.name,
          type: diff.type,
          amount,
        });
      }
    }
    
    return {
      totalPay: baseAmount + differentialAmount,
      baseAmount,
      differentialAmount,
      appliedDifferentials,
    };
  }

  // Holiday operations
  async getHolidays(officeId?: string): Promise<Holiday[]> {
    if (officeId) {
      return await db
        .select()
        .from(holidays)
        .where(or(eq(holidays.officeId, officeId), sql`${holidays.officeId} IS NULL`))
        .orderBy(asc(holidays.date));
    }
    return await db.select().from(holidays).orderBy(asc(holidays.date));
  }

  async getHoliday(id: string): Promise<Holiday | undefined> {
    const [holiday] = await db.select().from(holidays).where(eq(holidays.id, id));
    return holiday;
  }

  async createHoliday(holiday: InsertHoliday): Promise<Holiday> {
    const [created] = await db.insert(holidays).values(holiday).returning();
    return created;
  }

  async updateHoliday(id: string, holiday: Partial<InsertHoliday>): Promise<Holiday> {
    const [updated] = await db
      .update(holidays)
      .set(holiday)
      .where(eq(holidays.id, id))
      .returning();
    return updated;
  }

  async deleteHoliday(id: string): Promise<void> {
    await db.delete(holidays).where(eq(holidays.id, id));
  }

  async isHolidayDate(date: Date, officeId?: string): Promise<boolean> {
    const allHolidays = await this.getHolidays(officeId);
    const checkMonth = date.getMonth() + 1;
    const checkDay = date.getDate();
    const checkYear = date.getFullYear();
    
    for (const h of allHolidays) {
      if (!h.isActive) continue;
      
      if (h.isRecurring && h.recurringMonth && h.recurringDay) {
        if (h.recurringMonth === checkMonth && h.recurringDay === checkDay) {
          return true;
        }
      } else if (h.date) {
        const holidayDate = new Date(h.date);
        if (
          holidayDate.getFullYear() === checkYear &&
          holidayDate.getMonth() + 1 === checkMonth &&
          holidayDate.getDate() === checkDay
        ) {
          return true;
        }
      }
      
      if (h.observedDate) {
        const observedDate = new Date(h.observedDate);
        if (
          observedDate.getFullYear() === checkYear &&
          observedDate.getMonth() + 1 === checkMonth &&
          observedDate.getDate() === checkDay
        ) {
          return true;
        }
      }
    }
    
    return false;
  }

  // Performance Review operations
  async createPerformanceReview(review: InsertPerformanceReview): Promise<PerformanceReview> {
    const [created] = await db.insert(performanceReviews).values(review).returning();
    return created;
  }

  async updatePerformanceReview(id: string, review: Partial<InsertPerformanceReview>): Promise<PerformanceReview> {
    const [updated] = await db
      .update(performanceReviews)
      .set({ ...review, updatedAt: new Date() })
      .where(eq(performanceReviews.id, id))
      .returning();
    return updated;
  }

  async getPerformanceReview(id: string): Promise<PerformanceReview | undefined> {
    const [review] = await db.select().from(performanceReviews).where(eq(performanceReviews.id, id));
    return review;
  }

  async getPerformanceReviewsByCaregiver(caregiverId: string): Promise<PerformanceReview[]> {
    return await db
      .select()
      .from(performanceReviews)
      .where(eq(performanceReviews.caregiverId, caregiverId))
      .orderBy(desc(performanceReviews.createdAt));
  }

  async getAllPerformanceReviews(): Promise<PerformanceReview[]> {
    return await db
      .select()
      .from(performanceReviews)
      .orderBy(desc(performanceReviews.createdAt));
  }

  async getUpcomingReviews(daysAhead: number): Promise<PerformanceReview[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    return await db
      .select()
      .from(performanceReviews)
      .where(and(
        eq(performanceReviews.status, 'scheduled'),
        gte(performanceReviews.scheduledDate, now),
        lte(performanceReviews.scheduledDate, futureDate)
      ))
      .orderBy(asc(performanceReviews.scheduledDate));
  }

  async acknowledgeReview(reviewId: string, caregiverId: string): Promise<PerformanceReview> {
    const [updated] = await db
      .update(performanceReviews)
      .set({
        acknowledgedAt: new Date(),
        acknowledgedBy: caregiverId,
        updatedAt: new Date(),
      })
      .where(eq(performanceReviews.id, reviewId))
      .returning();
    return updated;
  }

  // Performance Metrics operations
  async createPerformanceMetric(metric: InsertPerformanceMetric): Promise<PerformanceMetric> {
    const [created] = await db.insert(performanceMetrics).values(metric).returning();
    return created;
  }

  async getPerformanceMetrics(reviewId: string): Promise<PerformanceMetric[]> {
    return await db
      .select()
      .from(performanceMetrics)
      .where(eq(performanceMetrics.reviewId, reviewId))
      .orderBy(asc(performanceMetrics.createdAt));
  }

  async calculateOverallRating(reviewId: string): Promise<number | null> {
    const metrics = await this.getPerformanceMetrics(reviewId);
    if (metrics.length === 0) return null;
    
    let totalWeight = 0;
    let weightedSum = 0;
    
    for (const metric of metrics) {
      const weight = parseFloat(metric.weight || '1');
      totalWeight += weight;
      weightedSum += metric.rating * weight;
    }
    
    if (totalWeight === 0) return null;
    
    return Math.round((weightedSum / totalWeight) * 10) / 10;
  }

  // Time-off Request operations
  async createTimeOffRequest(request: InsertTimeOffRequest): Promise<TimeOffRequest> {
    const [created] = await db.insert(timeOffRequests).values(request).returning();
    return created;
  }

  async updateTimeOffRequest(id: string, request: Partial<InsertTimeOffRequest>): Promise<TimeOffRequest> {
    const [updated] = await db
      .update(timeOffRequests)
      .set({ ...request, updatedAt: new Date() })
      .where(eq(timeOffRequests.id, id))
      .returning();
    return updated;
  }

  async getTimeOffRequest(id: string): Promise<TimeOffRequest | undefined> {
    const [request] = await db.select().from(timeOffRequests).where(eq(timeOffRequests.id, id));
    return request;
  }

  async getTimeOffRequestsByCaregiver(caregiverId: string): Promise<TimeOffRequest[]> {
    return await db
      .select()
      .from(timeOffRequests)
      .where(eq(timeOffRequests.caregiverId, caregiverId))
      .orderBy(desc(timeOffRequests.submittedAt));
  }

  async getTimeOffRequestsByStatus(status: string): Promise<TimeOffRequest[]> {
    return await db
      .select()
      .from(timeOffRequests)
      .where(eq(timeOffRequests.status, status as any))
      .orderBy(desc(timeOffRequests.submittedAt));
  }

  async getAllTimeOffRequests(): Promise<TimeOffRequest[]> {
    return await db
      .select()
      .from(timeOffRequests)
      .orderBy(desc(timeOffRequests.submittedAt));
  }

  async approveTimeOffRequest(id: string, reviewerId: string, notes?: string): Promise<TimeOffRequest> {
    const [updated] = await db
      .update(timeOffRequests)
      .set({
        status: 'approved',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: notes,
        updatedAt: new Date(),
      })
      .where(eq(timeOffRequests.id, id))
      .returning();
    return updated;
  }

  async denyTimeOffRequest(id: string, reviewerId: string, notes?: string): Promise<TimeOffRequest> {
    const [updated] = await db
      .update(timeOffRequests)
      .set({
        status: 'denied',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: notes,
        updatedAt: new Date(),
      })
      .where(eq(timeOffRequests.id, id))
      .returning();
    return updated;
  }

  async cancelTimeOffRequest(id: string): Promise<TimeOffRequest> {
    const [updated] = await db
      .update(timeOffRequests)
      .set({
        status: 'cancelled',
        updatedAt: new Date(),
      })
      .where(eq(timeOffRequests.id, id))
      .returning();
    return updated;
  }

  // PTO Balance operations
  async getPtoBalance(caregiverId: string, year: number): Promise<PtoBalance[]> {
    return await db
      .select()
      .from(ptoBalances)
      .where(and(
        eq(ptoBalances.caregiverId, caregiverId),
        eq(ptoBalances.year, year)
      ));
  }

  async getPtoBalanceByType(caregiverId: string, year: number, ptoType: string): Promise<PtoBalance | undefined> {
    const [balance] = await db
      .select()
      .from(ptoBalances)
      .where(and(
        eq(ptoBalances.caregiverId, caregiverId),
        eq(ptoBalances.year, year),
        eq(ptoBalances.ptoType, ptoType as any)
      ));
    return balance;
  }

  async createPtoBalance(balance: InsertPtoBalance): Promise<PtoBalance> {
    const [created] = await db.insert(ptoBalances).values(balance).returning();
    return created;
  }

  async updatePtoBalance(id: string, balance: Partial<InsertPtoBalance>): Promise<PtoBalance> {
    const [updated] = await db
      .update(ptoBalances)
      .set({ ...balance, updatedAt: new Date() })
      .where(eq(ptoBalances.id, id))
      .returning();
    return updated;
  }

  async calculatePtoUsed(caregiverId: string, year: number, ptoType: string): Promise<number> {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59);
    
    const approvedRequests = await db
      .select()
      .from(timeOffRequests)
      .where(and(
        eq(timeOffRequests.caregiverId, caregiverId),
        eq(timeOffRequests.status, 'approved'),
        eq(timeOffRequests.requestType, ptoType as any),
        gte(timeOffRequests.startDate, startOfYear),
        lte(timeOffRequests.endDate, endOfYear)
      ));
    
    let totalHours = 0;
    for (const request of approvedRequests) {
      if (request.hoursRequested) {
        totalHours += parseFloat(request.hoursRequested);
      } else {
        const start = new Date(request.startDate);
        const end = new Date(request.endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        totalHours += days * 8;
      }
    }
    
    return totalHours;
  }

  // Survey Template operations
  async getSurveyTemplates(isActive?: boolean): Promise<SurveyTemplate[]> {
    if (isActive !== undefined) {
      return await db
        .select()
        .from(surveyTemplates)
        .where(eq(surveyTemplates.isActive, isActive))
        .orderBy(desc(surveyTemplates.createdAt));
    }
    return await db
      .select()
      .from(surveyTemplates)
      .orderBy(desc(surveyTemplates.createdAt));
  }

  async getSurveyTemplate(id: string): Promise<SurveyTemplate | undefined> {
    const [template] = await db.select().from(surveyTemplates).where(eq(surveyTemplates.id, id));
    return template;
  }

  async createSurveyTemplate(template: InsertSurveyTemplate): Promise<SurveyTemplate> {
    const [created] = await db.insert(surveyTemplates).values(template).returning();
    return created;
  }

  async updateSurveyTemplate(id: string, template: Partial<InsertSurveyTemplate>): Promise<SurveyTemplate> {
    const [updated] = await db
      .update(surveyTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(surveyTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteSurveyTemplate(id: string): Promise<void> {
    await db.delete(surveyTemplates).where(eq(surveyTemplates.id, id));
  }

  // Survey Response operations
  async getSurveyResponses(officeId?: string): Promise<SurveyResponse[]> {
    if (officeId) {
      return await db
        .select()
        .from(surveyResponses)
        .where(eq(surveyResponses.officeId, officeId))
        .orderBy(desc(surveyResponses.createdAt));
    }
    return await db
      .select()
      .from(surveyResponses)
      .orderBy(desc(surveyResponses.createdAt));
  }

  async getSurveyResponse(id: string): Promise<SurveyResponse | undefined> {
    const [response] = await db.select().from(surveyResponses).where(eq(surveyResponses.id, id));
    return response;
  }

  async getSurveyResponseByToken(token: string): Promise<SurveyResponse | undefined> {
    const [response] = await db
      .select()
      .from(surveyResponses)
      .where(eq(surveyResponses.accessToken, token));
    return response;
  }

  async getSurveyResponsesByClient(clientId: string): Promise<SurveyResponse[]> {
    return await db
      .select()
      .from(surveyResponses)
      .where(eq(surveyResponses.clientId, clientId))
      .orderBy(desc(surveyResponses.createdAt));
  }

  async getSurveyResponsesByCaregiver(caregiverId: string): Promise<SurveyResponse[]> {
    return await db
      .select()
      .from(surveyResponses)
      .where(eq(surveyResponses.caregiverId, caregiverId))
      .orderBy(desc(surveyResponses.createdAt));
  }

  async createSurveyResponse(response: InsertSurveyResponse): Promise<SurveyResponse> {
    const [created] = await db.insert(surveyResponses).values(response).returning();
    return created;
  }

  async updateSurveyResponse(id: string, response: Partial<InsertSurveyResponse>): Promise<SurveyResponse> {
    const [updated] = await db
      .update(surveyResponses)
      .set(response)
      .where(eq(surveyResponses.id, id))
      .returning();
    return updated;
  }

  async completeSurvey(id: string, responses: any, overallRating: number, comments?: string): Promise<SurveyResponse> {
    const [updated] = await db
      .update(surveyResponses)
      .set({
        responses,
        overallRating,
        comments,
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(surveyResponses.id, id))
      .returning();
    return updated;
  }

  async getSatisfactionStats(officeId?: string, startDate?: Date, endDate?: Date): Promise<{
    averageRating: number;
    totalResponses: number;
    completedResponses: number;
    pendingResponses: number;
    responseRate: number;
    ratingDistribution: { rating: number; count: number }[];
  }> {
    let query = db.select().from(surveyResponses);
    
    const conditions = [];
    if (officeId) {
      conditions.push(eq(surveyResponses.officeId, officeId));
    }
    if (startDate) {
      conditions.push(gte(surveyResponses.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(surveyResponses.createdAt, endDate));
    }
    
    const allResponses = conditions.length > 0 
      ? await db.select().from(surveyResponses).where(and(...conditions))
      : await db.select().from(surveyResponses);
    
    const totalResponses = allResponses.length;
    const completedResponses = allResponses.filter(r => r.status === 'completed').length;
    const pendingResponses = allResponses.filter(r => r.status === 'pending').length;
    
    const completedWithRating = allResponses.filter(r => r.status === 'completed' && r.overallRating != null);
    const averageRating = completedWithRating.length > 0
      ? completedWithRating.reduce((sum, r) => sum + (r.overallRating || 0), 0) / completedWithRating.length
      : 0;
    
    const responseRate = totalResponses > 0 ? (completedResponses / totalResponses) * 100 : 0;
    
    const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
      rating,
      count: completedWithRating.filter(r => r.overallRating === rating).length,
    }));
    
    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalResponses,
      completedResponses,
      pendingResponses,
      responseRate: Math.round(responseRate * 10) / 10,
      ratingDistribution,
    };
  }

  // Claims operations
  async getAllClaims(officeId?: string): Promise<Claim[]> {
    if (officeId) {
      return await db
        .select()
        .from(claims)
        .where(eq(claims.officeId, officeId))
        .orderBy(desc(claims.createdAt));
    }
    return await db
      .select()
      .from(claims)
      .orderBy(desc(claims.createdAt));
  }

  async getClaim(id: string): Promise<Claim | undefined> {
    const [claim] = await db.select().from(claims).where(eq(claims.id, id));
    return claim;
  }

  async createClaim(claim: InsertClaim): Promise<Claim> {
    const [created] = await db.insert(claims).values(claim).returning();
    return created;
  }

  async updateClaim(id: string, claim: Partial<InsertClaim>): Promise<Claim> {
    const [updated] = await db
      .update(claims)
      .set({ ...claim, updatedAt: new Date() })
      .where(eq(claims.id, id))
      .returning();
    return updated;
  }

  async getClaimsByClient(clientId: string): Promise<Claim[]> {
    return await db
      .select()
      .from(claims)
      .where(eq(claims.clientId, clientId))
      .orderBy(desc(claims.createdAt));
  }

  async getClaimsByStatus(status: string): Promise<Claim[]> {
    return await db
      .select()
      .from(claims)
      .where(eq(claims.status, status as any))
      .orderBy(desc(claims.createdAt));
  }

  async submitClaim(id: string): Promise<Claim> {
    const [updated] = await db
      .update(claims)
      .set({
        status: 'submitted',
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(claims.id, id))
      .returning();
    return updated;
  }

  async voidClaim(id: string, reason: string): Promise<Claim> {
    const [updated] = await db
      .update(claims)
      .set({
        status: 'void',
        notes: reason,
        updatedAt: new Date(),
      })
      .where(eq(claims.id, id))
      .returning();
    return updated;
  }

  async resubmitClaim(id: string, createdBy: string): Promise<Claim> {
    const originalClaim = await this.getClaim(id);
    if (!originalClaim) {
      throw new Error('Original claim not found');
    }

    const newClaimNumber = `${originalClaim.claimNumber}-R${(originalClaim.resubmissionCount || 0) + 1}`;
    
    await db
      .update(claims)
      .set({
        resubmissionCount: (originalClaim.resubmissionCount || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(claims.id, id));

    const [newClaim] = await db
      .insert(claims)
      .values({
        clientId: originalClaim.clientId,
        caregiverId: originalClaim.caregiverId,
        officeId: originalClaim.officeId,
        mcoId: originalClaim.mcoId,
        claimNumber: newClaimNumber,
        serviceDate: originalClaim.serviceDate,
        serviceEndDate: originalClaim.serviceEndDate,
        serviceType: originalClaim.serviceType,
        units: originalClaim.units,
        billedAmount: originalClaim.billedAmount,
        status: 'submitted',
        submittedAt: new Date(),
        originalClaimId: id,
        resubmissionCount: 0,
        notes: originalClaim.notes,
        createdBy,
      })
      .returning();

    return newClaim;
  }

  async getClaimsByDateRange(startDate: Date, endDate: Date, officeId?: string): Promise<Claim[]> {
    const conditions = [
      gte(claims.serviceDate, startDate),
      lte(claims.serviceDate, endDate),
    ];
    
    if (officeId) {
      conditions.push(eq(claims.officeId, officeId));
    }

    return await db
      .select()
      .from(claims)
      .where(and(...conditions))
      .orderBy(desc(claims.serviceDate));
  }

  async getClaimsAgingReport(officeId?: string): Promise<{
    current: { count: number; amount: number };
    days30: { count: number; amount: number };
    days60: { count: number; amount: number };
    days90: { count: number; amount: number };
    over90: { count: number; amount: number };
  }> {
    const now = new Date();
    const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const days60Ago = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const days90Ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const pendingStatuses = ['submitted', 'pending', 'partial'];
    
    let allClaims;
    if (officeId) {
      allClaims = await db
        .select()
        .from(claims)
        .where(and(
          eq(claims.officeId, officeId),
          inArray(claims.status, pendingStatuses as any)
        ));
    } else {
      allClaims = await db
        .select()
        .from(claims)
        .where(inArray(claims.status, pendingStatuses as any));
    }

    const result = {
      current: { count: 0, amount: 0 },
      days30: { count: 0, amount: 0 },
      days60: { count: 0, amount: 0 },
      days90: { count: 0, amount: 0 },
      over90: { count: 0, amount: 0 },
    };

    for (const claim of allClaims) {
      const serviceDate = new Date(claim.serviceDate);
      const amount = parseFloat(claim.billedAmount || '0');

      if (serviceDate >= days30Ago) {
        result.current.count++;
        result.current.amount += amount;
      } else if (serviceDate >= days60Ago) {
        result.days30.count++;
        result.days30.amount += amount;
      } else if (serviceDate >= days90Ago) {
        result.days60.count++;
        result.days60.amount += amount;
      } else if (serviceDate < days90Ago) {
        const daysOld = Math.floor((now.getTime() - serviceDate.getTime()) / (24 * 60 * 60 * 1000));
        if (daysOld <= 90) {
          result.days90.count++;
          result.days90.amount += amount;
        } else {
          result.over90.count++;
          result.over90.amount += amount;
        }
      }
    }

    return result;
  }

  async getClaimsSummary(officeId?: string, startDate?: Date, endDate?: Date): Promise<{
    totalClaims: number;
    totalBilled: number;
    totalApproved: number;
    totalPaid: number;
    totalDenied: number;
    byStatus: { status: string; count: number; amount: number }[];
  }> {
    const conditions = [];
    
    if (officeId) {
      conditions.push(eq(claims.officeId, officeId));
    }
    if (startDate) {
      conditions.push(gte(claims.serviceDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(claims.serviceDate, endDate));
    }

    const allClaims = conditions.length > 0
      ? await db.select().from(claims).where(and(...conditions))
      : await db.select().from(claims);

    const totalClaims = allClaims.length;
    const totalBilled = allClaims.reduce((sum, c) => sum + parseFloat(c.billedAmount || '0'), 0);
    const totalApproved = allClaims.reduce((sum, c) => sum + parseFloat(c.approvedAmount || '0'), 0);
    const totalPaid = allClaims.reduce((sum, c) => sum + parseFloat(c.paidAmount || '0'), 0);
    const deniedClaims = allClaims.filter(c => c.status === 'denied');
    const totalDenied = deniedClaims.reduce((sum, c) => sum + parseFloat(c.billedAmount || '0'), 0);

    const statusCounts: { [key: string]: { count: number; amount: number } } = {};
    for (const claim of allClaims) {
      const status = claim.status || 'unknown';
      if (!statusCounts[status]) {
        statusCounts[status] = { count: 0, amount: 0 };
      }
      statusCounts[status].count++;
      statusCounts[status].amount += parseFloat(claim.billedAmount || '0');
    }

    const byStatus = Object.entries(statusCounts).map(([status, data]) => ({
      status,
      count: data.count,
      amount: data.amount,
    }));

    return {
      totalClaims,
      totalBilled,
      totalApproved,
      totalPaid,
      totalDenied,
      byStatus,
    };
  }

  // Claim Line Items operations
  async createClaimLineItem(lineItem: InsertClaimLineItem): Promise<ClaimLineItem> {
    const [created] = await db.insert(claimLineItems).values(lineItem).returning();
    return created;
  }

  async getClaimLineItems(claimId: string): Promise<ClaimLineItem[]> {
    return await db
      .select()
      .from(claimLineItems)
      .where(eq(claimLineItems.claimId, claimId))
      .orderBy(asc(claimLineItems.createdAt));
  }

  async deleteClaimLineItem(id: string): Promise<void> {
    await db.delete(claimLineItems).where(eq(claimLineItems.id, id));
  }

  // Analytics operations
  async getActiveClientCount(officeId?: string, asOfDate?: Date): Promise<number> {
    const conditions = [eq(clients.status, 'active')];
    if (officeId) {
      conditions.push(eq(clients.officeId, officeId));
    }
    const result = await db.select({ count: count() }).from(clients).where(and(...conditions));
    return result[0]?.count || 0;
  }

  async getActiveCaregiverCount(officeId?: string, asOfDate?: Date): Promise<number> {
    const conditions = [eq(caregivers.isActive, true)];
    if (officeId) {
      conditions.push(eq(caregivers.officeId, officeId));
    }
    const result = await db.select({ count: count() }).from(caregivers).where(and(...conditions));
    return result[0]?.count || 0;
  }

  async getVisitStats(officeId?: string, startDate?: Date, endDate?: Date): Promise<{
    completed: number;
    missed: number;
    cancelled: number;
    totalHours: number;
  }> {
    const conditions = [];
    if (startDate) {
      conditions.push(gte(clientSchedules.scheduledDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(clientSchedules.scheduledDate, endDate));
    }

    let allSchedules;
    if (conditions.length > 0) {
      allSchedules = await db.select().from(clientSchedules).where(and(...conditions));
    } else {
      allSchedules = await db.select().from(clientSchedules);
    }

    if (officeId) {
      const clientIds = (await db.select({ id: clients.id }).from(clients).where(eq(clients.officeId, officeId))).map(c => c.id);
      allSchedules = allSchedules.filter(s => s.clientId && clientIds.includes(s.clientId));
    }

    const completed = allSchedules.filter(s => s.status === 'completed').length;
    const missed = allSchedules.filter(s => s.status === 'missed' || s.status === 'no_show').length;
    const cancelled = allSchedules.filter(s => s.status === 'cancelled').length;
    
    let totalHours = 0;
    for (const schedule of allSchedules.filter(s => s.status === 'completed')) {
      if (schedule.startTime && schedule.endTime) {
        const start = schedule.startTime.split(':').map(Number);
        const end = schedule.endTime.split(':').map(Number);
        const startMinutes = start[0] * 60 + start[1];
        const endMinutes = end[0] * 60 + end[1];
        totalHours += (endMinutes - startMinutes) / 60;
      }
    }

    return { completed, missed, cancelled, totalHours: Math.round(totalHours * 10) / 10 };
  }

  async getRevenueStats(officeId?: string, startDate?: Date, endDate?: Date): Promise<{
    billed: number;
    collected: number;
    outstanding: number;
  }> {
    const conditions = [];
    if (officeId) {
      conditions.push(eq(claims.officeId, officeId));
    }
    if (startDate) {
      conditions.push(gte(claims.serviceDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(claims.serviceDate, endDate));
    }

    const allClaims = conditions.length > 0
      ? await db.select().from(claims).where(and(...conditions))
      : await db.select().from(claims);

    const billed = allClaims.reduce((sum, c) => sum + parseFloat(c.billedAmount || '0'), 0);
    const collected = allClaims.reduce((sum, c) => sum + parseFloat(c.paidAmount || '0'), 0);
    const outstanding = billed - collected;

    return {
      billed: Math.round(billed * 100) / 100,
      collected: Math.round(collected * 100) / 100,
      outstanding: Math.round(outstanding * 100) / 100,
    };
  }

  async getTrainingComplianceRate(officeId?: string): Promise<number> {
    const conditions = [eq(caregivers.isActive, true)];
    if (officeId) {
      conditions.push(eq(caregivers.officeId, officeId));
    }

    const activeCaregivers = await db.select().from(caregivers).where(and(...conditions));
    if (activeCaregivers.length === 0) return 100;

    let compliantCount = 0;
    for (const caregiver of activeCaregivers) {
      const caregiverComplianceItems = await db.select().from(complianceItems).where(
        eq(complianceItems.caregiverId, caregiver.id)
      );
      const compliant = caregiverComplianceItems.every((item: any) => 
        item.status === 'compliant' || 
        (item.dueDate && new Date(item.dueDate) > new Date())
      );
      if (compliant || caregiverComplianceItems.length === 0) {
        compliantCount++;
      }
    }

    return Math.round((compliantCount / activeCaregivers.length) * 100);
  }

  async getCaregiverTurnover(officeId?: string, startDate?: Date, endDate?: Date): Promise<{
    hired: number;
    terminated: number;
    turnoverRate: number;
  }> {
    const conditions = [];
    if (officeId) {
      conditions.push(eq(caregivers.officeId, officeId));
    }

    const allCaregivers = conditions.length > 0
      ? await db.select().from(caregivers).where(and(...conditions))
      : await db.select().from(caregivers);

    const start = startDate || new Date(new Date().getFullYear(), 0, 1);
    const end = endDate || new Date();

    const hired = allCaregivers.filter(c => 
      c.hireDate && new Date(c.hireDate) >= start && new Date(c.hireDate) <= end
    ).length;

    const terminated = allCaregivers.filter(c => 
      !c.isActive && c.updatedAt && new Date(c.updatedAt) >= start && new Date(c.updatedAt) <= end
    ).length;

    const avgActiveCount = allCaregivers.filter(c => c.isActive).length || 1;
    const turnoverRate = Math.round((terminated / avgActiveCount) * 100);

    return { hired, terminated, turnoverRate };
  }

  async getMonthlyMetrics(metric: string, officeId?: string, months: number = 12): Promise<{
    month: string;
    value: number;
  }[]> {
    const results: { month: string; value: number }[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthLabel = startOfMonth.toISOString().substring(0, 7);

      let value = 0;
      
      switch (metric) {
        case 'clients':
          value = await this.getActiveClientCount(officeId, endOfMonth);
          break;
        case 'caregivers':
          value = await this.getActiveCaregiverCount(officeId, endOfMonth);
          break;
        case 'visits':
          const visitStats = await this.getVisitStats(officeId, startOfMonth, endOfMonth);
          value = visitStats.completed;
          break;
        case 'hours':
          const hourStats = await this.getVisitStats(officeId, startOfMonth, endOfMonth);
          value = hourStats.totalHours;
          break;
        case 'revenue':
          const revenueStats = await this.getRevenueStats(officeId, startOfMonth, endOfMonth);
          value = revenueStats.billed;
          break;
        case 'collections':
          const collectionStats = await this.getRevenueStats(officeId, startOfMonth, endOfMonth);
          value = collectionStats.collected;
          break;
        default:
          value = 0;
      }

      results.push({ month: monthLabel, value });
    }

    return results;
  }

  // Referral Source operations
  async getReferralSources(officeId?: string): Promise<ReferralSource[]> {
    if (officeId) {
      return await db.select().from(referralSources).where(eq(referralSources.officeId, officeId)).orderBy(desc(referralSources.createdAt));
    }
    return await db.select().from(referralSources).orderBy(desc(referralSources.createdAt));
  }

  async getReferralSource(id: string): Promise<ReferralSource | undefined> {
    const [source] = await db.select().from(referralSources).where(eq(referralSources.id, id));
    return source;
  }

  async createReferralSource(source: InsertReferralSource): Promise<ReferralSource> {
    const [created] = await db.insert(referralSources).values(source).returning();
    return created;
  }

  async updateReferralSource(id: string, source: Partial<InsertReferralSource>): Promise<ReferralSource> {
    const [updated] = await db.update(referralSources)
      .set({ ...source, updatedAt: new Date() })
      .where(eq(referralSources.id, id))
      .returning();
    return updated;
  }

  async deleteReferralSource(id: string): Promise<void> {
    await db.delete(referralSources).where(eq(referralSources.id, id));
  }

  // Client Referral operations
  async getClientReferrals(officeId?: string): Promise<ClientReferral[]> {
    if (officeId) {
      const sourcesInOffice = await db.select({ id: referralSources.id }).from(referralSources).where(eq(referralSources.officeId, officeId));
      const sourceIds = sourcesInOffice.map(s => s.id);
      if (sourceIds.length === 0) return [];
      return await db.select().from(clientReferrals).where(inArray(clientReferrals.referralSourceId, sourceIds)).orderBy(desc(clientReferrals.createdAt));
    }
    return await db.select().from(clientReferrals).orderBy(desc(clientReferrals.createdAt));
  }

  async getClientReferral(id: string): Promise<ClientReferral | undefined> {
    const [referral] = await db.select().from(clientReferrals).where(eq(clientReferrals.id, id));
    return referral;
  }

  async createClientReferral(referral: InsertClientReferral): Promise<ClientReferral> {
    const [created] = await db.insert(clientReferrals).values(referral).returning();
    return created;
  }

  async updateClientReferral(id: string, referral: Partial<InsertClientReferral>): Promise<ClientReferral> {
    const [updated] = await db.update(clientReferrals)
      .set({ ...referral, updatedAt: new Date() })
      .where(eq(clientReferrals.id, id))
      .returning();
    return updated;
  }

  async getReferralsBySource(sourceId: string): Promise<ClientReferral[]> {
    return await db.select().from(clientReferrals)
      .where(eq(clientReferrals.referralSourceId, sourceId))
      .orderBy(desc(clientReferrals.createdAt));
  }

  async convertReferral(id: string): Promise<ClientReferral> {
    const [updated] = await db.update(clientReferrals)
      .set({
        convertedToClient: true,
        conversionDate: new Date(),
        status: 'converted',
        updatedAt: new Date(),
      })
      .where(eq(clientReferrals.id, id))
      .returning();
    return updated;
  }

  async getReferralStats(officeId?: string, startDate?: Date, endDate?: Date): Promise<{
    totalReferrals: number;
    converted: number;
    lost: number;
    inProgress: number;
    conversionRate: number;
    bySource: { sourceId: string; sourceName: string; sourceType: string; total: number; converted: number; conversionRate: number }[];
  }> {
    let allReferrals = await db.select().from(clientReferrals);
    let allSources = await db.select().from(referralSources);

    if (officeId) {
      const officeSourceIds = allSources.filter(s => s.officeId === officeId).map(s => s.id);
      allReferrals = allReferrals.filter(r => officeSourceIds.includes(r.referralSourceId));
    }

    if (startDate) {
      allReferrals = allReferrals.filter(r => r.referralDate && new Date(r.referralDate) >= startDate);
    }
    if (endDate) {
      allReferrals = allReferrals.filter(r => r.referralDate && new Date(r.referralDate) <= endDate);
    }

    const totalReferrals = allReferrals.length;
    const converted = allReferrals.filter(r => r.status === 'converted').length;
    const lost = allReferrals.filter(r => r.status === 'lost').length;
    const inProgress = allReferrals.filter(r => ['new', 'contacted', 'in_progress'].includes(r.status || '')).length;
    const conversionRate = totalReferrals > 0 ? Math.round((converted / totalReferrals) * 100) : 0;

    const bySourceMap = new Map<string, { total: number; converted: number }>();
    for (const referral of allReferrals) {
      const current = bySourceMap.get(referral.referralSourceId) || { total: 0, converted: 0 };
      current.total++;
      if (referral.status === 'converted') current.converted++;
      bySourceMap.set(referral.referralSourceId, current);
    }

    const bySource = Array.from(bySourceMap.entries()).map(([sourceId, data]) => {
      const source = allSources.find(s => s.id === sourceId);
      return {
        sourceId,
        sourceName: source?.name || 'Unknown',
        sourceType: source?.type || 'other',
        total: data.total,
        converted: data.converted,
        conversionRate: data.total > 0 ? Math.round((data.converted / data.total) * 100) : 0,
      };
    });

    return { totalReferrals, converted, lost, inProgress, conversionRate, bySource };
  }

  async getTopReferralSources(officeId?: string, limit: number = 10): Promise<{ id: string; name: string; type: string; totalReferrals: number; converted: number; conversionRate: number }[]> {
    let allSources = await db.select().from(referralSources);
    if (officeId) {
      allSources = allSources.filter(s => s.officeId === officeId);
    }

    const allReferrals = await db.select().from(clientReferrals);

    const sourceStats = allSources.map(source => {
      const sourceReferrals = allReferrals.filter(r => r.referralSourceId === source.id);
      const totalReferrals = sourceReferrals.length;
      const converted = sourceReferrals.filter(r => r.status === 'converted').length;
      return {
        id: source.id,
        name: source.name,
        type: source.type,
        totalReferrals,
        converted,
        conversionRate: totalReferrals > 0 ? Math.round((converted / totalReferrals) * 100) : 0,
      };
    });

    return sourceStats
      .sort((a, b) => b.converted - a.converted || b.totalReferrals - a.totalReferrals)
      .slice(0, limit);
  }

  // HHAX Integration operations
  async getCaregiverByHhaxCode(hhaxCode: string): Promise<Caregiver | undefined> {
    const [caregiver] = await db.select().from(caregivers).where(eq(caregivers.hhaxCaregiverCode, hhaxCode));
    return caregiver;
  }

  async getClientByHhaxAdmissionId(admissionId: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.hhaxAdmissionId, admissionId));
    return client;
  }

  async getHhaxOfficeMappings(): Promise<HhaxOfficeMapping[]> {
    return db.select().from(hhaxOfficeMappings).where(eq(hhaxOfficeMappings.isActive, true));
  }

  async createHhaxOfficeMapping(mapping: InsertHhaxOfficeMapping): Promise<HhaxOfficeMapping> {
    const [created] = await db.insert(hhaxOfficeMappings).values(mapping).returning();
    return created;
  }

  async updateHhaxOfficeMapping(id: string, mapping: Partial<InsertHhaxOfficeMapping>): Promise<HhaxOfficeMapping> {
    const [updated] = await db.update(hhaxOfficeMappings)
      .set({ ...mapping, updatedAt: new Date() })
      .where(eq(hhaxOfficeMappings.id, id))
      .returning();
    return updated;
  }

  async deleteHhaxOfficeMapping(id: string): Promise<void> {
    await db.delete(hhaxOfficeMappings).where(eq(hhaxOfficeMappings.id, id));
  }

  async createHhaxSyncLog(log: InsertHhaxSyncLog): Promise<HhaxSyncLog> {
    const [created] = await db.insert(hhaxSyncLogs).values(log).returning();
    return created;
  }

  async updateHhaxSyncLog(id: string, log: Partial<InsertHhaxSyncLog>): Promise<HhaxSyncLog> {
    const [updated] = await db.update(hhaxSyncLogs)
      .set(log)
      .where(eq(hhaxSyncLogs.id, id))
      .returning();
    return updated;
  }

  async getHhaxSyncLogs(limit: number = 50): Promise<HhaxSyncLog[]> {
    return db.select().from(hhaxSyncLogs).orderBy(desc(hhaxSyncLogs.startedAt)).limit(limit);
  }

  async createSchedule(schedule: { clientId: string; caregiverId: string; officeId?: string | null; date: Date; startTime: string; endTime: string; status: string; notes?: string }): Promise<ClientSchedule> {
    const [created] = await db.insert(clientSchedules).values({
      clientId: schedule.clientId,
      caregiverId: schedule.caregiverId,
      scheduledDate: schedule.date,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      status: schedule.status,
      notes: schedule.notes || null,
    }).returning();
    return created;
  }

  // ==================== EXCLUSION VERIFICATION ====================

  // Exclusion Sources
  async getExclusionSources(): Promise<ExclusionSource[]> {
    return db.select().from(exclusionSources).orderBy(asc(exclusionSources.name));
  }

  async getExclusionSource(id: string): Promise<ExclusionSource | undefined> {
    const [source] = await db.select().from(exclusionSources).where(eq(exclusionSources.id, id));
    return source;
  }

  async getExclusionSourceByType(type: 'oig' | 'medicheck' | 'sam'): Promise<ExclusionSource | undefined> {
    const [source] = await db.select().from(exclusionSources).where(eq(exclusionSources.type, type));
    return source;
  }

  async createExclusionSource(source: InsertExclusionSource): Promise<ExclusionSource> {
    const [created] = await db.insert(exclusionSources).values(source).returning();
    return created;
  }

  async updateExclusionSource(id: string, source: Partial<InsertExclusionSource>): Promise<ExclusionSource> {
    const [updated] = await db.update(exclusionSources)
      .set({ ...source, updatedAt: new Date() })
      .where(eq(exclusionSources.id, id))
      .returning();
    return updated;
  }

  // Exclusion Records
  async getExclusionRecords(sourceId?: string, limit: number = 100, offset: number = 0): Promise<ExclusionRecord[]> {
    if (sourceId) {
      return db.select().from(exclusionRecords)
        .where(and(eq(exclusionRecords.sourceId, sourceId), eq(exclusionRecords.isActive, true)))
        .orderBy(asc(exclusionRecords.lastName), asc(exclusionRecords.firstName))
        .limit(limit).offset(offset);
    }
    return db.select().from(exclusionRecords)
      .where(eq(exclusionRecords.isActive, true))
      .orderBy(asc(exclusionRecords.lastName), asc(exclusionRecords.firstName))
      .limit(limit).offset(offset);
  }

  async getExclusionRecordsByName(lastName: string, firstName?: string): Promise<ExclusionRecord[]> {
    const lastNameLower = lastName.toLowerCase();
    if (firstName) {
      const firstNameLower = firstName.toLowerCase();
      return db.select().from(exclusionRecords)
        .where(and(
          sql`LOWER(${exclusionRecords.lastName}) = ${lastNameLower}`,
          sql`LOWER(${exclusionRecords.firstName}) = ${firstNameLower}`,
          eq(exclusionRecords.isActive, true)
        ));
    }
    return db.select().from(exclusionRecords)
      .where(and(
        sql`LOWER(${exclusionRecords.lastName}) = ${lastNameLower}`,
        eq(exclusionRecords.isActive, true)
      ));
  }

  async searchExclusionRecords(lastName: string, firstName?: string): Promise<ExclusionRecord[]> {
    const lastNamePattern = `%${lastName.toLowerCase()}%`;
    if (firstName) {
      const firstNamePattern = `%${firstName.toLowerCase()}%`;
      return db.select().from(exclusionRecords)
        .where(and(
          sql`LOWER(${exclusionRecords.lastName}) LIKE ${lastNamePattern}`,
          sql`LOWER(${exclusionRecords.firstName}) LIKE ${firstNamePattern}`,
          eq(exclusionRecords.isActive, true)
        ))
        .limit(100);
    }
    return db.select().from(exclusionRecords)
      .where(and(
        sql`LOWER(${exclusionRecords.lastName}) LIKE ${lastNamePattern}`,
        eq(exclusionRecords.isActive, true)
      ))
      .limit(100);
  }

  async createExclusionRecord(record: InsertExclusionRecord): Promise<ExclusionRecord> {
    const [created] = await db.insert(exclusionRecords).values(record).returning();
    return created;
  }

  async createExclusionRecordsBulk(records: InsertExclusionRecord[]): Promise<number> {
    if (records.length === 0) return 0;
    const batchSize = 500;
    let created = 0;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      await db.insert(exclusionRecords).values(batch);
      created += batch.length;
    }
    return created;
  }

  async deleteExclusionRecordsBySource(sourceId: string): Promise<number> {
    const result = await db.delete(exclusionRecords).where(eq(exclusionRecords.sourceId, sourceId));
    return result.rowCount || 0;
  }

  async getExclusionRecordsCount(sourceId?: string): Promise<number> {
    if (sourceId) {
      const [result] = await db.select({ count: count() }).from(exclusionRecords)
        .where(and(eq(exclusionRecords.sourceId, sourceId), eq(exclusionRecords.isActive, true)));
      return result?.count || 0;
    }
    const [result] = await db.select({ count: count() }).from(exclusionRecords)
      .where(eq(exclusionRecords.isActive, true));
    return result?.count || 0;
  }

  // Caregiver Exclusion Checks
  async getCaregiverExclusionChecks(caregiverId?: string): Promise<CaregiverExclusionCheck[]> {
    if (caregiverId) {
      return db.select().from(caregiverExclusionChecks)
        .where(eq(caregiverExclusionChecks.caregiverId, caregiverId))
        .orderBy(desc(caregiverExclusionChecks.checkedAt));
    }
    return db.select().from(caregiverExclusionChecks)
      .orderBy(desc(caregiverExclusionChecks.checkedAt))
      .limit(500);
  }

  async getCaregiverExclusionChecksByStatus(status: 'clear' | 'possible_match' | 'confirmed_excluded' | 'false_positive'): Promise<CaregiverExclusionCheck[]> {
    return db.select().from(caregiverExclusionChecks)
      .where(eq(caregiverExclusionChecks.status, status))
      .orderBy(desc(caregiverExclusionChecks.checkedAt));
  }

  async getLatestCaregiverExclusionCheck(caregiverId: string, sourceId: string): Promise<CaregiverExclusionCheck | undefined> {
    const [check] = await db.select().from(caregiverExclusionChecks)
      .where(and(
        eq(caregiverExclusionChecks.caregiverId, caregiverId),
        eq(caregiverExclusionChecks.sourceId, sourceId)
      ))
      .orderBy(desc(caregiverExclusionChecks.checkedAt))
      .limit(1);
    return check;
  }

  async createCaregiverExclusionCheck(check: InsertCaregiverExclusionCheck): Promise<CaregiverExclusionCheck> {
    const [created] = await db.insert(caregiverExclusionChecks).values(check).returning();
    return created;
  }

  async updateCaregiverExclusionCheck(id: string, check: Partial<InsertCaregiverExclusionCheck>): Promise<CaregiverExclusionCheck> {
    const [updated] = await db.update(caregiverExclusionChecks)
      .set({ ...check, updatedAt: new Date() })
      .where(eq(caregiverExclusionChecks.id, id))
      .returning();
    return updated;
  }

  // Caregiver Exclusion False Positives
  async getCaregiverFalsePositives(caregiverId?: string): Promise<CaregiverExclusionFalsePositive[]> {
    if (caregiverId) {
      return db.select().from(caregiverExclusionFalsePositives)
        .where(eq(caregiverExclusionFalsePositives.caregiverId, caregiverId))
        .orderBy(desc(caregiverExclusionFalsePositives.createdAt));
    }
    return db.select().from(caregiverExclusionFalsePositives)
      .orderBy(desc(caregiverExclusionFalsePositives.createdAt));
  }

  async getFalsePositiveBySignature(matchSignature: string): Promise<CaregiverExclusionFalsePositive | undefined> {
    const [fp] = await db.select().from(caregiverExclusionFalsePositives)
      .where(eq(caregiverExclusionFalsePositives.matchSignature, matchSignature));
    return fp;
  }

  async createCaregiverFalsePositive(fp: InsertCaregiverExclusionFalsePositive): Promise<CaregiverExclusionFalsePositive> {
    const [created] = await db.insert(caregiverExclusionFalsePositives).values(fp).returning();
    return created;
  }

  async deleteCaregiverFalsePositive(id: string): Promise<void> {
    await db.delete(caregiverExclusionFalsePositives).where(eq(caregiverExclusionFalsePositives.id, id));
  }

  // Exclusion Reports
  async getExclusionReports(limit: number = 12): Promise<ExclusionReport[]> {
    return db.select().from(exclusionReports)
      .orderBy(desc(exclusionReports.reportMonth))
      .limit(limit);
  }

  async getExclusionReport(id: string): Promise<ExclusionReport | undefined> {
    const [report] = await db.select().from(exclusionReports).where(eq(exclusionReports.id, id));
    return report;
  }

  async getExclusionReportByMonth(month: Date): Promise<ExclusionReport | undefined> {
    const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const [report] = await db.select().from(exclusionReports)
      .where(and(
        gte(exclusionReports.reportMonth, startOfMonth),
        lte(exclusionReports.reportMonth, endOfMonth)
      ));
    return report;
  }

  async createExclusionReport(report: InsertExclusionReport): Promise<ExclusionReport> {
    const [created] = await db.insert(exclusionReports).values(report).returning();
    return created;
  }

  async updateExclusionReport(id: string, report: Partial<InsertExclusionReport>): Promise<ExclusionReport> {
    const [updated] = await db.update(exclusionReports)
      .set(report)
      .where(eq(exclusionReports.id, id))
      .returning();
    return updated;
  }

  // Get all active caregivers for exclusion checking
  async getActiveCaregiversForExclusionCheck(): Promise<{ id: string; firstName: string | null; lastName: string | null; dateOfBirth: Date | null }[]> {
    return db.select({
      id: caregivers.id,
      firstName: caregivers.firstName,
      lastName: caregivers.lastName,
      dateOfBirth: caregivers.dateOfBirth,
    }).from(caregivers).where(eq(caregivers.isActive, true));
  }

  // ============================================
  // Organizations (Multi-tenant SaaS)
  // ============================================
  
  async getOrganizations(): Promise<Organization[]> {
    return db.select().from(organizations).orderBy(desc(organizations.createdAt));
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async getOrganizationBySlug(slug: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug));
    return org;
  }

  async getOrganizationByStripeCustomerId(stripeCustomerId: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.stripeCustomerId, stripeCustomerId));
    return org;
  }

  async getOrganizationByStripeSubscriptionId(stripeSubscriptionId: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.stripeSubscriptionId, stripeSubscriptionId));
    return org;
  }

  async createOrganization(org: InsertOrganization): Promise<Organization> {
    const [created] = await db.insert(organizations).values(org).returning();
    return created;
  }

  async updateOrganization(id: string, org: Partial<InsertOrganization>): Promise<Organization> {
    const [updated] = await db.update(organizations)
      .set({ ...org, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return updated;
  }

  async updateOrganizationSubscription(id: string, data: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionPlanId?: string;
    subscriptionStatus?: string;
    status?: 'pending' | 'active' | 'suspended' | 'cancelled';
    clientLimit?: number;
  }): Promise<Organization> {
    const [updated] = await db.update(organizations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();
    return updated;
  }

  async updateOrganizationClientCount(id: string): Promise<void> {
    const org = await this.getOrganization(id);
    if (!org) return;
    
    const clientCount = await db.select({ count: sql<number>`count(*)` })
      .from(clients)
      .innerJoin(offices, eq(clients.officeId, offices.id))
      .where(eq(offices.organizationId, id));
    
    await db.update(organizations)
      .set({ currentClientCount: Number(clientCount[0]?.count || 0), updatedAt: new Date() })
      .where(eq(organizations.id, id));
  }

  // ============================================
  // Subscription Plans
  // ============================================

  async getSubscriptionPlans(activeOnly: boolean = true): Promise<SubscriptionPlan[]> {
    if (activeOnly) {
      return db.select().from(subscriptionPlans)
        .where(eq(subscriptionPlans.isActive, true))
        .orderBy(subscriptionPlans.sortOrder);
    }
    return db.select().from(subscriptionPlans).orderBy(subscriptionPlans.sortOrder);
  }

  async getSubscriptionPlan(id: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id));
    return plan;
  }

  async getSubscriptionPlanByStripePriceId(stripePriceId: string): Promise<SubscriptionPlan | undefined> {
    const [plan] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.stripePriceId, stripePriceId));
    return plan;
  }

  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const [created] = await db.insert(subscriptionPlans).values(plan).returning();
    return created;
  }

  async updateSubscriptionPlan(id: string, plan: Partial<InsertSubscriptionPlan>): Promise<SubscriptionPlan> {
    const [updated] = await db.update(subscriptionPlans)
      .set({ ...plan, updatedAt: new Date() })
      .where(eq(subscriptionPlans.id, id))
      .returning();
    return updated;
  }

  // ============================================
  // Subscription History
  // ============================================

  async getSubscriptionHistory(organizationId: string): Promise<SubscriptionHistoryRecord[]> {
    return db.select().from(subscriptionHistory)
      .where(eq(subscriptionHistory.organizationId, organizationId))
      .orderBy(desc(subscriptionHistory.createdAt));
  }

  async createSubscriptionHistory(record: InsertSubscriptionHistoryRecord): Promise<SubscriptionHistoryRecord> {
    const [created] = await db.insert(subscriptionHistory).values(record).returning();
    return created;
  }

  // ============================================
  // API Keys
  // ============================================

  async createApiKey(data: InsertApiKey): Promise<ApiKey> {
    const [created] = await db.insert(apiKeys).values(data).returning();
    return created;
  }

  async getApiKeysByOrganization(organizationId: string): Promise<ApiKey[]> {
    return db.select().from(apiKeys)
      .where(eq(apiKeys.organizationId, organizationId))
      .orderBy(desc(apiKeys.createdAt));
  }

  async getApiKeyByPrefix(prefix: string): Promise<ApiKey | null> {
    const [key] = await db.select().from(apiKeys)
      .where(and(
        eq(apiKeys.keyPrefix, prefix),
        eq(apiKeys.isActive, true)
      ));
    return key || null;
  }

  async updateApiKey(id: string, data: Partial<ApiKey>): Promise<ApiKey> {
    const [updated] = await db.update(apiKeys)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(apiKeys.id, id))
      .returning();
    return updated;
  }

  async deleteApiKey(id: string): Promise<void> {
    await db.delete(apiKeys).where(eq(apiKeys.id, id));
  }

  async incrementApiKeyRequestCount(id: string): Promise<void> {
    await db.update(apiKeys)
      .set({ 
        requestCount: sql`${apiKeys.requestCount} + 1`,
        lastUsedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(apiKeys.id, id));
  }

  // ============================================
  // API Usage Logs
  // ============================================

  async createApiUsageLog(data: InsertApiUsageLog): Promise<ApiUsageLog> {
    const [created] = await db.insert(apiUsageLogs).values(data).returning();
    return created;
  }

  async getApiUsageLogsByOrganization(organizationId: string, startDate?: Date, endDate?: Date): Promise<ApiUsageLog[]> {
    const conditions = [eq(apiUsageLogs.organizationId, organizationId)];
    if (startDate) conditions.push(gte(apiUsageLogs.createdAt, startDate));
    if (endDate) conditions.push(lte(apiUsageLogs.createdAt, endDate));
    
    return db.select().from(apiUsageLogs)
      .where(and(...conditions))
      .orderBy(desc(apiUsageLogs.createdAt))
      .limit(1000);
  }

  async getApiUsageCountToday(organizationId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [result] = await db.select({ count: count() })
      .from(apiUsageLogs)
      .where(and(
        eq(apiUsageLogs.organizationId, organizationId),
        gte(apiUsageLogs.createdAt, today)
      ));
    
    return result?.count ?? 0;
  }

  // ============================================
  // Support Tickets
  // ============================================

  async createSupportTicket(data: InsertSupportTicket): Promise<SupportTicket> {
    const [created] = await db.insert(supportTickets).values(data).returning();
    return created;
  }

  async getSupportTicketsByOrganization(organizationId: string): Promise<SupportTicket[]> {
    return db.select().from(supportTickets)
      .where(eq(supportTickets.organizationId, organizationId))
      .orderBy(desc(supportTickets.createdAt));
  }

  async getSupportTicket(id: string): Promise<SupportTicket | null> {
    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
    return ticket || null;
  }

  async updateSupportTicket(id: string, data: Partial<SupportTicket>): Promise<SupportTicket> {
    const [updated] = await db.update(supportTickets)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(supportTickets.id, id))
      .returning();
    return updated;
  }

  async createTicketMessage(data: InsertTicketMessage): Promise<TicketMessage> {
    const [created] = await db.insert(ticketMessages).values(data).returning();
    return created;
  }

  async getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
    return db.select().from(ticketMessages)
      .where(eq(ticketMessages.ticketId, ticketId))
      .orderBy(asc(ticketMessages.createdAt));
  }

  // ============================================
  // Custom Integrations
  // ============================================

  async createCustomIntegration(data: InsertCustomIntegration): Promise<CustomIntegration> {
    const [created] = await db.insert(customIntegrations).values(data).returning();
    return created;
  }

  async getCustomIntegrationsByOrganization(organizationId: string): Promise<CustomIntegration[]> {
    return db.select().from(customIntegrations)
      .where(eq(customIntegrations.organizationId, organizationId))
      .orderBy(desc(customIntegrations.createdAt));
  }

  async getCustomIntegration(id: string): Promise<CustomIntegration | null> {
    const [integration] = await db.select().from(customIntegrations).where(eq(customIntegrations.id, id));
    return integration || null;
  }

  async updateCustomIntegration(id: string, data: Partial<CustomIntegration>): Promise<CustomIntegration> {
    const [updated] = await db.update(customIntegrations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customIntegrations.id, id))
      .returning();
    return updated;
  }

  async deleteCustomIntegration(id: string): Promise<void> {
    await db.delete(customIntegrations).where(eq(customIntegrations.id, id));
  }

  // Letter Template operations
  async getLetterTemplates(officeId?: string): Promise<LetterTemplate[]> {
    if (officeId) {
      return db.select().from(letterTemplates)
        .where(eq(letterTemplates.officeId, officeId))
        .orderBy(desc(letterTemplates.updatedAt));
    }
    return db.select().from(letterTemplates).orderBy(desc(letterTemplates.updatedAt));
  }

  async getLetterTemplate(id: string): Promise<LetterTemplate | undefined> {
    const [template] = await db.select().from(letterTemplates).where(eq(letterTemplates.id, id));
    return template;
  }

  async createLetterTemplate(template: InsertLetterTemplate): Promise<LetterTemplate> {
    const [created] = await db.insert(letterTemplates).values(template).returning();
    return created;
  }

  async updateLetterTemplate(id: string, template: Partial<InsertLetterTemplate>): Promise<LetterTemplate> {
    const [updated] = await db.update(letterTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(letterTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteLetterTemplate(id: string): Promise<void> {
    await db.delete(letterTemplates).where(eq(letterTemplates.id, id));
  }

  async getLetterTemplatesByScope(scope: string, officeId?: string): Promise<LetterTemplate[]> {
    if (officeId) {
      return db.select().from(letterTemplates)
        .where(and(
          eq(letterTemplates.scope, scope as any),
          eq(letterTemplates.officeId, officeId)
        ))
        .orderBy(letterTemplates.name);
    }
    return db.select().from(letterTemplates)
      .where(eq(letterTemplates.scope, scope as any))
      .orderBy(letterTemplates.name);
  }

  // Letter Template Version operations
  async getLetterTemplateVersions(templateId: string): Promise<LetterTemplateVersion[]> {
    return db.select().from(letterTemplateVersions)
      .where(eq(letterTemplateVersions.templateId, templateId))
      .orderBy(desc(letterTemplateVersions.versionNumber));
  }

  async createLetterTemplateVersion(version: InsertLetterTemplateVersion): Promise<LetterTemplateVersion> {
    const [created] = await db.insert(letterTemplateVersions).values(version).returning();
    return created;
  }

  // Generated Letter operations
  async createGeneratedLetter(letter: InsertGeneratedLetter): Promise<GeneratedLetter> {
    const [created] = await db.insert(generatedLetters).values(letter).returning();
    return created;
  }

  async getGeneratedLettersByTarget(scope: string, targetId: string): Promise<GeneratedLetter[]> {
    return db.select().from(generatedLetters)
      .where(and(
        eq(generatedLetters.scope, scope as any),
        eq(generatedLetters.targetId, targetId)
      ))
      .orderBy(desc(generatedLetters.createdAt));
  }

  // Coordinator Pay Record operations
  async getCoordinatorPayRecords(officeId?: string, year?: number, quarter?: number): Promise<CoordinatorPayRecord[]> {
    const conditions = [];
    if (officeId) conditions.push(eq(coordinatorPayRecords.officeId, officeId));
    if (year) conditions.push(eq(coordinatorPayRecords.year, year));
    if (quarter) conditions.push(eq(coordinatorPayRecords.quarter, quarter));
    
    if (conditions.length > 0) {
      return db.select().from(coordinatorPayRecords).where(and(...conditions)).orderBy(desc(coordinatorPayRecords.payDateStart));
    }
    return db.select().from(coordinatorPayRecords).orderBy(desc(coordinatorPayRecords.payDateStart));
  }

  async getCoordinatorPayRecord(id: string): Promise<CoordinatorPayRecord | undefined> {
    const [record] = await db.select().from(coordinatorPayRecords).where(eq(coordinatorPayRecords.id, id));
    return record;
  }

  async getCoordinatorPayRecordsByCoordinator(coordinatorId: string): Promise<CoordinatorPayRecord[]> {
    return db.select().from(coordinatorPayRecords)
      .where(eq(coordinatorPayRecords.coordinatorId, coordinatorId))
      .orderBy(desc(coordinatorPayRecords.payDateStart));
  }

  async createCoordinatorPayRecord(record: InsertCoordinatorPayRecord): Promise<CoordinatorPayRecord> {
    const [newRecord] = await db.insert(coordinatorPayRecords).values(record).returning();
    return newRecord;
  }

  async updateCoordinatorPayRecord(id: string, record: Partial<InsertCoordinatorPayRecord>): Promise<CoordinatorPayRecord> {
    const [updated] = await db.update(coordinatorPayRecords)
      .set({ ...record, updatedAt: new Date() })
      .where(eq(coordinatorPayRecords.id, id))
      .returning();
    return updated;
  }

  async deleteCoordinatorPayRecord(id: string): Promise<void> {
    await db.delete(coordinatorPayRecords).where(eq(coordinatorPayRecords.id, id));
  }

  // Email Template operations
  async getEmailTemplates(): Promise<EmailTemplate[]> {
    return db.select().from(emailTemplates).orderBy(asc(emailTemplates.type));
  }

  async getEmailTemplate(id: string): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
    return template;
  }

  async getEmailTemplateByType(type: string): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates)
      .where(and(eq(emailTemplates.type, type as any), eq(emailTemplates.isActive, true)))
      .orderBy(desc(emailTemplates.isDefault));
    return template;
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [newTemplate] = await db.insert(emailTemplates).values(template).returning();
    return newTemplate;
  }

  async updateEmailTemplate(id: string, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate> {
    const [updated] = await db.update(emailTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(emailTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteEmailTemplate(id: string): Promise<void> {
    await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
  }

  // Shift Swap Request operations
  async getShiftSwapRequests(filters?: { status?: string; officeId?: string; caregiverId?: string }): Promise<ShiftSwapRequest[]> {
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(shiftSwapRequests.status, filters.status as any));
    }
    if (filters?.officeId) {
      conditions.push(eq(shiftSwapRequests.officeId, filters.officeId));
    }
    if (filters?.caregiverId) {
      conditions.push(eq(shiftSwapRequests.requestingCaregiverId, filters.caregiverId));
    }
    
    if (conditions.length > 0) {
      return db.select().from(shiftSwapRequests).where(and(...conditions)).orderBy(desc(shiftSwapRequests.createdAt));
    }
    return db.select().from(shiftSwapRequests).orderBy(desc(shiftSwapRequests.createdAt));
  }

  async getShiftSwapRequest(id: string): Promise<ShiftSwapRequest | undefined> {
    const [request] = await db.select().from(shiftSwapRequests).where(eq(shiftSwapRequests.id, id));
    return request;
  }

  async createShiftSwapRequest(request: InsertShiftSwapRequest): Promise<ShiftSwapRequest> {
    const [created] = await db.insert(shiftSwapRequests).values(request).returning();
    return created;
  }

  async updateShiftSwapRequest(id: string, request: Partial<InsertShiftSwapRequest>): Promise<ShiftSwapRequest> {
    const [updated] = await db.update(shiftSwapRequests)
      .set({ ...request, updatedAt: new Date() })
      .where(eq(shiftSwapRequests.id, id))
      .returning();
    return updated;
  }

  async approveShiftSwapRequest(id: string, reviewedBy: string, notes?: string): Promise<ShiftSwapRequest> {
    const request = await this.getShiftSwapRequest(id);
    if (!request) {
      throw new Error("Shift swap request not found");
    }
    
    const [updated] = await db.update(shiftSwapRequests)
      .set({
        status: "approved",
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes: notes,
        updatedAt: new Date(),
      })
      .where(eq(shiftSwapRequests.id, id))
      .returning();
    
    if (request.targetCaregiverId) {
      await db.update(caregiverSchedules)
        .set({
          caregiverId: request.targetCaregiverId,
          updatedAt: new Date(),
        })
        .where(eq(caregiverSchedules.id, request.scheduleId));
    }
    
    return updated;
  }

  async rejectShiftSwapRequest(id: string, reviewedBy: string, notes?: string): Promise<ShiftSwapRequest> {
    const [updated] = await db.update(shiftSwapRequests)
      .set({
        status: "rejected",
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes: notes,
        updatedAt: new Date(),
      })
      .where(eq(shiftSwapRequests.id, id))
      .returning();
    return updated;
  }

  async cancelShiftSwapRequest(id: string): Promise<ShiftSwapRequest> {
    const [updated] = await db.update(shiftSwapRequests)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(shiftSwapRequests.id, id))
      .returning();
    return updated;
  }

  // E-Signature Template operations
  async getESignatureTemplates(filters?: { officeId?: string; status?: string }): Promise<ESignatureTemplate[]> {
    const conditions = [];
    if (filters?.officeId) {
      conditions.push(eq(eSignatureTemplates.officeId, filters.officeId));
    }
    if (filters?.status) {
      conditions.push(eq(eSignatureTemplates.status, filters.status as any));
    }
    
    if (conditions.length > 0) {
      return db.select().from(eSignatureTemplates).where(and(...conditions)).orderBy(desc(eSignatureTemplates.createdAt));
    }
    return db.select().from(eSignatureTemplates).orderBy(desc(eSignatureTemplates.createdAt));
  }

  async getESignatureTemplate(id: string): Promise<ESignatureTemplate | undefined> {
    const [template] = await db.select().from(eSignatureTemplates).where(eq(eSignatureTemplates.id, id));
    return template;
  }

  async createESignatureTemplate(template: InsertESignatureTemplate): Promise<ESignatureTemplate> {
    const [created] = await db.insert(eSignatureTemplates).values(template).returning();
    return created;
  }

  async updateESignatureTemplate(id: string, template: Partial<InsertESignatureTemplate>): Promise<ESignatureTemplate> {
    const [updated] = await db.update(eSignatureTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(eSignatureTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteESignatureTemplate(id: string): Promise<void> {
    await db.delete(eSignatureTemplates).where(eq(eSignatureTemplates.id, id));
  }

  // E-Signature Request operations
  async getESignatureRequests(filters?: { status?: string; sentBy?: string }): Promise<ESignatureRequest[]> {
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(eSignatureRequests.status, filters.status as any));
    }
    if (filters?.sentBy) {
      conditions.push(eq(eSignatureRequests.sentBy, filters.sentBy));
    }
    
    if (conditions.length > 0) {
      return db.select().from(eSignatureRequests).where(and(...conditions)).orderBy(desc(eSignatureRequests.createdAt));
    }
    return db.select().from(eSignatureRequests).orderBy(desc(eSignatureRequests.createdAt));
  }

  async getESignatureRequest(id: string): Promise<ESignatureRequest | undefined> {
    const [request] = await db.select().from(eSignatureRequests).where(eq(eSignatureRequests.id, id));
    return request;
  }

  async getESignatureRequestByToken(token: string): Promise<ESignatureRequest | undefined> {
    const [request] = await db.select().from(eSignatureRequests).where(eq(eSignatureRequests.accessToken, token));
    return request;
  }

  async createESignatureRequest(request: InsertESignatureRequest): Promise<ESignatureRequest> {
    const [created] = await db.insert(eSignatureRequests).values(request).returning();
    return created;
  }

  async updateESignatureRequest(id: string, request: Partial<InsertESignatureRequest>): Promise<ESignatureRequest> {
    const [updated] = await db.update(eSignatureRequests)
      .set({ ...request, updatedAt: new Date() })
      .where(eq(eSignatureRequests.id, id))
      .returning();
    return updated;
  }

  // Help Article operations
  async getHelpArticles(filters?: { category?: string; published?: boolean }): Promise<HelpArticle[]> {
    const conditions = [];
    if (filters?.category) conditions.push(eq(helpArticles.category, filters.category));
    if (filters?.published !== undefined) conditions.push(eq(helpArticles.isPublished, filters.published));
    const query = db.select().from(helpArticles);
    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(asc(helpArticles.order), desc(helpArticles.createdAt));
    }
    return await query.orderBy(asc(helpArticles.order), desc(helpArticles.createdAt));
  }

  async getHelpArticle(id: string): Promise<HelpArticle | undefined> {
    const [article] = await db.select().from(helpArticles).where(eq(helpArticles.id, id));
    return article;
  }

  async getHelpArticleBySlug(slug: string): Promise<HelpArticle | undefined> {
    const [article] = await db.select().from(helpArticles).where(eq(helpArticles.slug, slug));
    return article;
  }

  async createHelpArticle(article: InsertHelpArticle): Promise<HelpArticle> {
    const [created] = await db.insert(helpArticles).values(article).returning();
    return created;
  }

  async updateHelpArticle(id: string, article: Partial<InsertHelpArticle>): Promise<HelpArticle> {
    const [updated] = await db.update(helpArticles)
      .set({ ...article, updatedAt: new Date() })
      .where(eq(helpArticles.id, id))
      .returning();
    return updated;
  }

  async deleteHelpArticle(id: string): Promise<void> {
    await db.delete(helpArticles).where(eq(helpArticles.id, id));
  }

  async incrementHelpArticleViewCount(id: string): Promise<void> {
    await db.update(helpArticles)
      .set({ viewCount: sql`${helpArticles.viewCount} + 1` })
      .where(eq(helpArticles.id, id));
  }
}

export const storage = new DatabaseStorage();

// In-memory error log storage for AI diagnosis (last 100 errors)
// HIPAA COMPLIANCE: requestBody intentionally excluded - may contain PHI/PII
export interface ApiErrorLog {
  id: string;
  timestamp: Date;
  endpoint: string;
  method: string;
  errorMessage: string;
  statusCode?: number;
  userId?: string;
}

class ErrorLogStorage {
  private errors: ApiErrorLog[] = [];
  private maxErrors = 500;

  logError(error: Omit<ApiErrorLog, 'id' | 'timestamp'>): ApiErrorLog {
    const logEntry: ApiErrorLog = {
      ...error,
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    
    this.errors.unshift(logEntry);
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }
    
    return logEntry;
  }

  getRecentErrors(limit: number = 10): ApiErrorLog[] {
    return this.errors.slice(0, limit);
  }

  getErrorById(id: string): ApiErrorLog | undefined {
    return this.errors.find(e => e.id === id);
  }

  deleteErrors(ids: string[]): void {
    const idSet = new Set(ids);
    this.errors = this.errors.filter(e => !idSet.has(e.id));
  }

  clearErrors(): void {
    this.errors = [];
  }
}

export const errorLogStorage = new ErrorLogStorage();
