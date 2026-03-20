import { storage } from './storage';
import { sendEmail, sendSMS, formatPhoneNumber, isValidPhone, isValidEmail } from './communication-services';
import { sendTemplatedEmail } from './agentmail';
import type { 
  NotificationTemplate, 
  NotificationQueueItem, 
  InsertNotificationQueueItem,
  NotificationPreference,
  Client,
  Caregiver,
  User,
  ClientSchedule
} from '@shared/schema';

export interface QueueNotificationParams {
  recipientType: 'user' | 'client' | 'caregiver';
  recipientId: string;
  templateName?: string;
  subject?: string;
  body: string;
  channel?: 'sms' | 'email';
  scheduledFor?: Date;
  variables?: Record<string, string>;
}

export interface NotificationResult {
  success: boolean;
  channel: 'sms' | 'email';
  externalId?: string;
  error?: string;
}

function replaceVariables(text: string, variables: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  return result;
}

async function getRecipientContact(
  recipientType: 'user' | 'client' | 'caregiver',
  recipientId: string,
  channel: 'sms' | 'email'
): Promise<{ contact: string | null; name: string }> {
  if (recipientType === 'user') {
    const user = await storage.getUser(recipientId);
    if (!user) return { contact: null, name: 'Unknown' };
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User';
    if (channel === 'email') {
      return { contact: user.email || null, name };
    } else {
      return { contact: user.mobilePhone || null, name };
    }
  } else if (recipientType === 'client') {
    const client = await storage.getClient(recipientId);
    if (!client) return { contact: null, name: 'Unknown' };
    const name = `${client.firstName} ${client.lastName}`;
    if (channel === 'email') {
      return { contact: client.email || null, name };
    } else {
      return { contact: client.phone || null, name };
    }
  } else if (recipientType === 'caregiver') {
    const caregiver = await storage.getCaregiver(recipientId);
    if (!caregiver) return { contact: null, name: 'Unknown' };
    const name = `${caregiver.firstName || ''} ${caregiver.lastName || ''}`.trim() || 'Caregiver';
    if (channel === 'email') {
      return { contact: caregiver.email || null, name };
    } else {
      return { contact: caregiver.phone || null, name };
    }
  }
  return { contact: null, name: 'Unknown' };
}

async function checkQuietHours(userId: string): Promise<boolean> {
  const prefs = await storage.getNotificationPreferences(userId);
  if (!prefs || !prefs.quietHoursStart || !prefs.quietHoursEnd) {
    return false;
  }

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  const start = prefs.quietHoursStart;
  const end = prefs.quietHoursEnd;

  if (start <= end) {
    return currentTime >= start && currentTime <= end;
  } else {
    return currentTime >= start || currentTime <= end;
  }
}

export async function queueNotification(params: QueueNotificationParams): Promise<NotificationQueueItem[]> {
  const { recipientType, recipientId, templateName, subject, body, channel, scheduledFor, variables } = params;
  const results: NotificationQueueItem[] = [];

  let template: NotificationTemplate | undefined;
  let finalBody = body;
  let finalSubject = subject;

  if (templateName) {
    template = await storage.getNotificationTemplateByName(templateName);
    if (template && template.isActive) {
      finalBody = variables ? replaceVariables(template.body, variables) : template.body;
      finalSubject = template.subject ? (variables ? replaceVariables(template.subject, variables) : template.subject) : subject;
    }
  }

  if (variables) {
    finalBody = replaceVariables(finalBody, variables);
    if (finalSubject) {
      finalSubject = replaceVariables(finalSubject, variables);
    }
  }

  const channelsToSend: ('sms' | 'email')[] = channel 
    ? [channel] 
    : (template?.type === 'both' ? ['sms', 'email'] : template?.type ? [template.type] : ['email']);

  for (const ch of channelsToSend) {
    const { contact } = await getRecipientContact(recipientType, recipientId, ch);
    
    const queueItem: InsertNotificationQueueItem = {
      recipientType,
      recipientId,
      channel: ch,
      templateId: template?.id,
      subject: ch === 'email' ? finalSubject : undefined,
      body: finalBody,
      recipientContact: contact,
      scheduledFor,
      status: 'pending',
      retryCount: 0,
    };

    const created = await storage.createNotificationQueueItem(queueItem);
    results.push(created);
  }

  return results;
}

export async function processNotificationQueue(): Promise<{
  processed: number;
  sent: number;
  failed: number;
  results: NotificationResult[];
}> {
  const pending = await storage.getPendingNotifications();
  const results: NotificationResult[] = [];
  let sent = 0;
  let failed = 0;

  for (const notification of pending) {
    const result = await sendNotification(notification);
    results.push(result);

    if (result.success) {
      sent++;
      await storage.updateNotificationQueueItem(notification.id, {
        status: 'sent',
        sentAt: new Date(),
        externalId: result.externalId,
      });
    } else {
      const retryCount = (notification.retryCount || 0) + 1;
      const maxRetries = 3;

      if (retryCount >= maxRetries) {
        failed++;
        await storage.updateNotificationQueueItem(notification.id, {
          status: 'failed',
          errorMessage: result.error,
          retryCount,
        });
      } else {
        await storage.updateNotificationQueueItem(notification.id, {
          errorMessage: result.error,
          retryCount,
        });
      }
    }
  }

  return {
    processed: pending.length,
    sent,
    failed,
    results,
  };
}

