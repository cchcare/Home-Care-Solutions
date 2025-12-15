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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, count, sql, like, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Office operations
  getAllOffices(): Promise<Office[]>;
  getOffice(id: string): Promise<Office | undefined>;
  createOffice(office: InsertOffice): Promise<Office>;
  updateOffice(id: string, office: Partial<InsertOffice>): Promise<Office>;
  deleteOffice(id: string): Promise<void>;

  // Client operations
  getAllClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: string): Promise<void>;
  searchClients(searchTerm: string): Promise<Client[]>;

  // Caregiver operations
  getAllCaregivers(): Promise<Caregiver[]>;
  getCaregiver(id: string): Promise<Caregiver | undefined>;
  getCaregiverByUserId(userId: string): Promise<Caregiver | undefined>;
  createCaregiver(caregiver: InsertCaregiver): Promise<Caregiver>;
  updateCaregiver(id: string, caregiver: Partial<InsertCaregiver>): Promise<Caregiver>;
  deleteCaregiver(id: string): Promise<void>;
  
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
  getAllDocuments(): Promise<Document[]>;
  getDocumentsByClient(clientId: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, document: Partial<InsertDocument>): Promise<Document>;
  deleteDocument(id: string): Promise<void>;

  // Incident report operations
  getAllIncidentReports(): Promise<IncidentReport[]>;
  createIncidentReport(report: InsertIncidentReport): Promise<IncidentReport>;
  updateIncidentReport(id: string, report: Partial<InsertIncidentReport>): Promise<IncidentReport>;

  // Task operations
  getAllTasks(): Promise<Task[]>;
  getTasksByUser(userId: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: string): Promise<void>;

  // Message operations
  getMessagesByUser(userId: string): Promise<Message[]>;
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
  getDashboardMetrics(): Promise<{
    activeClients: number;
    activeCaregivers: number;
    pendingTasks: number;
    complianceRate: number;
    criticalAlerts: number;
  }>;

  // Audit logging
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;


  // Training operations
  getAllTrainings(): Promise<Training[]>;
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

  // Incident report operations
  getAllIncidentReports(): Promise<IncidentReport[]>;
  getIncidentReport(id: string): Promise<IncidentReport | undefined>;
  createIncidentReport(report: InsertIncidentReport): Promise<IncidentReport>;
  updateIncidentReport(id: string, report: Partial<InsertIncidentReport>): Promise<IncidentReport>;

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
  applyMasterWeekToSchedules(templateId: string, weekStartDate: Date): Promise<ClientSchedule[]>;
  
  // Schedule change logging
  createScheduleChangeLog(log: InsertScheduleChangeLog): Promise<ScheduleChangeLog>;
  getScheduleChangeLogs(scheduleId: string): Promise<ScheduleChangeLog[]>;

  // AI Issue Detection operations
  getAllAiDetectedIssues(): Promise<AiDetectedIssue[]>;
  getAiDetectedIssue(id: string): Promise<AiDetectedIssue | undefined>;
  createAiDetectedIssue(issue: InsertAiDetectedIssue): Promise<AiDetectedIssue>;
  updateAiDetectedIssue(id: string, issue: Partial<InsertAiDetectedIssue>): Promise<AiDetectedIssue>;
  deleteAiDetectedIssue(id: string): Promise<void>;
  getAllComplianceItems(): Promise<ComplianceItem[]>;
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

  // Client operations
  async getAllClients(): Promise<Client[]> {
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

  async deleteClient(id: string): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  async searchClients(searchTerm: string): Promise<Client[]> {
    return await db
      .select()
      .from(clients)
      .where(
        or(
          like(clients.firstName, `%${searchTerm}%`),
          like(clients.lastName, `%${searchTerm}%`),
          like(clients.phone, `%${searchTerm}%`)
        )
      );
  }

  // Caregiver operations
  async getAllCaregivers(): Promise<Caregiver[]> {
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

  async deleteCaregiver(id: string): Promise<void> {
    await db.delete(caregivers).where(eq(caregivers.id, id));
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
  async getAllDocuments(): Promise<Document[]> {
    return await db.select().from(documents).orderBy(desc(documents.createdAt));
  }

  async getDocumentsByClient(clientId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.clientId, clientId))
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
  async getAllTasks(): Promise<Task[]> {
    return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
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
  async getMessagesByUser(userId: string): Promise<Message[]> {
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
  async getAllComplianceItems(): Promise<ComplianceItem[]> {
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
  async getDashboardMetrics(): Promise<{
    activeClients: number;
    activeCaregivers: number;
    pendingTasks: number;
    complianceRate: number;
    criticalAlerts: number;
  }> {
    const [clientCount] = await db
      .select({ count: count() })
      .from(clients)
      .where(eq(clients.status, "active"));

    const [caregiverCount] = await db
      .select({ count: count() })
      .from(caregivers)
      .where(eq(caregivers.isActive, true));

    const [taskCount] = await db
      .select({ count: count() })
      .from(tasks)
      .where(eq(tasks.status, "pending"));

    const [totalCompliance] = await db
      .select({ count: count() })
      .from(complianceItems);

    const [compliantItems] = await db
      .select({ count: count() })
      .from(complianceItems)
      .where(eq(complianceItems.status, "compliant"));

    const [criticalTasks] = await db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.priority, "critical"),
          or(
            eq(tasks.status, "pending"),
            eq(tasks.status, "overdue")
          )
        )
      );

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
  async getAllTrainings(): Promise<Training[]> {
    return await db.select().from(trainings).orderBy(desc(trainings.createdAt));
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
  async getAllIncidentReports(): Promise<IncidentReport[]> {
    return await db.select().from(incidentReports).orderBy(desc(incidentReports.createdAt));
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
    let query = db.select().from(clientSchedules).where(eq(clientSchedules.clientId, clientId));
    
    if (startDate && endDate) {
      query = query.where(and(
        gte(clientSchedules.scheduledDate, startDate),
        lte(clientSchedules.scheduledDate, endDate)
      ));
    }
    
    return await query.orderBy(asc(clientSchedules.scheduledDate), asc(clientSchedules.startTime));
  }

  async getSchedulesByCaregiver(caregiverId: string, startDate?: Date, endDate?: Date): Promise<ClientSchedule[]> {
    let query = db.select().from(clientSchedules).where(eq(clientSchedules.caregiverId, caregiverId));
    
    if (startDate && endDate) {
      query = query.where(and(
        gte(clientSchedules.scheduledDate, startDate),
        lte(clientSchedules.scheduledDate, endDate)
      ));
    }
    
    return await query.orderBy(asc(clientSchedules.scheduledDate), asc(clientSchedules.startTime));
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

  async applyMasterWeekToSchedules(templateId: string, weekStartDate: Date): Promise<ClientSchedule[]> {
    // Get template and its slots
    const template = await this.getMasterWeekTemplate(templateId);
    if (!template || !template.isActive) {
      throw new Error('Template not found or inactive');
    }

    const slots = await this.getMasterWeekSlots(templateId);
    const newSchedules: ClientSchedule[] = [];

    // Create schedules for each slot for the week
    for (const slot of slots) {
      const scheduleDate = new Date(weekStartDate);
      scheduleDate.setDate(scheduleDate.getDate() + slot.dayOfWeek);

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
      };

      const newSchedule = await this.createClientSchedule(scheduleData);
      newSchedules.push(newSchedule);
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

  async getAllComplianceItems(): Promise<ComplianceItem[]> {
    return await db.select().from(complianceItems).orderBy(desc(complianceItems.createdAt));
  }
}

export const storage = new DatabaseStorage();
