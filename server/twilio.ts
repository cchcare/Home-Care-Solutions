import twilio from 'twilio';
import type { Express, Request, Response } from 'express';
import { db } from './db';
import { smsLogs, users, caregivers, clients } from '@shared/schema';
import { eq } from 'drizzle-orm';

function getCredentials() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !phoneNumber) {
    throw new Error('Twilio credentials not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.');
  }

  return { accountSid, authToken, phoneNumber };
}

export function getTwilioClient() {
  const { accountSid, authToken } = getCredentials();
  return twilio(accountSid, authToken);
}

export function getTwilioFromPhoneNumber() {
  const { phoneNumber } = getCredentials();
  return phoneNumber;
}

function getBaseUrl(): string | null {
  const deploymentUrl = process.env.REPLIT_DEPLOYMENT_URL;
  const devDomain = process.env.REPLIT_DEV_DOMAIN;
  
  if (deploymentUrl) return `https://${deploymentUrl}`;
  if (devDomain) return `https://${devDomain}`;
  return null;
}

function normalizePhoneForLookup(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1);
  }
  if (digits.length === 10) {
    return digits;
  }
  return digits;
}

export async function sendSMS(to: string, message: string) {
  const client = getTwilioClient();
  const fromNumber = getTwilioFromPhoneNumber();
  
  const baseUrl = getBaseUrl();
  const messageOptions: any = {
    body: message,
    from: fromNumber,
    to: to,
  };
  
  if (baseUrl) {
    messageOptions.statusCallback = `${baseUrl}/api/twilio/status`;
  }
  
  const result = await client.messages.create(messageOptions);
  
  await db.insert(smsLogs).values({
    messageSid: result.sid,
    direction: 'outbound',
    fromNumber: fromNumber,
    toNumber: to,
    body: message,
    status: result.status as any,
  });
  
  return {
    success: true,
    messageSid: result.sid,
    status: result.status
  };
}

async function findContactByPhone(phone: string) {
  const normalized = normalizePhoneForLookup(phone);
  const e164 = phone;
  const with1 = `+1${normalized}`;
  const tenDigit = normalized;
  
  const allUsers = await db.select().from(users).where(eq(users.isActive, true));
  for (const user of allUsers) {
    if (user.mobilePhone) {
      const userNormalized = normalizePhoneForLookup(user.mobilePhone);
      if (userNormalized === tenDigit) {
        return { userId: user.id, organizationId: user.organizationId };
      }
    }
  }
  
  const allCaregivers = await db.select().from(caregivers).where(eq(caregivers.status, 'active'));
  for (const caregiver of allCaregivers) {
    if (caregiver.phone) {
      const caregiverNormalized = normalizePhoneForLookup(caregiver.phone);
      if (caregiverNormalized === tenDigit) {
        return { caregiverId: caregiver.id };
      }
    }
  }
  
  const allClients = await db.select().from(clients).where(eq(clients.status, 'active'));
  for (const client of allClients) {
    if (client.phone) {
      const clientNormalized = normalizePhoneForLookup(client.phone);
      if (clientNormalized === tenDigit) {
        return { clientId: client.id };
      }
    }
  }
  
  return {};
}

export function validateTwilioRequest(req: Request): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return false;
  
  const twilioSignature = req.headers['x-twilio-signature'] as string;
  if (!twilioSignature) return false;
  
  const baseUrl = process.env.REPLIT_DEPLOYMENT_URL || process.env.REPLIT_DEV_DOMAIN;
  const protocol = baseUrl ? 'https://' : 'http://';
  const host = baseUrl || req.headers.host || 'localhost:5000';
  const url = `${protocol}${host}${req.originalUrl}`;
  
  return twilio.validateRequest(authToken, twilioSignature, url, req.body);
}

export function setupTwilioWebhooks(app: Express) {
  app.post('/api/twilio/incoming', async (req: Request, res: Response) => {
    try {
      if (process.env.NODE_ENV === 'production' && !validateTwilioRequest(req)) {
        console.log('[Twilio Webhook] Invalid signature - rejecting request');
        return res.status(403).send('Invalid signature');
      }
      
      const {
        MessageSid,
        From,
        To,
        Body,
        NumMedia,
        NumSegments,
      } = req.body;
      
      console.log(`[Twilio Webhook] Incoming SMS from ${From}: ${Body?.substring(0, 50)}...`);
      
      const contact = await findContactByPhone(From);
      
      const mediaUrls: string[] = [];
      const numMedia = parseInt(NumMedia || '0', 10);
      for (let i = 0; i < numMedia; i++) {
        const mediaUrl = req.body[`MediaUrl${i}`];
        if (mediaUrl) mediaUrls.push(mediaUrl);
      }
      
      await db.insert(smsLogs).values({
        messageSid: MessageSid,
        direction: 'inbound',
        fromNumber: From,
        toNumber: To,
        body: Body,
        status: 'received',
        numSegments: NumSegments ? parseInt(NumSegments, 10) : undefined,
        numMedia: numMedia || undefined,
        mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
        ...contact,
      });
      
      res.type('text/xml');
      res.send('<Response></Response>');
    } catch (error) {
      console.error('[Twilio Webhook] Error processing incoming SMS:', error);
      res.type('text/xml');
      res.send('<Response></Response>');
    }
  });
  
  app.post('/api/twilio/status', async (req: Request, res: Response) => {
    try {
      if (process.env.NODE_ENV === 'production' && !validateTwilioRequest(req)) {
        console.log('[Twilio Webhook] Invalid signature on status callback - rejecting');
        return res.status(403).send('Invalid signature');
      }
      
      const {
        MessageSid,
        MessageStatus,
        ErrorCode,
        ErrorMessage,
      } = req.body;
      
      console.log(`[Twilio Webhook] Status update for ${MessageSid}: ${MessageStatus}`);
      
      const updateData: any = {
        status: MessageStatus,
        updatedAt: new Date(),
      };
      
      if (ErrorCode) updateData.errorCode = ErrorCode;
      if (ErrorMessage) updateData.errorMessage = ErrorMessage;
      
      await db.update(smsLogs)
        .set(updateData)
        .where(eq(smsLogs.messageSid, MessageSid));
      
      res.sendStatus(200);
    } catch (error) {
      console.error('[Twilio Webhook] Error processing status callback:', error);
      res.sendStatus(200);
    }
  });
  
  console.log('[Twilio] Webhook endpoints registered: /api/twilio/incoming, /api/twilio/status');
}