async function sendNotification(notification: NotificationQueueItem): Promise<NotificationResult> {
  const contact = notification.recipientContact;

  if (!contact) {
    return {
      success: false,
      channel: notification.channel,
      error: 'No contact information available',
    };
  }

  if (notification.channel === 'sms') {
    if (!isValidPhone(contact)) {
      return {
        success: false,
        channel: 'sms',
        error: 'Invalid phone number',
      };
    }

    const result = await sendSMS({
      to: formatPhoneNumber(contact),
      body: notification.body,
    });

    return {
      success: result.success,
      channel: 'sms',
      externalId: result.messageSid,
      error: result.error,
    };
  } else if (notification.channel === 'email') {
    if (!isValidEmail(contact)) {
      return {
        success: false,
        channel: 'email',
        error: 'Invalid email address',
      };
    }

    const result = await sendEmail({
      to: contact,
      subject: notification.subject || 'Notification',
      text: notification.body,
      html: `<p>${notification.body.replace(/\n/g, '<br>')}</p>`,
    });

    return {
      success: result.success,
      channel: 'email',
      externalId: result.messageId,
      error: result.error,
    };
  }

  return {
    success: false,
    channel: notification.channel,
    error: 'Unknown channel',
  };
}

export async function sendScheduleChangeNotification(
  scheduleId: string,
  changeType: 'created' | 'updated' | 'cancelled'
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];
  
  const schedules = await storage.getClientSchedules('');
  const schedule = schedules.find((s: ClientSchedule) => s.id === scheduleId);
  
  if (!schedule) {
    console.error(`[Notification] Schedule not found: ${scheduleId}`);
    return results;
  }

  const client = schedule.clientId ? await storage.getClient(schedule.clientId) : null;
  const caregiver = schedule.caregiverId ? await storage.getCaregiver(schedule.caregiverId) : null;

  const changeTypeText = {
    created: 'New schedule created',
    updated: 'Schedule updated',
    cancelled: 'Schedule cancelled',
  }[changeType];

  const scheduleDate = schedule.scheduledDate ? new Date(schedule.scheduledDate).toLocaleDateString() : 'TBD';
  const scheduleTime = `${schedule.startTime || 'TBD'} - ${schedule.endTime || 'TBD'}`;

  const variables = {
    changeType: changeTypeText,
    clientName: client ? `${client.firstName} ${client.lastName}` : 'Unknown Client',
    caregiverName: caregiver ? `${caregiver.firstName || ''} ${caregiver.lastName || ''}`.trim() : 'Unassigned',
    date: scheduleDate,
    time: scheduleTime,
  };

  const body = `${changeTypeText}: ${variables.clientName} on ${scheduleDate} at ${scheduleTime}. Caregiver: ${variables.caregiverName}`;

  if (caregiver) {
    const caregiverFirstName = caregiver.firstName || caregiver.lastName || 'Caregiver';
    const hasCaregiverEmail = caregiver.email && isValidEmail(caregiver.email);

    // Queue all notifications (SMS + email) for audit
    const notifications = await queueNotification({
      recipientType: 'caregiver',
      recipientId: caregiver.id,
      body,
      subject: `Schedule ${changeType.charAt(0).toUpperCase() + changeType.slice(1)}`,
      variables,
    });

    for (const notif of notifications) {
      if (notif.channel === 'email' && hasCaregiverEmail) {
        // Send via branded template system; update queue record to reflect outcome
        const fallbackSubject = `Schedule ${changeType.charAt(0).toUpperCase() + changeType.slice(1)} — ${variables.clientName}`;
        const fallbackHtml = `<p>Hi ${caregiverFirstName},</p><p>${body}</p>`;
        let emailSuccess = false;
        let emailError: string | undefined;
        try {
          await sendTemplatedEmail(
            caregiver.email!,
            'schedule_change',
            {
              firstName: caregiverFirstName,
              changeType: changeTypeText,
              clientName: variables.clientName,
              scheduleDate,
              scheduleTime,
              caregiverName: variables.caregiverName,
            },
            fallbackSubject,
            fallbackHtml,
          );
          emailSuccess = true;
        } catch (err) {
          console.error('[Notification] Failed to send schedule_change email:', err);
          emailError = String(err);
        }
        results.push({ success: emailSuccess, channel: 'email', error: emailError });
        await storage.updateNotificationQueueItem(notif.id, {
          status: emailSuccess ? 'sent' : 'failed',
          sentAt: emailSuccess ? new Date() : undefined,
          errorMessage: emailError,
        });
      } else {
        const result = await sendNotification(notif);
        results.push(result);
        await storage.updateNotificationQueueItem(notif.id, {
          status: result.success ? 'sent' : 'failed',
          sentAt: result.success ? new Date() : undefined,
          errorMessage: result.error,
          externalId: result.externalId,
        });
      }
    }
  }

  return results;
}

