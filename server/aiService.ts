import OpenAI from "openai";
import { storage } from "./storage";
import type { 
  Client, 
  Caregiver, 
  Certification, 
  ComplianceItem, 
  Task,
  IncidentReport,
  InsertAiDetectedIssue 
} from "@shared/schema";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

interface IssueAnalysis {
  issues: {
    category: "compliance" | "data_quality" | "scheduling" | "certification" | "documentation" | "incident_pattern" | "care_plan" | "other";
    severity: "low" | "medium" | "high" | "critical";
    title: string;
    description: string;
    affectedEntityType?: string;
    affectedEntityId?: string;
    suggestedAction: string;
    autoFixAvailable: boolean;
    confidence: number;
  }[];
}

export class AiIssueDetectionService {
  async scanForIssues(): Promise<InsertAiDetectedIssue[]> {
    const detectedIssues: InsertAiDetectedIssue[] = [];

    const [
      clientIssues,
      caregiverIssues,
      complianceIssues,
      taskIssues,
      incidentPatterns
    ] = await Promise.all([
      this.checkClientDataQuality(),
      this.checkCaregiverCertifications(),
      this.checkComplianceItems(),
      this.checkOverdueTasks(),
      this.analyzeIncidentPatterns()
    ]);

    detectedIssues.push(...clientIssues, ...caregiverIssues, ...complianceIssues, ...taskIssues, ...incidentPatterns);

    for (const issue of detectedIssues) {
      await storage.createAiDetectedIssue(issue);
    }

    return detectedIssues;
  }

  private async checkClientDataQuality(): Promise<InsertAiDetectedIssue[]> {
    const issues: InsertAiDetectedIssue[] = [];
    const clients = await storage.getAllClients();

    for (const client of clients) {
      if (!client.phone) {
        issues.push({
          category: "data_quality",
          severity: "medium",
          title: `Missing phone number for ${client.firstName} ${client.lastName}`,
          description: `Client ${client.firstName} ${client.lastName} does not have a phone number on file. This is important for emergency contact.`,
          affectedEntityType: "client",
          affectedEntityId: client.id,
          suggestedAction: "Add a phone number to the client's profile",
          autoFixAvailable: false,
          aiConfidence: "95",
        });
      }

      if (!client.emergencyContactPhone || !client.emergencyContactName) {
        issues.push({
          category: "data_quality",
          severity: "high",
          title: `Missing emergency contact for ${client.firstName} ${client.lastName}`,
          description: `Client ${client.firstName} ${client.lastName} does not have complete emergency contact information. This is critical for patient safety.`,
          affectedEntityType: "client",
          affectedEntityId: client.id,
          suggestedAction: "Add emergency contact name and phone number to the client's profile",
          autoFixAvailable: false,
          aiConfidence: "98",
        });
      }

      if (!client.address) {
        issues.push({
          category: "data_quality",
          severity: "high",
          title: `Missing address for ${client.firstName} ${client.lastName}`,
          description: `Client ${client.firstName} ${client.lastName} does not have an address on file. This is required for home care visits.`,
          affectedEntityType: "client",
          affectedEntityId: client.id,
          suggestedAction: "Add the client's home address",
          autoFixAvailable: false,
          aiConfidence: "95",
        });
      }

      if (!client.primaryCaregiverId) {
        issues.push({
          category: "scheduling",
          severity: "medium",
          title: `No primary caregiver assigned to ${client.firstName} ${client.lastName}`,
          description: `Client ${client.firstName} ${client.lastName} does not have a primary caregiver assigned. This may cause scheduling issues.`,
          affectedEntityType: "client",
          affectedEntityId: client.id,
          suggestedAction: "Assign a primary caregiver to this client",
          autoFixAvailable: false,
          aiConfidence: "90",
        });
      }
    }

    return issues;
  }

  private async checkCaregiverCertifications(): Promise<InsertAiDetectedIssue[]> {
    const issues: InsertAiDetectedIssue[] = [];
    const certifications = await storage.getAllCertifications();
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const cert of certifications) {
      if (cert.expirationDate) {
        const expDate = new Date(cert.expirationDate);
        
        if (expDate < now) {
          issues.push({
            category: "certification",
            severity: "critical",
            title: `Expired certification: ${cert.certificationType}`,
            description: `Certification ${cert.certificationType} for caregiver has expired on ${expDate.toLocaleDateString()}. This may affect their ability to provide care.`,
            affectedEntityType: "certification",
            affectedEntityId: cert.id,
            suggestedAction: "Renew the certification immediately or update status to inactive",
            autoFixAvailable: true,
            aiConfidence: "100",
          });
        } else if (expDate < thirtyDaysFromNow) {
          issues.push({
            category: "certification",
            severity: "high",
            title: `Certification expiring soon: ${cert.certificationType}`,
            description: `Certification ${cert.certificationType} will expire on ${expDate.toLocaleDateString()}. Renewal should be scheduled.`,
            affectedEntityType: "certification",
            affectedEntityId: cert.id,
            suggestedAction: "Schedule certification renewal before expiration",
            autoFixAvailable: false,
            aiConfidence: "100",
          });
        }
      }
    }

