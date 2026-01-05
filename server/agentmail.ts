import { AgentMailClient } from 'agentmail';

let connectionSettings: any;
let cachedCustomInboxId: string | null = null;

const CUSTOM_EMAIL = 'donotreply@app.carechc.com';
const CUSTOM_USERNAME = 'donotreply';
const CUSTOM_DOMAIN = 'app.carechc.com';

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

async function getCustomInboxId(): Promise<string> {
  if (cachedCustomInboxId) {
    return cachedCustomInboxId;
  }

  const client = await getAgentMailClient();
  
  try {
    const response = await client.inboxes.list() as any;
    const inboxes = response.inboxes || response.items || [];
    
    for (const inbox of inboxes) {
      if ((inbox.username === CUSTOM_USERNAME && inbox.domain === CUSTOM_DOMAIN) ||
          (inbox.username === CUSTOM_USERNAME)) {
        cachedCustomInboxId = inbox.inbox_id || inbox.inboxId;
        console.log(`Found custom inbox: ${inbox.username}@${inbox.domain} (${cachedCustomInboxId})`);
        return cachedCustomInboxId!;
      }
    }
    
    console.log('Custom inbox not found, creating new inbox for sending');
    const newInbox = await client.inboxes.create({});
    return (newInbox as any).inbox_id || (newInbox as any).inboxId;
  } catch (error) {
    console.error('Error finding custom inbox:', error);
    const newInbox = await client.inboxes.create({});
    return (newInbox as any).inbox_id || (newInbox as any).inboxId;
  }
}

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  fromName?: string;
}

export async function sendEmail(to: string, subject: string, body: string, fromName?: string) {
  return sendEmailWithOptions({ to, subject, text: body, fromName });
}

export async function sendEmailWithOptions(options: EmailOptions) {
  const client = await getAgentMailClient();
  
  const inboxId = await getCustomInboxId();
  
  const draftOptions: any = {
    to: [options.to],
    subject: options.subject,
  };
  
  if (options.html) {
    draftOptions.html = options.html;
  }
  if (options.text) {
    draftOptions.text = options.text;
  }
  
  const draft = await client.inboxes.drafts.create(inboxId, draftOptions);
  const draftId = (draft as any).draft_id || (draft as any).draftId;
  
  const sendResponse = await client.inboxes.drafts.send(inboxId, draftId, {});
  
  console.log(`Email sent from ${CUSTOM_EMAIL} to ${options.to}`);
  
  return { 
    success: true, 
    messageId: (sendResponse as any).message_id || (sendResponse as any).messageId,
    inboxId: inboxId,
    from: CUSTOM_EMAIL
  };
}
