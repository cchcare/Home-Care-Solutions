import {
  users,
  offices,
  clients,
  caregivers,
  carePlans,
  progressNotes,
  documents,
  incidentReports,
  tasks,
  messages,
  certifications,
  complianceItems,
  auditLogs,
  trainings,
  trainingRecords,
  files,
  familyMembers,
  clientFamilyMembers,
  familyUpdates,
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
  type ProgressNote,
  type InsertProgressNote,
  type Document,
  type InsertDocument,
  type IncidentReport,
  type InsertIncidentReport,
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
  caregiverCompliance,
  type CaregiverCompliance,
  type InsertCaregiverCompliance,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, count, sql, like, gte, lte, inArray } from "drizzle-orm";

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

  // Office operations
  getAllOffices(): Promise<Office[]>;
  getOffice(id: string): Promise<Office | undefined>;
  createOffice(office: InsertOffice): Promise<Office>;
  updateOffice(id: string, office: Partial<InsertOffice>): Promise<Office>;
  deleteOffice(id: string): Promise<void>;

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
  createCaregiverAvailability(availability: InsertCaregiverAvailability): Promise<CaregiverAvailability>;
  updateCaregiverAvailability(id: string, availability: Partial<InsertCaregiverAvailability>): Promise<CaregiverAvailability>;
  deleteCaregiverAvailability(id: string): Promise<void>;

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
  createCaregiverSchedule(schedule: InsertCaregiverSchedule): Promise<CaregiverSchedule>;
  updateCaregiverSchedule(id: string, schedule: Partial<InsertCaregiverSchedule>): Promise<CaregiverSchedule>;
  deleteCaregiverSchedule(id: string): Promise<void>;

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
  createEligibilityCheck(check: InsertEligibilityCheck): Promise<EligibilityCheck>;
  updateEligibilityCheck(id: string, check: Partial<InsertEligibilityCheck>): Promise<EligibilityCheck>;
  deleteEligibilityCheck(id: string): Promise<void>;

  // Caregiver Compliance operations
  getCaregiverComplianceByCaregiver(caregiverId: string): Promise<CaregiverCompliance[]>;
  getCaregiverCompliance(id: string): Promise<CaregiverCompliance | undefined>;
  createCaregiverCompliance(compliance: InsertCaregiverCompliance): Promise<CaregiverCompliance>;
  updateCaregiverCompliance(id: string, compliance: Partial<InsertCaregiverCompliance>): Promise<CaregiverCompliance>;
  deleteCaregiverCompliance(id: string): Promise<void>;
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

  // Progress notes operations
  async getProgressNotesByClient(clientId: string): Promise<ProgressNote[]> {
    return await db
      .select()
      .from(progressNotes)
      .where(eq(progressNotes.clientId, clientId))
      .orderBy(desc(progressNotes.visitDate));
  }

  async createProgressNote(note: InsertProgressNote): Promise<ProgressNote> {
    const [newNote] = await db.insert(progressNotes).values(note).returning();
    return newNote;
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
    if (officeId) {
      return await db
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
    }
    return await db
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

    return await db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt));
  }

  async getReceivedMessagesByUser(userId: string, status?: string): Promise<Message[]> {
    const conditions = [eq(messages.recipientId, userId)];
    if (status) {
      conditions.push(eq(messages.recipientStatus, status as any));
    }

    return await db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
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
    const [updated] = await db
      .update(messages)
      .set(data)
      .where(eq(messages.id, id))
      .returning();
    return updated;
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
    return await db.select().from(clientCommunications)
      .where(eq(clientCommunications.clientId, clientId))
      .orderBy(desc(clientCommunications.createdAt));
  }

  async createClientCommunication(communication: InsertClientCommunication): Promise<ClientCommunication> {
    const [newCommunication] = await db.insert(clientCommunications).values(communication).returning();
    return newCommunication;
  }

  async updateClientCommunication(id: string, communication: Partial<InsertClientCommunication>): Promise<ClientCommunication> {
    const [updatedCommunication] = await db
      .update(clientCommunications)
      .set({ ...communication, updatedAt: new Date() })
      .where(eq(clientCommunications.id, id))
      .returning();
    return updatedCommunication;
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
    return await db.select().from(caregiverNotes).where(eq(caregiverNotes.caregiverId, caregiverId)).orderBy(desc(caregiverNotes.createdAt));
  }

  async createCaregiverNote(note: InsertCaregiverNote): Promise<CaregiverNote> {
    const [created] = await db.insert(caregiverNotes).values(note).returning();
    return created;
  }

  async updateCaregiverNote(id: string, note: Partial<InsertCaregiverNote>): Promise<CaregiverNote> {
    const [updated] = await db.update(caregiverNotes).set({ ...note, updatedAt: new Date() }).where(eq(caregiverNotes.id, id)).returning();
    return updated;
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
  private maxErrors = 100;

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

  clearErrors(): void {
    this.errors = [];
  }
}

export const errorLogStorage = new ErrorLogStorage();
