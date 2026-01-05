import { storage } from './storage';
import { sendEmail, sendSMS, formatPhoneNumber, isValidPhone, isValidEmail } from './communication-services';
import { sendTemplatedEmail } from './agentmail';
import type { Client, Caregiver, InsertBirthdayNotification } from '@shared/schema';

const BIRTHDAY_EMAIL_SUBJECT = '🎂 Happy Birthday from Home Care!';

interface BirthdayMessageSettings {
  clientSmsMessage: string;
  caregiverSmsMessage: string;
  clientEmailMessage: string;
  caregiverEmailMessage: string;
  emailSubject: string;
}

const DEFAULT_MESSAGES: BirthdayMessageSettings = {
  clientSmsMessage: "Happy Birthday, {{firstName}}! 🎂🎉 On your special day, we want you to know how much you mean to us. Wishing you joy, health, and happiness! With love, The Home Care Family 💙",
  caregiverSmsMessage: "Happy Birthday, {{firstName}}! 🎂🎉 Thank you for being such an amazing part of our caregiving family. Your dedication makes a real difference! Wishing you an incredible day! 💙 - Home Care",
  clientEmailMessage: "On this special day, we want you to know how much you mean to us. May your birthday be filled with love, laughter, and wonderful memories.",
  caregiverEmailMessage: "Thank you for being such a valued member of our caregiving family. Your dedication, compassion, and hard work make a real difference in the lives of those we serve.",
  emailSubject: "🎂 Happy Birthday from Home Care!"
};

async function getBirthdaySettings(): Promise<BirthdayMessageSettings> {
  try {
    const setting = await storage.getSystemSetting('birthday_messages');
    if (setting && setting.value) {
      const customSettings = typeof setting.value === 'string' 
        ? JSON.parse(setting.value) 
        : setting.value;
      return { ...DEFAULT_MESSAGES, ...customSettings };
    }
  } catch (e) {
    console.log('[Birthday Service] Using default messages');
  }
  return DEFAULT_MESSAGES;
}

function replacePlaceholders(message: string, firstName: string): string {
  return message.replace(/\{\{firstName\}\}/g, firstName);
}

async function getClientBirthdayMessage(firstName: string): Promise<string> {
  const settings = await getBirthdaySettings();
  return replacePlaceholders(settings.clientSmsMessage, firstName);
}

async function getCaregiverBirthdayMessage(firstName: string): Promise<string> {
  const settings = await getBirthdaySettings();
  return replacePlaceholders(settings.caregiverSmsMessage, firstName);
}

function getBirthdayEmailHtml(firstName: string, isCaregiver: boolean, customMessage?: string): string {
  const defaultMessage = isCaregiver
    ? `Thank you for being such a valued member of our caregiving family. Your dedication, compassion, and hard work make a real difference in the lives of those we serve.`
    : `On this special day, we want you to know how much you mean to us. May your birthday be filled with love, laughter, and wonderful memories.`;
  
  const message = customMessage || defaultMessage;
  const recipientType = isCaregiver ? 'team member' : 'client';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f4f8;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f0f4f8;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
          
          <!-- Decorative Header with Confetti Pattern -->
          <tr>
            <td style="background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 25%, #FED330 50%, #4ECDC4 75%, #A855F7 100%); padding: 50px 40px; text-align: center; position: relative;">
              <div style="font-size: 60px; margin-bottom: 10px;">🎂</div>
              <h1 style="color: white; margin: 0; font-size: 42px; font-weight: 800; text-shadow: 2px 2px 4px rgba(0,0,0,0.2); letter-spacing: -1px;">
                Happy Birthday!
              </h1>
              <div style="font-size: 36px; margin-top: 10px;">🎈 🎉 🎁 🎊 🌟</div>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 50px 40px;">
              <p style="font-size: 24px; color: #1a1a2e; margin: 0 0 20px 0; font-weight: 600;">
                Dear ${firstName},
              </p>
              <p style="font-size: 18px; color: #4a4a6a; line-height: 1.8; margin: 0 0 25px 0;">
                ${message}
              </p>
              <p style="font-size: 18px; color: #4a4a6a; line-height: 1.8; margin: 0 0 30px 0;">
                Wishing you a year ahead filled with health, happiness, and countless beautiful moments!
              </p>
              
              <!-- Decorative Divider -->
              <div style="text-align: center; margin: 30px 0;">
                <span style="display: inline-block; width: 60px; height: 3px; background: linear-gradient(90deg, #FF6B6B, #4ECDC4); border-radius: 2px;"></span>
              </div>
              
              <p style="font-size: 18px; color: #1a1a2e; margin: 0; font-weight: 600;">
                With warm wishes,
              </p>
              <p style="font-size: 20px; color: #4ECDC4; margin: 8px 0 0 0; font-weight: 700;">
                The Home Care Family 💙
              </p>
            </td>
          </tr>
          
          <!-- Birthday Cake Section -->
          <tr>
            <td style="padding: 0 40px 40px 40px; text-align: center;">
              <div style="background: linear-gradient(135deg, #FFF5F5 0%, #F0FDFF 100%); border-radius: 16px; padding: 30px; border: 2px dashed #FFB6C1;">
                <p style="font-size: 16px; color: #6b6b8a; margin: 0; font-style: italic;">
                  "Another year older, another year wiser, and another year to make amazing memories!"
                </p>
                <div style="font-size: 32px; margin-top: 15px;">🎂✨🎂</div>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 14px; color: #94a3b8; margin: 0 0 10px 0;">
                This birthday greeting was sent with love from Home Care
              </p>
              <p style="font-size: 12px; color: #cbd5e1; margin: 0;">
                Caring for you, always 💙
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
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

  // Get custom messages
  const settings = await getBirthdaySettings();
  const smsMessage = replacePlaceholders(settings.clientSmsMessage, firstName);
  const emailMessage = replacePlaceholders(settings.clientEmailMessage, firstName);

  // Send SMS if phone is available
  if (client.phone && isValidPhone(client.phone)) {
    try {
      const smsResult = await sendSMS({
        to: formatPhoneNumber(client.phone),
        body: smsMessage,
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
      const emailResult = await sendTemplatedEmail(
        client.email,
        "birthday_client",
        {
          firstName: firstName,
          lastName: client.lastName || "",
          companyName: "CCHC Solutions",
          currentYear: new Date().getFullYear().toString(),
        },
        settings.emailSubject,
        getBirthdayEmailHtml(firstName, false, emailMessage),
        smsMessage
      );
      result.emailStatus = emailResult.success ? 'sent' : 'failed';
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

  // Get custom messages
  const settings = await getBirthdaySettings();
  const smsMessage = replacePlaceholders(settings.caregiverSmsMessage, firstName);
  const emailMessage = replacePlaceholders(settings.caregiverEmailMessage, firstName);

  // Send SMS if phone is available
  if (caregiver.phone && isValidPhone(caregiver.phone)) {
    try {
      const smsResult = await sendSMS({
        to: formatPhoneNumber(caregiver.phone),
        body: smsMessage,
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
      const emailResult = await sendTemplatedEmail(
        caregiver.email,
        "birthday_caregiver",
        {
          firstName: firstName,
          lastName: caregiver.lastName || "",
          companyName: "CCHC Solutions",
          currentYear: new Date().getFullYear().toString(),
        },
        settings.emailSubject,
        getBirthdayEmailHtml(firstName, true, emailMessage),
        smsMessage
      );
      result.emailStatus = emailResult.success ? 'sent' : 'failed';
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