export async function sendReminderNotification(scheduleId: string): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];
  
  const schedules = await storage.getClientSchedules('');
  const schedule = schedules.find((s: ClientSchedule) => s.id === scheduleId);
  
  if (!schedule) {
    console.error(`[Notification] Schedule not found for reminder: ${scheduleId}`);
    return results;
  }

  const client = schedule.clientId ? await storage.getClient(schedule.clientId) : null;
  const caregiver = schedule.caregiverId ? await storage.getCaregiver(schedule.caregiverId) : null;

  const scheduleDate = schedule.scheduledDate ? new Date(schedule.scheduledDate).toLocaleDateString() : 'TBD';
  const scheduleTime = schedule.startTime || 'TBD';
  const clientAddress = client?.address || '';
  const clientName = client ? `${client.firstName} ${client.lastName}` : 'a client';

  const body = `Reminder: You have a scheduled visit with ${clientName} today at ${scheduleTime}.`;

  if (caregiver) {
    const caregiverFirstName = caregiver.firstName || caregiver.lastName || 'Caregiver';
    const hasCaregiverEmail = caregiver.email && isValidEmail(caregiver.email);

    // Queue all notifications (SMS + email) for audit
    const notifications = await queueNotification({
      recipientType: 'caregiver',
      recipientId: caregiver.id,
      body,
      subject: 'Schedule Reminder',
    });

    for (const notif of notifications) {
      if (notif.channel === 'email' && hasCaregiverEmail) {
        // Send via branded template system; update queue record to reflect outcome
        const fallbackHtml = `<p>Hi ${caregiverFirstName},</p><p>${body}</p>`;
        let emailSuccess = false;
        let emailError: string | undefined;
        try {
          await sendTemplatedEmail(
            caregiver.email!,
            'schedule_reminder',
            {
              firstName: caregiverFirstName,
              clientName,
              scheduleDate,
              scheduleTime,
              clientAddress,
            },
            'Schedule Reminder',
            fallbackHtml,
          );
          emailSuccess = true;
        } catch (err) {
          console.error('[Notification] Failed to send schedule_reminder email:', err);
          emailError = String(err);
        }
        results.push({ success: emailSuccess, channel: 'email', error: emailError });
        await storage.updateNotificationQueueItem(notif.id, {
          status: emailSuccess ? 'sent' : 'failed',
          sentAt: emailSuccess ? new Date() : undefined,
          errorMessage: emailError,
        });
      } else {
        const result = await sendNotification(notif);
        results.push(result);
        await storage.updateNotificationQueueItem(notif.id, {
          status: result.success ? 'sent' : 'failed',
          sentAt: result.success ? new Date() : undefined,
          errorMessage: result.error,
          externalId: result.externalId,
        });
      }
    }
  }

  return results;
}

export async function sendUrgentAlert(
  recipientType: 'user' | 'client' | 'caregiver',
  recipientId: string,
  alertMessage: string,
  subject: string = 'Urgent Alert'
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  const notifications = await queueNotification({
    recipientType,
    recipientId,
    body: `URGENT: ${alertMessage}`,
    subject,
  });

  for (const notif of notifications) {
    const result = await sendNotification(notif);
    results.push(result);
    await storage.updateNotificationQueueItem(notif.id, {
      status: result.success ? 'sent' : 'failed',
      sentAt: result.success ? new Date() : undefined,
      errorMessage: result.error,
      externalId: result.externalId,
    });
  }

  return results;
}

export async function sendTestNotification(
  recipientType: 'user' | 'client' | 'caregiver',
  recipientId: string,
  channel: 'sms' | 'email'
): Promise<NotificationResult> {
  const { contact, name } = await getRecipientContact(recipientType, recipientId, channel);

  if (!contact) {
    return {
      success: false,
      channel,
      error: `No ${channel === 'sms' ? 'phone number' : 'email'} found for recipient`,
    };
  }

  const body = `Hello ${name}! This is a test notification from your home care management system. If you received this message, notifications are working correctly.`;

  const notifications = await queueNotification({
    recipientType,
    recipientId,
    body,
    subject: 'Test Notification',
    channel,
  });

  if (notifications.length === 0) {
    return {
      success: false,
      channel,
      error: 'Failed to queue notification',
    };
  }

  const result = await sendNotification(notifications[0]);
  await storage.updateNotificationQueueItem(notifications[0].id, {
    status: result.success ? 'sent' : 'failed',
    sentAt: result.success ? new Date() : undefined,
    errorMessage: result.error,
    externalId: result.externalId,
  });

  return result;
}