    return issues;
  }

  private async checkComplianceItems(): Promise<InsertAiDetectedIssue[]> {
    const issues: InsertAiDetectedIssue[] = [];
    const complianceItems = await storage.getAllComplianceItems();
    const now = new Date();

    for (const item of complianceItems) {
      if (item.status === "expired" || item.status === "non_compliant") {
        issues.push({
          category: "compliance",
          severity: "critical",
          title: `Non-compliant item: ${item.itemType}`,
          description: `Compliance item ${item.itemType} is marked as ${item.status}. This must be addressed to maintain regulatory compliance.`,
          affectedEntityType: "compliance_item",
          affectedEntityId: item.id,
          suggestedAction: "Review and update the compliance item status",
          autoFixAvailable: false,
          aiConfidence: "100",
        });
      }

      if (item.dueDate) {
        const dueDate = new Date(item.dueDate);
        if (dueDate < now && item.status === "pending") {
          issues.push({
            category: "compliance",
            severity: "high",
            title: `Overdue compliance item: ${item.itemType}`,
            description: `Compliance item ${item.itemType} was due on ${dueDate.toLocaleDateString()} but is still pending.`,
            affectedEntityType: "compliance_item",
            affectedEntityId: item.id,
            suggestedAction: "Complete the overdue compliance requirement",
            autoFixAvailable: false,
            aiConfidence: "100",
          });
        }
      }
    }

    return issues;
  }

  private async checkOverdueTasks(): Promise<InsertAiDetectedIssue[]> {
    const issues: InsertAiDetectedIssue[] = [];
    const tasks = await storage.getAllTasks();
    const now = new Date();

    for (const task of tasks) {
      if (task.dueDate && task.status !== "completed") {
        const dueDate = new Date(task.dueDate);
        if (dueDate < now) {
          issues.push({
            category: "scheduling",
            severity: task.priority === "critical" ? "critical" : task.priority === "high" ? "high" : "medium",
            title: `Overdue task: ${task.title}`,
            description: `Task "${task.title}" was due on ${dueDate.toLocaleDateString()} but has not been completed.`,
            affectedEntityType: "task",
            affectedEntityId: task.id,
            suggestedAction: "Complete the task or update the due date",
            autoFixAvailable: false,
            aiConfidence: "95",
          });
        }
      }
    }

    return issues;
  }

  private async analyzeIncidentPatterns(): Promise<InsertAiDetectedIssue[]> {
    const issues: InsertAiDetectedIssue[] = [];
    const incidents = await storage.getAllIncidentReports();

    if (incidents.length < 3) {
      return issues;
    }

    const clientIncidentCounts: Record<string, { count: number; types: string[] }> = {};
    
    for (const incident of incidents) {
      if (incident.clientId) {
        if (!clientIncidentCounts[incident.clientId]) {
          clientIncidentCounts[incident.clientId] = { count: 0, types: [] };
        }
        clientIncidentCounts[incident.clientId].count++;
        clientIncidentCounts[incident.clientId].types.push(incident.incidentType);
      }
    }

    for (const [clientId, data] of Object.entries(clientIncidentCounts)) {
      if (data.count >= 3) {
        const typeCount: Record<string, number> = {};
        data.types.forEach(t => {
          typeCount[t] = (typeCount[t] || 0) + 1;
        });
        const mostCommonType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0];

        issues.push({
          category: "incident_pattern",
          severity: data.count >= 5 ? "critical" : "high",
          title: `Recurring incidents detected for client`,
          description: `Client has ${data.count} reported incidents. Most common type: ${mostCommonType[0]} (${mostCommonType[1]} occurrences). This pattern should be reviewed.`,
          affectedEntityType: "client",
          affectedEntityId: clientId,
          suggestedAction: "Review care plan and implement preventive measures",
          autoFixAvailable: false,
          aiConfidence: "85",
        });
      }
    }

    return issues;
  }

  async resolveIssue(issueId: string, userId: string, resolutionNotes?: string): Promise<void> {
    await storage.updateAiDetectedIssue(issueId, {
      status: "resolved",
      resolvedBy: userId,
      resolvedAt: new Date(),
      resolutionNotes: resolutionNotes || "Issue resolved",
    });
  }

  async dismissIssue(issueId: string, userId: string, reason?: string): Promise<void> {
    await storage.updateAiDetectedIssue(issueId, {
      status: "dismissed",
      resolvedBy: userId,
      resolvedAt: new Date(),
      resolutionNotes: reason || "Issue dismissed",
    });
  }

  async applyAutoFix(issueId: string, userId: string): Promise<{ success: boolean; message: string }> {
    const issue = await storage.getAiDetectedIssue(issueId);
    
    if (!issue) {
      return { success: false, message: "Issue not found" };
    }

    if (!issue.autoFixAvailable) {
      return { success: false, message: "Auto-fix is not available for this issue" };
    }

    try {
      if (issue.category === "certification" && issue.affectedEntityType === "certification") {
        await storage.updateCertification(issue.affectedEntityId!, { status: "expired" });
        
        await storage.updateAiDetectedIssue(issueId, {
          status: "resolved",
          autoFixApplied: true,
          resolvedBy: userId,
          resolvedAt: new Date(),
          resolutionNotes: "Auto-fix applied: Certification status updated to expired",
        });
        
        return { success: true, message: "Certification status updated to expired" };
      }

      return { success: false, message: "No auto-fix handler for this issue type" };
    } catch (error) {
      return { success: false, message: `Auto-fix failed: ${error}` };
    }
  }

  async getOpenIssuesCount(): Promise<number> {
    const issues = await storage.getAllAiDetectedIssues();
    return issues.filter(i => i.status === "open").length;
  }
}

export const aiIssueService = new AiIssueDetectionService();
