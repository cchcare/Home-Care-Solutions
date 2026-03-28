import { AgentMailClient } from 'agentmail';
import { storage } from './storage';
import type { EmailTemplate } from '@shared/schema';

let connectionSettings: any;
let cachedCustomInboxId: string | null = null;

const CUSTOM_EMAIL = 'donotreply@app.carechc.com';
const CUSTOM_USERNAME = 'donotreply';
const CUSTOM_DOMAIN = 'app.carechc.com';

export type EmailTemplateTypeValue = 'password_reset' | 'password_reset_caregiver' | 'signup_confirmation' | 'user_invitation' | 'welcome' | 'welcome_caregiver' | 'family_portal_invitation' | 'birthday_client' | 'birthday_caregiver' | 'schedule_change' | 'schedule_reminder' | 'evv_confirmation' | 'compliance_alert' | 'incident_report_notification' | 'esignature_request' | 'general';

export interface TemplatePlaceholders {
  [key: string]: string;
}

export async function getDefaultTemplate(type: EmailTemplateTypeValue): Promise<EmailTemplate | null> {
  try {
    const allTemplates = await storage.getEmailTemplates();
    const templates = allTemplates.filter((t: EmailTemplate) => t.type === type);
    const defaultTemplate = templates.find((t: EmailTemplate) => t.isDefault && t.isActive);
    if (defaultTemplate) {
      return defaultTemplate;
    }
    const activeTemplate = templates.find((t: EmailTemplate) => t.isActive);
    return activeTemplate || null;
  } catch (error) {
    console.error(`Error fetching template for type ${type}:`, error);
    return null;
  }
}

export function replacePlaceholders(content: string, placeholders: TemplatePlaceholders): string {
  let result = content;
  for (const [key, value] of Object.entries(placeholders)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
}

export function hasUnresolvedPlaceholders(content: string): boolean {
  const placeholderPattern = /\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}/;
  return placeholderPattern.test(content);
}

export function getUnresolvedPlaceholders(content: string): string[] {
  const placeholderPattern = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
  const matches: string[] = [];
  let match;
  while ((match = placeholderPattern.exec(content)) !== null) {
    if (!matches.includes(match[1])) {
      matches.push(match[1]);
    }
  }
  return matches;
}

function removeUnresolvedPlaceholders(content: string): string {
  return content.replace(/\{\{[a-zA-Z_][a-zA-Z0-9_]*\}\}/g, '');
}

function buildGlobalDefaults(): TemplatePlaceholders {
  const baseUrl = process.env.BASE_URL || 'https://app.carechc.com';
  return {
    companyName: process.env.COMPANY_NAME || 'CCHC Solutions',
    currentYear: new Date().getFullYear().toString(),
    portalUrl: `${baseUrl}/caregiver-login`,
    loginUrl: `${baseUrl}/login`,
  };
}

export async function sendTemplatedEmail(
  to: string,
  templateType: EmailTemplateTypeValue,
  placeholders: TemplatePlaceholders,
  fallbackSubject: string,
  fallbackHtml: string,
  fallbackText?: string
) {
  const template = await getDefaultTemplate(templateType);

  // Merge global defaults first so callsite-provided values always win
  const enrichedPlaceholders: TemplatePlaceholders = {
    ...buildGlobalDefaults(),
    ...placeholders,
  };
  
  let subject: string;
  let html: string;
  let text: string | undefined;
  
  if (template && template.isActive) {
    let processedSubject = replacePlaceholders(template.subject, enrichedPlaceholders);
    let processedHtml = replacePlaceholders(template.htmlContent, enrichedPlaceholders);
    let processedText = template.textContent ? replacePlaceholders(template.textContent, enrichedPlaceholders) : undefined;
    
    const unresolvedInSubject = getUnresolvedPlaceholders(processedSubject);
    const unresolvedInHtml = getUnresolvedPlaceholders(processedHtml);
    const allUnresolved = Array.from(new Set([...unresolvedInSubject, ...unresolvedInHtml]));
    
    if (allUnresolved.length > 0) {
      console.warn(`[Email Templates] Template "${template.name}" (${templateType}) has unresolved placeholders: ${allUnresolved.join(', ')}. Removing unresolved placeholders.`);
      processedSubject = removeUnresolvedPlaceholders(processedSubject);
      processedHtml = removeUnresolvedPlaceholders(processedHtml);
      if (processedText) {
        processedText = removeUnresolvedPlaceholders(processedText);
      }
    }
    
    subject = processedSubject;
    html = processedHtml;
    text = processedText;
    console.log(`[Email Templates] Using template "${template.name}" for ${templateType} email to ${to}`);
  } else {
    subject = fallbackSubject;
    html = fallbackHtml;
    text = fallbackText;
    console.log(`[Email Templates] No active template found for ${templateType}, using fallback for ${to}`);
  }
  
  return sendEmailWithOptions({ to, subject, html, text });
}

async function getCredentials() {
  // When running on AWS (or any non-Replit host), read credentials directly from env vars.
  if (process.env.AGENTMAIL_API_KEY) {
    return { apiKey: process.env.AGENTMAIL_API_KEY };
  }

  // Replit connector path — requires REPLIT_CONNECTORS_HOSTNAME + identity token
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!hostname || !xReplitToken) {
    throw new Error('AgentMail not configured: set AGENTMAIL_API_KEY, or REPLIT_CONNECTORS_HOSTNAME + REPL_IDENTITY');
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
