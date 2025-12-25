import { storage } from './storage';
import { sendEmail, sendSMS, formatPhoneNumber, isValidPhone, isValidEmail } from './communication-services';
import type { Client, Caregiver, InsertBirthdayNotification } from '@shared/schema';

const BIRTHDAY_EMAIL_SUBJECT = 'Happy Birthday from Home Care!';

function getClientBirthdayMessage(firstName: string): string {
  return `Happy Birthday, ${firstName}! 🎂 Wishing you a wonderful day filled with joy and happiness. From all of us at Home Care.`;
}

function getCaregiverBirthdayMessage(firstName: string): string {
  return `Happy Birthday, ${firstName}! 🎉 Thank you for all you do for our clients. Wishing you a fantastic birthday and a wonderful year ahead! From the Home Care team.`;
}

function getBirthdayEmailHtml(firstName: string, isCaregiver: boolean): string {
  const message = isCaregiver
    ? `Thank you for all you do for our clients. Wishing you a fantastic birthday and a wonderful year ahead!`
    : `Wishing you a wonderful day filled with joy and happiness.`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; margin-bottom: 20px;">
        <h1 style="color: white; margin: 0; font-size: 32px;">🎂 Happy Birthday! 🎉</h1>
      </div>
      <div style="padding: 20px; background: #f8f9fa; border-radius: 10px;">
        <p style="font-size: 18px; color: #333;">Dear ${firstName},</p>
        <p style="font-size: 16px; color: #555; line-height: 1.6;">${message}</p>
        <p style="font-size: 16px; color: #555;">Best wishes,<br>The Home Care Team</p>
      </div>
      <div style="text-align: center; padding: 20px; color: #888; font-size: 12px;">
        <p>This is an automated birthday message from Home Care.</p>
      </div>
    </div>
  `;
}

export interface BirthdaySendResult {
  recipientType: 'client' | 'caregiver';
  recipientId: string;
  recipientName: string;
  smsStatus: 'sent' | 'failed' | 'skipped';
  emailStatus: 'sent' | 'failed' | 'skipped';
  smsError?: string;
  emailError?: string;
}

async function sendBirthdayToClient(client: Client): Promise<BirthdaySendResult> {
  const firstName = client.firstName;
  const fullName = `${client.firstName} ${client.lastName}`;
  const result: BirthdaySendResult = {
    recipientType: 'client',
    recipientId: client.id,
    recipientName: fullName,
    smsStatus: 'skipped',
    emailStatus: 'skipped',
  };

  // Send SMS if phone is available
  if (client.phone && isValidPhone(client.phone)) {
    try {
      const smsResult = await sendSMS({
        to: formatPhoneNumber(client.phone),
        body: getClientBirthdayMessage(firstName),
      });
      result.smsStatus = smsResult.success ? 'sent' : 'failed';
      if (!smsResult.success) {
        result.smsError = smsResult.error;
      }
    } catch (error: any) {
      result.smsStatus = 'failed';
      result.smsError = error.message || 'Unknown SMS error';
    }
  }

  // Send email if available
  if (client.email && isValidEmail(client.email)) {
    try {
      const emailResult = await sendEmail({
        to: client.email,
        subject: BIRTHDAY_EMAIL_SUBJECT,
        text: getClientBirthdayMessage(firstName),
        html: getBirthdayEmailHtml(firstName, false),
      });
      result.emailStatus = emailResult.success ? 'sent' : 'failed';
      if (!emailResult.success) {
        result.emailError = emailResult.error;
      }
    } catch (error: any) {
      result.emailStatus = 'failed';
      result.emailError = error.message || 'Unknown email error';
    }
  }

  return result;
}

async function sendBirthdayToCaregiver(caregiver: Caregiver): Promise<BirthdaySendResult> {
  const firstName = caregiver.firstName || 'Team Member';
  const fullName = `${caregiver.firstName || ''} ${caregiver.lastName || ''}`.trim() || 'Unknown Caregiver';
  const result: BirthdaySendResult = {
    recipientType: 'caregiver',
    recipientId: caregiver.id,
    recipientName: fullName,
    smsStatus: 'skipped',
    emailStatus: 'skipped',
  };

  // Send SMS if phone is available
  if (caregiver.phone && isValidPhone(caregiver.phone)) {
    try {
      const smsResult = await sendSMS({
        to: formatPhoneNumber(caregiver.phone),
        body: getCaregiverBirthdayMessage(firstName),
      });
      result.smsStatus = smsResult.success ? 'sent' : 'failed';
      if (!smsResult.success) {
        result.smsError = smsResult.error;
      }
    } catch (error: any) {
      result.smsStatus = 'failed';
      result.smsError = error.message || 'Unknown SMS error';
    }
  }

  // Send email if available
  if (caregiver.email && isValidEmail(caregiver.email)) {
    try {
      const emailResult = await sendEmail({
        to: caregiver.email,
        subject: BIRTHDAY_EMAIL_SUBJECT,
        text: getCaregiverBirthdayMessage(firstName),
        html: getBirthdayEmailHtml(firstName, true),
      });
      result.emailStatus = emailResult.success ? 'sent' : 'failed';
      if (!emailResult.success) {
        result.emailError = emailResult.error;
      }
    } catch (error: any) {
      result.emailStatus = 'failed';
      result.emailError = error.message || 'Unknown email error';
    }
  }

  return result;
}

export async function sendTodaysBirthdayNotifications(officeId?: string): Promise<BirthdaySendResult[]> {
  const results: BirthdaySendResult[] = [];
  
  try {
    const { clients, caregivers } = await storage.getTodaysBirthdays(officeId);
    console.log(`[Birthday Service] Found ${clients.length} clients and ${caregivers.length} caregivers with birthdays today`);

    const today = new Date().toISOString().split('T')[0];

    // Send birthday wishes to clients
    for (const client of clients) {
      // Check if notification was already sent today for this recipient
      const alreadySent = await storage.checkBirthdayNotificationSentToday('client', client.id, today);
      if (alreadySent) {
        console.log(`[Birthday Service] Skipping client ${client.firstName} ${client.lastName} - already sent today`);
        results.push({
          recipientType: 'client',
          recipientId: client.id,
          recipientName: `${client.firstName} ${client.lastName}`,
          smsStatus: 'skipped',
          emailStatus: 'skipped',
        });
        continue;
      }

      // Log to database FIRST (pending) to prevent duplicate sends
      const notification: InsertBirthdayNotification = {
        recipientType: 'client',
        recipientId: client.id,
        recipientName: `${client.firstName} ${client.lastName}`,
        channel: 'both',
        smsStatus: 'skipped',
        emailStatus: 'skipped',
        birthdayDate: client.dateOfBirth!,
        officeId: client.officeId,
      };
      const loggedNotification = await storage.createBirthdayNotification(notification);

      // Send notifications
      const result = await sendBirthdayToClient(client);
      results.push(result);
      
      // Update notification status
      await storage.updateBirthdayNotificationStatus(
        loggedNotification.id,
        result.smsStatus,
        result.emailStatus,
        result.smsError,
        result.emailError
      );
    }

    // Send birthday wishes to caregivers
    for (const caregiver of caregivers) {
      // Check if notification was already sent today for this recipient
      const alreadySent = await storage.checkBirthdayNotificationSentToday('caregiver', caregiver.id, today);
      if (alreadySent) {
        console.log(`[Birthday Service] Skipping caregiver ${caregiver.firstName} ${caregiver.lastName} - already sent today`);
        results.push({
          recipientType: 'caregiver',
          recipientId: caregiver.id,
          recipientName: `${caregiver.firstName || ''} ${caregiver.lastName || ''}`.trim(),
          smsStatus: 'skipped',
          emailStatus: 'skipped',
        });
        continue;
      }

      // Log to database FIRST (pending) to prevent duplicate sends
      const notification: InsertBirthdayNotification = {
        recipientType: 'caregiver',
        recipientId: caregiver.id,
        recipientName: `${caregiver.firstName || ''} ${caregiver.lastName || ''}`.trim(),
        channel: 'both',
        smsStatus: 'skipped',
        emailStatus: 'skipped',
        birthdayDate: caregiver.dateOfBirth!,
        officeId: caregiver.officeId,
      };
      const loggedNotification = await storage.createBirthdayNotification(notification);

      // Send notifications
      const result = await sendBirthdayToCaregiver(caregiver);
      results.push(result);
      
      // Update notification status
      await storage.updateBirthdayNotificationStatus(
        loggedNotification.id,
        result.smsStatus,
        result.emailStatus,
        result.smsError,
        result.emailError
      );
    }

    console.log(`[Birthday Service] Processed ${results.length} birthday notifications`);
    return results;
  } catch (error) {
    console.error('[Birthday Service] Error sending birthday notifications:', error);
    throw error;
  }
}

export async function getUpcomingBirthdays(days: number = 7, officeId?: string) {
  return await storage.getUpcomingBirthdays(days, officeId);
}

export async function getBirthdayNotificationHistory(officeId?: string, limit?: number) {
  return await storage.getBirthdayNotifications(officeId, limit);
}
