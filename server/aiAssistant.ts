import OpenAI from "openai";
import { storage } from "./storage";
import type { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources/chat/completions";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

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
  }
];

async function executeFunction(name: string, args: any): Promise<string> {
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
  conversationHistory: ChatMessage[]
): Promise<{ response: string; actions: string[] }> {
  const actions: string[] = [];
  
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are an AI assistant for a home care agency management system. You help users perform actions like:
- Searching for and viewing client/caregiver information
- Assigning clients to caregivers
- Creating notes for caregivers
- Managing client MCO (Managed Care Organization) assignments
- Creating schedules for client visits
- Activating/deactivating clients

When the user asks you to do something:
1. First search for the relevant entities (clients, caregivers) if needed
2. Confirm you found the right ones
3. Perform the requested action
4. Report the result

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
      
      const result = await executeFunction(functionName, functionArgs);
      
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
