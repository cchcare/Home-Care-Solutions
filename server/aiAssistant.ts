import OpenAI from "openai";
import { storage } from "./storage";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";

// Falls back to a placeholder key so a missing/misconfigured env var can't
// crash the whole server at startup (the OpenAI SDK throws synchronously in
// its constructor when apiKey is empty).
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "not-configured",
});

type UserRole = "admin" | "supervisor" | "caregiver" | "family" | "super_admin";

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: [
    "search_clients", "search_caregivers", "list_clients", "list_caregivers",
    "assign_client_to_caregiver", "create_caregiver_note", "update_client_mco_status",
    "get_client_mcos", "create_client_schedule", "get_client_details",
    "get_caregiver_details", "deactivate_client", "activate_client",
    "get_dashboard_stats", "get_upcoming_tasks", "create_task", "get_compliance_alerts",
    "get_schedule_by_date", "send_message", "get_recent_documents", "get_office_summary",
    "diagnose_error", "get_recent_errors"
  ],
  admin: [
    "search_clients", "search_caregivers", "list_clients", "list_caregivers",
    "assign_client_to_caregiver", "create_caregiver_note", "update_client_mco_status",
    "get_client_mcos", "create_client_schedule", "get_client_details",
    "get_caregiver_details", "deactivate_client", "activate_client",
    "get_dashboard_stats", "get_upcoming_tasks", "create_task", "get_compliance_alerts",
    "get_schedule_by_date", "send_message", "get_recent_documents", "get_office_summary",
    "diagnose_error", "get_recent_errors"
  ],
  supervisor: [
    "search_clients", "search_caregivers", "list_clients", "list_caregivers",
    "assign_client_to_caregiver", "create_caregiver_note", "update_client_mco_status",
    "get_client_mcos", "create_client_schedule", "get_client_details",
    "get_caregiver_details",
    "get_dashboard_stats", "get_upcoming_tasks", "create_task", "get_compliance_alerts",
    "get_schedule_by_date", "get_recent_documents", "get_office_summary"
  ],
  caregiver: [
    "search_clients", "search_caregivers", "list_clients", "list_caregivers",
    "get_client_details", "get_caregiver_details", "create_caregiver_note",
    "get_client_mcos",
    "get_dashboard_stats", "get_upcoming_tasks", "get_schedule_by_date", "get_recent_documents"
  ],
  family: [
    "search_clients", "list_clients", "get_client_details",
    "get_dashboard_stats", "get_schedule_by_date"
  ]
};

function canExecuteTool(role: UserRole, toolName: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(toolName) : false;
}

function getPermissionDenialMessage(role: UserRole, toolName: string): string {
  const denialMessages: Record<string, string> = {
    assign_client_to_caregiver: "I'm not able to assign clients to caregivers with your current role. Please contact an administrator or supervisor for this request.",
    deactivate_client: "Client status changes require administrator privileges. I can help you create a note or notify an admin instead.",
    activate_client: "Client status changes require administrator privileges. I can help you create a note or notify an admin instead.",
    update_client_mco_status: "MCO status updates require supervisor or administrator access. Would you like me to help with something else?",
    create_client_schedule: "Schedule creation requires supervisor access or higher. I can help you view existing information instead.",
    create_caregiver_note: "Note creation requires at least caregiver access. Please contact a staff member for assistance.",
    list_caregivers: "Viewing caregiver lists requires staff access. I can help you find client information instead.",
    create_task: "Task creation requires supervisor access or higher. Please contact your supervisor to create tasks.",
    send_message: "Sending messages requires administrator access. Please contact an admin for this request.",
    get_compliance_alerts: "Viewing compliance alerts requires supervisor access or higher.",
    get_office_summary: "Office summary access requires supervisor access or higher.",
  };
  return denialMessages[toolName] || `This action requires higher access privileges than your current ${role} role provides.`;
}

