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
    baseUrl,
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
  
  try {
    return await sendEmailWithOptions({ to, subject, html, text });
  } catch (err: any) {
    console.error(`[sendTemplatedEmail] Failed to send ${templateType} email to ${to}:`, err.message || err);
    return { success: false, error: err.message || String(err) } as any;
  }
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

  if (inboxes.length > 0) {
    const first = inboxes[0];
    cachedCustomInboxId = first.inbox_id || first.inboxId;
    console.log(`Custom inbox not found; reusing first available inbox: ${first.username}@${first.domain} (${cachedCustomInboxId})`);
    return cachedCustomInboxId!;
  }

  console.log('No inboxes found, creating new inbox for sending');
  const newInbox = await client.inboxes.create({});
  cachedCustomInboxId = (newInbox as any).inbox_id || (newInbox as any).inboxId;
  return cachedCustomInboxId!;
}

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  fromName?: string;
}

const BRAND_PRIMARY = "#0066cc";
const BRAND_SECONDARY = "#0d8a7c";
const BRAND_TEXT = "#1a1a2e";
const BRAND_MUTED = "#6b7280";
const BRAND_BG = "#f8fafc";
const BRAND_CARD = "#ffffff";

function getBrandConfig() {
  const baseUrl = process.env.BASE_URL || "https://portal.carechc.com";
  const companyName = process.env.COMPANY_NAME || "CCHC Solutions";
  return {
    baseUrl,
    companyName,
    logoUrl: `${baseUrl}/logo.png`,
    currentYear: new Date().getFullYear().toString(),
  };
}

function buildEmailFooter(config: ReturnType<typeof getBrandConfig>): string {
  return `
  <tr>
    <td style="padding:24px 24px 16px;background:${BRAND_BG};text-align:center;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="padding:16px 0;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0 0 8px;font-size:13px;color:${BRAND_MUTED};font-family:Arial,Helvetica,sans-serif;">
              ${config.companyName} &copy; ${config.currentYear}
            </p>
            <p style="margin:0 0 12px;font-size:12px;color:${BRAND_MUTED};font-family:Arial,Helvetica,sans-serif;">
              HIPAA-Compliant Home Care Management
            </p>
            <p style="margin:0;font-size:12px;font-family:Arial,Helvetica,sans-serif;">
              <a href="${config.baseUrl}" style="color:${BRAND_PRIMARY};text-decoration:none;font-weight:500;">Visit Portal</a>
              <span style="color:#cbd5e1;margin:0 8px;">|</span>
              <a href="${config.baseUrl}/login" style="color:${BRAND_PRIMARY};text-decoration:none;font-weight:500;">Staff Login</a>
              <span style="color:#cbd5e1;margin:0 8px;">|</span>
              <a href="${config.baseUrl}/caregiver-login" style="color:${BRAND_PRIMARY};text-decoration:none;font-weight:500;">Caregiver Portal</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:0 24px 24px;background:${BRAND_BG};text-align:center;">
      <p style="margin:0;font-size:11px;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;">
        This is an automated system message. Do not reply directly to this email.
      </p>
    </td>
  </tr>`;
}

function isFullHtmlDocument(content: string): boolean {
  const trimmed = content.trim().toLowerCase();
  return trimmed.includes("<!doctype html") || trimmed.includes("<html");
}

export function wrapEmailWithBrand(contentHtml: string, title?: string): string {
  if (isFullHtmlDocument(contentHtml)) {
    return contentHtml;
  }

  const config = getBrandConfig();
  const footer = buildEmailFooter(config);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${title || config.companyName}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND_BG};font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${BRAND_BG};">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;background:${BRAND_CARD};border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05),0 2px 4px -1px rgba(0,0,0,0.03);">
          <tr>
            <td style="padding:24px 24px 16px;text-align:center;border-bottom:1px solid #f1f5f9;">
              <a href="${config.baseUrl}" style="display:inline-block;text-decoration:none;">
                <img src="${config.logoUrl}" alt="${config.companyName}" width="120" height="auto" style="display:block;margin:0 auto;border:0;max-width:120px;">
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;font-size:15px;line-height:1.6;color:${BRAND_TEXT};font-family:Arial,Helvetica,sans-serif;">
              ${contentHtml}
            </td>
          </tr>
          ${footer}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
    draftOptions.html = wrapEmailWithBrand(options.html, options.subject);
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

export interface EmailAttachment {
  filename: string;
  contentType: string;
  /** Base64-encoded file content */
  content: string;
}

// The drafts API used by sendEmailWithOptions doesn't support attachments;
// the direct messages.send API does.
export async function sendEmailWithAttachments(options: EmailOptions & { attachments: EmailAttachment[] }) {
  const client = await getAgentMailClient();
  const inboxId = await getCustomInboxId();

  const sendResponse = await client.inboxes.messages.send(inboxId, {
    to: [options.to],
    subject: options.subject,
    ...(options.html ? { html: wrapEmailWithBrand(options.html, options.subject) } : {}),
    ...(options.text ? { text: options.text } : {}),
    attachments: options.attachments.map((a) => ({
      filename: a.filename,
      contentType: a.contentType,
      content: a.content,
    })),
  });

  console.log(`Email with ${options.attachments.length} attachment(s) sent from ${CUSTOM_EMAIL} to ${options.to}`);

  return {
    success: true,
    messageId: (sendResponse as any).message_id || (sendResponse as any).messageId,
    inboxId,
    from: CUSTOM_EMAIL,
  };
}
