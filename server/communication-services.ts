import twilio from 'twilio';
import { sendEmailWithOptions } from './agentmail';

// Twilio SMS Service
let twilioClient: any = null;

if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

export interface EmailParams {
  to: string;
  from?: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface SMSParams {
  to: string;
  from?: string;
  body: string;
}

export async function sendEmail(params: EmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const result = await sendEmailWithOptions({
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
      fromName: params.from
    });
    return { 
      success: result.success, 
      messageId: result.messageId
    };
  } catch (error: any) {
    console.error('AgentMail email error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to send email' 
    };
  }
}

export async function sendSMS(params: SMSParams): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  if (!twilioClient) {
    return { success: false, error: "Twilio credentials not configured" };
  }

  try {
    const message = await twilioClient.messages.create({
      body: params.body,
      from: params.from || process.env.TWILIO_PHONE_NUMBER || '+1234567890',
      to: params.to,
    });

    return { 
      success: true, 
      messageSid: message.sid 
    };
  } catch (error: any) {
    console.error('Twilio SMS error:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to send SMS' 
    };
  }
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate phone number format (basic US format)
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?1?[2-9]\d{2}[2-9]\d{2}\d{4}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

// Format phone number for Twilio (add +1 if missing)
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+1')) return cleaned;
  if (cleaned.startsWith('1')) return `+${cleaned}`;
  return `+1${cleaned}`;
}