const AVAILABLE_TOOLS: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_clients",
      description: "Search for clients by name. Returns matching clients with their IDs.",
      parameters: {
        type: "object",
        properties: {
          searchTerm: {
            type: "string",
            description: "The name or part of name to search for"
          }
        },
        required: ["searchTerm"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_caregivers",
      description: "Search for caregivers by name. Returns matching caregivers with their IDs.",
      parameters: {
        type: "object",
        properties: {
          searchTerm: {
            type: "string",
            description: "The name or part of name to search for"
          }
        },
        required: ["searchTerm"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "assign_client_to_caregiver",
      description: "Assign a client to a caregiver. Both client and caregiver must exist.",
      parameters: {
        type: "object",
        properties: {
          clientId: {
            type: "string",
            description: "The ID of the client to assign"
          },
          caregiverId: {
            type: "string",
            description: "The ID of the caregiver to assign the client to"
          }
        },
        required: ["clientId", "caregiverId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_caregiver_note",
      description: "Create a note for a caregiver",
      parameters: {
        type: "object",
        properties: {
          caregiverId: {
            type: "string",
            description: "The ID of the caregiver"
          },
          noteType: {
            type: "string",
            enum: ["general", "performance", "training", "incident", "other"],
            description: "Type of note"
          },
          content: {
            type: "string",
            description: "The note content"
          }
        },
        required: ["caregiverId", "noteType", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_client_mco_status",
      description: "Update a client's MCO assignment status (activate or discharge)",
      parameters: {
        type: "object",
        properties: {
          clientMcoId: {
            type: "string",
            description: "The ID of the client-MCO assignment"
          },
          action: {
            type: "string",
            enum: ["discharge", "activate"],
            description: "The action to perform"
          },
          dischargeReason: {
            type: "string",
            description: "Reason for discharge (required if action is discharge)"
          },
          dischargeNotes: {
            type: "string",
            description: "Additional notes about the discharge"
          }
        },
        required: ["clientMcoId", "action"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_client_mcos",
      description: "Get all MCO assignments for a client",
      parameters: {
        type: "object",
        properties: {
          clientId: {
            type: "string",
            description: "The ID of the client"
          }
        },
        required: ["clientId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_client_schedule",
      description: "Create a schedule entry for a client with a caregiver",
      parameters: {
        type: "object",
        properties: {
          clientId: {
            type: "string",
            description: "The ID of the client"
          },
          caregiverId: {
            type: "string",
            description: "The ID of the caregiver"
          },
          date: {
            type: "string",
            description: "Date of the visit in YYYY-MM-DD format"
          },
          startTime: {
            type: "string",
            description: "Start time in HH:MM format (24-hour)"
          },
          endTime: {
            type: "string",
            description: "End time in HH:MM format (24-hour)"
          },
          notes: {
            type: "string",
            description: "Optional notes for the visit"
          }
        },
        required: ["clientId", "caregiverId", "date", "startTime", "endTime"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_clients",
      description: "Get a list of all clients",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_caregivers",
      description: "Get a list of all caregivers",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_client_details",
      description: "Get detailed information about a specific client",
      parameters: {
        type: "object",
        properties: {
          clientId: {
            type: "string",
            description: "The ID of the client"
          }
        },
        required: ["clientId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_caregiver_details",
      description: "Get detailed information about a specific caregiver",
      parameters: {
        type: "object",
        properties: {
          caregiverId: {
            type: "string",
            description: "The ID of the caregiver"
          }
        },
        required: ["caregiverId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "deactivate_client",
      description: "Deactivate a client by changing their status to inactive",
      parameters: {
        type: "object",
        properties: {
          clientId: {
            type: "string",
            description: "The ID of the client to deactivate"
          }
        },
        required: ["clientId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "activate_client",
      description: "Activate a client by changing their status to active",
      parameters: {
        type: "object",
        properties: {
          clientId: {
            type: "string",
            description: "The ID of the client to activate"
          }
        },
        required: ["clientId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_dashboard_stats",
      description: "Get overall agency statistics including active clients, active caregivers, and pending tasks count",
      parameters: {
        type: "object",
        properties: {
          officeId: {
            type: "string",
            description: "Optional office ID to filter stats by a specific office"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_upcoming_tasks",
      description: "Get tasks that are due soon (pending or in progress)",
      parameters: {
        type: "object",
        properties: {
          userId: {
            type: "string",
            description: "Optional user ID to filter tasks assigned to a specific user"
          },
          daysAhead: {
            type: "number",
            description: "Number of days ahead to look for upcoming tasks (default: 7)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Create a new task with title, description, due date, and assignee",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Title of the task"
          },
          description: {
            type: "string",
            description: "Detailed description of the task"
          },
          dueDate: {
            type: "string",
            description: "Due date in YYYY-MM-DD format"
          },
          assigneeId: {
            type: "string",
            description: "User ID of the person to assign the task to"
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "critical"],
            description: "Priority level of the task"
          },
          clientId: {
            type: "string",
            description: "Optional client ID if the task is related to a specific client"
          }
        },
        required: ["title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_compliance_alerts",
      description: "Get clients and caregivers with expiring certifications or compliance issues",
      parameters: {
        type: "object",
        properties: {
          daysUntilExpiry: {
            type: "number",
            description: "Number of days to look ahead for expiring items (default: 30)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_schedule_by_date",
      description: "Get all schedules for a specific date",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Date in YYYY-MM-DD format"
          },
          clientId: {
            type: "string",
            description: "Optional client ID to filter schedules for a specific client"
          },
          caregiverId: {
            type: "string",
            description: "Optional caregiver ID to filter schedules for a specific caregiver"
          }
        },
        required: ["date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_message",
      description: "Send an internal message to a user in the system",
      parameters: {
        type: "object",
        properties: {
          recipientId: {
            type: "string",
            description: "User ID of the message recipient"
          },
          subject: {
            type: "string",
            description: "Subject of the message"
          },
          content: {
            type: "string",
            description: "Content/body of the message"
          },
          priority: {
            type: "string",
            enum: ["low", "normal", "high", "urgent"],
            description: "Priority level of the message (default: normal)"
          }
        },
        required: ["recipientId", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_recent_documents",
      description: "Get recently uploaded documents",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Maximum number of documents to return (default: 10)"
          },
          clientId: {
            type: "string",
            description: "Optional client ID to filter documents for a specific client"
          },
          caregiverId: {
            type: "string",
            description: "Optional caregiver ID to filter documents for a specific caregiver"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_office_summary",
      description: "Get summary of an office including client count, caregiver count, and other statistics",
      parameters: {
        type: "object",
        properties: {
          officeId: {
            type: "string",
            description: "The ID of the office to get summary for"
          }
        },
        required: ["officeId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "diagnose_error",
      description: "Get AI diagnosis for an API error. Analyzes the error and provides possible causes and suggested fixes.",
      parameters: {
        type: "object",
        properties: {
          endpoint: {
            type: "string",
            description: "The API endpoint that failed (e.g., /api/clients, /api/evv-data)"
          },
          method: {
            type: "string",
            enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
            description: "The HTTP method used"
          },
          errorMessage: {
            type: "string",
            description: "The error message received"
          },
          statusCode: {
            type: "number",
            description: "The HTTP status code (e.g., 400, 404, 500)"
          }
        },
        required: ["endpoint", "method", "errorMessage"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_recent_errors",
      description: "Get a list of recent API errors that have occurred in the system",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "Maximum number of errors to return (default: 10)"
          }
        },
        required: []
      }
    }
  }
];

async function executeFunction(name: string, args: any, userRole: UserRole, userId?: string): Promise<string> {
  if (!canExecuteTool(userRole, name)) {
    return JSON.stringify({ 
      success: false, 
      permissionDenied: true,
      message: getPermissionDenialMessage(userRole, name)
    });
  }
  
  try {
    switch (name) {
      case "search_clients": {
        const clients = await storage.searchClients(args.searchTerm);
        if (clients.length === 0) {
          return JSON.stringify({ success: true, message: "No clients found matching the search term.", clients: [] });
        }
        return JSON.stringify({
          success: true,
          clients: clients.map(c => ({
            id: c.id,
            name: `${c.firstName} ${c.lastName}`,
            status: c.status,
            phone: c.phone
          }))
        });
      }

      case "search_caregivers": {
        const caregivers = await storage.getAllCaregivers();
        const searchLower = args.searchTerm.toLowerCase();
        const filtered = caregivers.filter((c: any) => {
          const firstName = c.firstName || "";
          const lastName = c.lastName || "";
          return firstName.toLowerCase().includes(searchLower) || 
                 lastName.toLowerCase().includes(searchLower);
        });
        if (filtered.length === 0) {
          return JSON.stringify({ success: true, message: "No caregivers found matching the search term.", caregivers: [] });
        }
        return JSON.stringify({
          success: true,
          caregivers: filtered.map((c: any) => ({
            id: c.id,
            name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unknown",
            isActive: c.isActive
          }))
        });
      }

      case "assign_client_to_caregiver": {
        const client = await storage.getClient(args.clientId);
        const caregiver = await storage.getCaregiver(args.caregiverId);
        
        if (!client) {
          return JSON.stringify({ success: false, message: "Client not found" });
        }
        if (!caregiver) {
          return JSON.stringify({ success: false, message: "Caregiver not found" });
        }
        
        await storage.assignClientsToCaregiver(args.caregiverId, [args.clientId]);
        return JSON.stringify({
          success: true,
          message: `Successfully assigned ${client.firstName} ${client.lastName} to caregiver`
        });
      }

      case "create_caregiver_note": {
        const caregiver = await storage.getCaregiver(args.caregiverId);
        if (!caregiver) {
          return JSON.stringify({ success: false, message: "Caregiver not found" });
        }
        
        const note = await storage.createCaregiverNote({
          caregiverId: args.caregiverId,
          noteType: args.noteType,
          content: args.content,
        });
        return JSON.stringify({
          success: true,
          message: `Note created successfully`,
          noteId: note.id
        });
      }

      case "update_client_mco_status": {
        const clientMco = await storage.getClientMco(args.clientMcoId);
        if (!clientMco) {
          return JSON.stringify({ success: false, message: "Client MCO assignment not found" });
        }
        
        if (args.action === "discharge") {
          await storage.updateClientMco(args.clientMcoId, {
            status: "discharged",
            dischargeDate: new Date(),
            dischargeReason: args.dischargeReason || "other",
            dischargeNotes: args.dischargeNotes || ""
          });
          return JSON.stringify({ success: true, message: "Client discharged from MCO successfully" });
        } else if (args.action === "activate") {
          await storage.updateClientMco(args.clientMcoId, {
            status: "active",
            dischargeDate: null,
            dischargeReason: null,
            dischargeNotes: null
          });
          return JSON.stringify({ success: true, message: "Client MCO assignment reactivated successfully" });
        }
        return JSON.stringify({ success: false, message: "Invalid action" });
      }

      case "get_client_mcos": {
        const clientMcos = await storage.getClientMcosByClient(args.clientId);
        const mcos = await storage.getAllMcos();
        const enriched = clientMcos.map((cm: any) => {
          const mco = mcos.find(m => m.id === cm.mcoId);
          return {
            id: cm.id,
            mcoName: mco?.name || "Unknown",
            status: cm.status,
            startDate: cm.startDate,
            dischargeDate: cm.dischargeDate,
            isPrimary: cm.isPrimary
          };
        });
        return JSON.stringify({ success: true, clientMcos: enriched });
      }

      case "create_client_schedule": {
        const client = await storage.getClient(args.clientId);
        const caregiver = await storage.getCaregiver(args.caregiverId);
        
        if (!client) {
          return JSON.stringify({ success: false, message: "Client not found" });
        }
        if (!caregiver) {
          return JSON.stringify({ success: false, message: "Caregiver not found" });
        }
        
        const schedule = await storage.createClientSchedule({
          clientId: args.clientId,
          caregiverId: args.caregiverId,
          scheduledDate: new Date(args.date),
          startTime: args.startTime,
          endTime: args.endTime,
          notes: args.notes || "",
          status: "scheduled"
        });
        return JSON.stringify({
          success: true,
          message: `Schedule created for ${args.date} from ${args.startTime} to ${args.endTime}`,
          scheduleId: schedule.id
        });
      }

      case "list_clients": {
        const clients = await storage.getAllClients();
        return JSON.stringify({
          success: true,
          clients: clients.slice(0, 20).map(c => ({
            id: c.id,
            name: `${c.firstName} ${c.lastName}`,
            status: c.status
          })),
          totalCount: clients.length
        });
      }

      case "list_caregivers": {
        const caregivers = await storage.getAllCaregivers();
        return JSON.stringify({
          success: true,
          caregivers: caregivers.slice(0, 20).map((c: any) => ({
            id: c.id,
            name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unknown",
            isActive: c.isActive
          })),
          totalCount: caregivers.length
        });
      }

      case "get_client_details": {
        const client = await storage.getClient(args.clientId);
        if (!client) {
          return JSON.stringify({ success: false, message: "Client not found" });
        }
        return JSON.stringify({
          success: true,
          client: {
            id: client.id,
            name: `${client.firstName} ${client.lastName}`,
            status: client.status,
            phone: client.phone,
            address: client.address,
            emergencyContact: client.emergencyContactName,
            emergencyPhone: client.emergencyContactPhone
          }
        });
      }

      case "get_caregiver_details": {
        const caregiver = await storage.getCaregiver(args.caregiverId);
        if (!caregiver) {
          return JSON.stringify({ success: false, message: "Caregiver not found" });
        }
        return JSON.stringify({
          success: true,
          caregiver: {
            id: caregiver.id,
            isActive: caregiver.isActive
          }
        });
      }

      case "deactivate_client": {
        const client = await storage.getClient(args.clientId);
        if (!client) {
          return JSON.stringify({ success: false, message: "Client not found" });
        }
        await storage.updateClient(args.clientId, { status: "inactive" });
        return JSON.stringify({
          success: true,
          message: `${client.firstName} ${client.lastName} has been deactivated`
        });
      }

      case "activate_client": {
        const client = await storage.getClient(args.clientId);
        if (!client) {
          return JSON.stringify({ success: false, message: "Client not found" });
        }
        await storage.updateClient(args.clientId, { status: "active" });
        return JSON.stringify({
          success: true,
          message: `${client.firstName} ${client.lastName} has been activated`
        });
      }

      case "get_dashboard_stats": {
        const metrics = await storage.getDashboardMetrics(args.officeId);
        return JSON.stringify({
          success: true,
          stats: {
            activeClients: metrics.activeClients,
            activeCaregivers: metrics.activeCaregivers,
            pendingTasks: metrics.pendingTasks,
            complianceRate: metrics.complianceRate,
            criticalAlerts: metrics.criticalAlerts
          }
        });
      }

      case "get_upcoming_tasks": {
        const allTasks = await storage.getAllTasks();
        const daysAhead = args.daysAhead || 7;
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + daysAhead);
        
        let filteredTasks = allTasks.filter((t: any) => {
          if (t.status === "completed") return false;
          if (!t.dueDate) return true;
          const dueDate = new Date(t.dueDate);
          return dueDate <= futureDate;
        });
        
        if (args.userId) {
          filteredTasks = filteredTasks.filter((t: any) => t.assignedTo === args.userId);
        }
        
        const sortedTasks = filteredTasks.sort((a: any, b: any) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        });
        
        return JSON.stringify({
          success: true,
          tasks: sortedTasks.slice(0, 20).map((t: any) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            priority: t.priority,
            status: t.status,
            dueDate: t.dueDate
          })),
          totalCount: filteredTasks.length
        });
      }

      case "create_task": {
        const taskData: any = {
          title: args.title,
          description: args.description || "",
          priority: args.priority || "medium",
          status: "pending"
        };
        
        if (args.assigneeId) {
          const assignee = await storage.getUser(args.assigneeId);
          if (!assignee) {
            return JSON.stringify({ success: false, message: "Assignee user not found" });
          }
          taskData.assignedTo = args.assigneeId;
        }
        
        if (args.dueDate) {
          taskData.dueDate = new Date(args.dueDate);
        }
        
        if (args.clientId) {
          const client = await storage.getClient(args.clientId);
          if (!client) {
            return JSON.stringify({ success: false, message: "Client not found" });
          }
          taskData.clientId = args.clientId;
        }
        
        const task = await storage.createTask(taskData);
        return JSON.stringify({
          success: true,
          message: `Task "${args.title}" created successfully`,
          taskId: task.id
        });
      }

      case "get_compliance_alerts": {
        const daysUntilExpiry = args.daysUntilExpiry || 30;
        const certifications = await storage.getAllCertifications();
        const complianceItems = await storage.getAllComplianceItems();
        const caregivers = await storage.getAllCaregivers();
        
        const now = new Date();
        const expiryThreshold = new Date();
        expiryThreshold.setDate(now.getDate() + daysUntilExpiry);
        
        const expiringCerts = certifications.filter((cert: any) => {
          if (!cert.expirationDate) return false;
          const expDate = new Date(cert.expirationDate);
          return expDate <= expiryThreshold && expDate >= now;
        });
        
        const expiredCerts = certifications.filter((cert: any) => {
          if (!cert.expirationDate) return false;
          return new Date(cert.expirationDate) < now;
        });
        
        const pendingCompliance = complianceItems.filter((item: any) => 
          item.status === "pending" || item.status === "overdue"
        );
        
        const getCaregiverName = (caregiverId: string) => {
          const caregiver = caregivers.find((c: any) => c.id === caregiverId);
          return caregiver ? `Caregiver ${caregiverId}` : "Unknown";
        };
        
        return JSON.stringify({
          success: true,
          alerts: {
            expiringCertifications: expiringCerts.slice(0, 10).map((c: any) => ({
              id: c.id,
              caregiverId: c.caregiverId,
              type: c.certificationType,
              expirationDate: c.expirationDate
            })),
            expiredCertifications: expiredCerts.slice(0, 10).map((c: any) => ({
              id: c.id,
              caregiverId: c.caregiverId,
              type: c.certificationType,
              expirationDate: c.expirationDate
            })),
            pendingComplianceItems: pendingCompliance.slice(0, 10).map((i: any) => ({
              id: i.id,
              caregiverId: i.caregiverId,
              itemName: i.itemName,
              status: i.status,
              dueDate: i.dueDate
            })),
            summary: {
              expiringCount: expiringCerts.length,
              expiredCount: expiredCerts.length,
              pendingComplianceCount: pendingCompliance.length
            }
          }
        });
      }

      case "get_schedule_by_date": {
        const targetDate = new Date(args.date);
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        let schedules: any[] = [];
        
        if (args.clientId) {
          schedules = await storage.getClientSchedules(args.clientId, startOfDay, endOfDay);
        } else if (args.caregiverId) {
          schedules = await storage.getSchedulesByCaregiver(args.caregiverId, startOfDay, endOfDay);
        } else {
          const allClients = await storage.getAllClients();
          for (const client of allClients.slice(0, 50)) {
            const clientSchedules = await storage.getClientSchedules(client.id, startOfDay, endOfDay);
            schedules.push(...clientSchedules);
          }
        }
        
        const clients = await storage.getAllClients();
        const caregivers = await storage.getAllCaregivers();
        
        const enrichedSchedules = schedules.map((s: any) => {
          const client = clients.find(c => c.id === s.clientId);
          const caregiver = caregivers.find((c: any) => c.id === s.caregiverId);
          return {
            id: s.id,
            clientName: client ? `${client.firstName} ${client.lastName}` : "Unknown",
            clientId: s.clientId,
            caregiverId: s.caregiverId,
            startTime: s.startTime,
            endTime: s.endTime,
            status: s.status,
            notes: s.notes
          };
        });
        
        return JSON.stringify({
          success: true,
          date: args.date,
          schedules: enrichedSchedules,
          totalCount: schedules.length
        });
      }

      case "send_message": {
        if (!userId) {
          return JSON.stringify({ success: false, message: "User not authenticated" });
        }
        
        const recipient = await storage.getUser(args.recipientId);
        if (!recipient) {
          return JSON.stringify({ success: false, message: "Recipient user not found" });
        }
        
        const message = await storage.createMessage({
          senderId: userId,
          recipientId: args.recipientId,
          subject: args.subject || "",
          content: args.content,
          priority: args.priority || "normal",
          messageType: "message",
          communicationType: "internal"
        });
        
        return JSON.stringify({
          success: true,
          message: `Message sent successfully to ${recipient.firstName || recipient.email || "user"}`,
          messageId: message.id
        });
      }

      case "get_recent_documents": {
        const limit = args.limit || 10;
        let documents = await storage.getAllDocuments();
        
        if (args.clientId) {
          documents = await storage.getDocumentsByClient(args.clientId);
        } else if (args.caregiverId) {
          documents = await storage.getDocumentsByCaregiver(args.caregiverId);
        }
        
        const sortedDocs = documents.sort((a: any, b: any) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        
        return JSON.stringify({
          success: true,
          documents: sortedDocs.slice(0, limit).map((d: any) => ({
            id: d.id,
            fileName: d.originalName || d.fileName,
            documentType: d.documentType,
            fileType: d.fileType,
            clientId: d.clientId,
            caregiverId: d.caregiverId,
            createdAt: d.createdAt
          })),
          totalCount: documents.length
        });
      }

      case "get_office_summary": {
        const office = await storage.getOffice(args.officeId);
        if (!office) {
          return JSON.stringify({ success: false, message: "Office not found" });
        }
        
        const clients = await storage.getAllClients(args.officeId);
        const caregivers = await storage.getAllCaregivers(args.officeId);
        const metrics = await storage.getDashboardMetrics(args.officeId);
        
        const activeClients = clients.filter((c: any) => c.status === "active");
        const activeCaregivers = caregivers.filter((c: any) => c.isActive);
        
        return JSON.stringify({
          success: true,
          office: {
            id: office.id,
            name: office.name,
            address: office.address,
            phone: office.phone,
            email: office.email
          },
          summary: {
            totalClients: clients.length,
            activeClients: activeClients.length,
            totalCaregivers: caregivers.length,
            activeCaregivers: activeCaregivers.length,
            pendingTasks: metrics.pendingTasks,
            complianceRate: metrics.complianceRate
          }
        });
      }

      case "diagnose_error": {
        const { diagnoseApiError } = await import("./aiService");
        const diagnosis = await diagnoseApiError({
          endpoint: args.endpoint,
          method: args.method,
          errorMessage: args.errorMessage,
          statusCode: args.statusCode,
        });
        
        return JSON.stringify({
          success: true,
          diagnosis: diagnosis.diagnosis,
          suggestedFix: diagnosis.suggestedFix,
          severity: diagnosis.severity,
          possibleCauses: diagnosis.possibleCauses
        });
      }

      case "get_recent_errors": {
        const { errorLogStorage } = await import("./storage");
        const limit = args.limit || 10;
        const errors = errorLogStorage.getRecentErrors(limit);
        
        if (errors.length === 0) {
          return JSON.stringify({
            success: true,
            message: "No recent errors found in the system.",
            errors: []
          });
        }
        
        return JSON.stringify({
          success: true,
          errors: errors.map((e: any) => ({
            id: e.id,
            timestamp: e.timestamp,
            endpoint: e.endpoint,
            method: e.method,
            errorMessage: e.errorMessage,
            statusCode: e.statusCode
          })),
          totalCount: errors.length
        });
      }

      default:
        return JSON.stringify({ success: false, message: `Unknown function: ${name}` });
    }
  } catch (error: any) {
    return JSON.stringify({ success: false, message: `Error: ${error.message}` });
  }
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function processAIAssistantMessage(
  userMessage: string,
  conversationHistory: ChatMessage[],
  userRole: UserRole = "caregiver",
  userId?: string
): Promise<{ response: string; actions: string[] }> {
  const actions: string[] = [];
  
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are an AI assistant for a home care agency management system. The user has a "${userRole}" role.

Based on their role, you can help with:
${userRole === "admin" || userRole === "super_admin" ? `- Full access to all capabilities:
  * Search, assign clients, create schedules, manage MCO status, activate/deactivate clients, create notes
  * View dashboard statistics and office summaries
  * Get upcoming tasks and create new tasks
  * View compliance alerts for expiring certifications
  * View schedules by date for any client or caregiver
  * Send internal messages to any user
  * View recently uploaded documents` : ""}
${userRole === "supervisor" ? `- Supervisor access:
  * Search clients and caregivers, assign clients, create schedules, manage MCO status, create notes
  * View dashboard statistics and office summaries
  * Get upcoming tasks and create new tasks
  * View compliance alerts for expiring certifications
  * View schedules by date
  * View recently uploaded documents
  * Note: Cannot activate/deactivate clients or send messages` : ""}
${userRole === "caregiver" ? `- Caregiver access:
  * Search and view client/caregiver details, create notes, view MCO information
  * View dashboard statistics (limited to your assignments)
  * Get your upcoming tasks
  * View schedules by date (for your assigned clients)
  * View recently uploaded documents (for your clients)
  * Note: Cannot assign clients, create schedules, change client status, or send messages` : ""}
${userRole === "family" ? `- Family member access:
  * View client information (limited to your family member)
  * View basic dashboard statistics
  * View schedules for your family member's care
  * Note: Limited access for privacy protection` : ""}

Available capabilities:
- Search for clients and caregivers by name
- Get detailed client and caregiver information
- View dashboard statistics (active clients, caregivers, pending tasks)
- Get upcoming tasks and manage task creation
- View schedules for specific dates
- Check compliance alerts for expiring certifications
- View recently uploaded documents
- Get office summaries with client/caregiver counts

When the user asks you to do something:
1. First search for the relevant entities (clients, caregivers) if needed
2. Confirm you found the right ones
3. Perform the requested action
4. Report the result

If the user requests an action they don't have permission for, politely explain the limitation and suggest what they can do instead or who to contact.

Be helpful, concise, and professional. If you need more information to complete a task, ask for it.
Always be careful with actions that modify data - confirm before making changes if the user's request is ambiguous.`
    },
    ...conversationHistory.map(msg => ({
      role: msg.role as "user" | "assistant",
      content: msg.content
    })),
    { role: "user" as const, content: userMessage }
  ];

  let response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    tools: AVAILABLE_TOOLS,
    tool_choice: "auto",
    max_tokens: 1024
  });

  let assistantMessage = response.choices[0].message;
  
  while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    messages.push(assistantMessage as ChatCompletionMessageParam);
    
    for (const toolCall of assistantMessage.tool_calls) {
      const tc = toolCall as any;
      const functionName = tc.function.name;
      const functionArgs = JSON.parse(tc.function.arguments);
      
      actions.push(`Executing: ${functionName}`);
      
      const result = await executeFunction(functionName, functionArgs, userRole, userId);
      
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result
      });
    }
    
    response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      tools: AVAILABLE_TOOLS,
      tool_choice: "auto",
      max_tokens: 1024
    });
    
    assistantMessage = response.choices[0].message;
  }

  return {
    response: assistantMessage.content || "I'm sorry, I couldn't process that request.",
    actions
  };
}
