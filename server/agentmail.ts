import { AgentMailClient } from 'agentmail';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=agentmail',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || !connectionSettings.settings.api_key) {
    throw new Error('AgentMail not connected');
  }
  return { apiKey: connectionSettings.settings.api_key };
}

export async function getAgentMailClient() {
  const { apiKey } = await getCredentials();
  return new AgentMailClient({
    apiKey: apiKey
  });
}

export async function sendEmail(to: string, subject: string, body: string, fromName?: string) {
  const client = await getAgentMailClient();
  
  const inbox = await client.inboxes.create({});
  
  const draft = await client.inboxes.drafts.create(inbox.inboxId, {
    to: [to],
    subject: subject,
    text: body
  });
  
  const sendResponse = await client.inboxes.drafts.send(inbox.inboxId, draft.draftId, {});
  
  return { 
    success: true, 
    messageId: sendResponse.messageId,
    inboxId: inbox.inboxId
  };
}
