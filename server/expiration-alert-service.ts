import { storage } from './storage';
import { sendEmail, sendSMS, formatPhoneNumber, isValidPhone, isValidEmail } from './communication-services';
import { db } from './db';
import { caregiverCompliance, caregivers, clients, users } from '@shared/schema';
import { and, gte, lte, eq, isNotNull, sql } from 'drizzle-orm';
import { addDays, format, differenceInDays } from 'date-fns';

interface ExpirationAlertSettings {
  enabled: boolean;
  alertDaysBefore: number[];
  sendEmail: boolean;
  sendSms: boolean;
  notifyAdmins: boolean;
  adminEmails: string[];
}

const DEFAULT_SETTINGS: ExpirationAlertSettings = {
  enabled: true,
  alertDaysBefore: [30, 14, 7, 1],
  sendEmail: true,
  sendSms: true,
  notifyAdmins: true,
  adminEmails: [],
};

async function getAlertSettings(): Promise<ExpirationAlertSettings> {
  try {
    const setting = await storage.getSystemSetting('expiration_alerts');
    if (setting && setting.value) {
      const customSettings = typeof setting.value === 'string'
        ? JSON.parse(setting.value)
        : setting.value;
      return { ...DEFAULT_SETTINGS, ...customSettings };
    }
  } catch (e) {
    console.log('[Expiration Alerts] Using default settings');
  }
  return DEFAULT_SETTINGS;
}

export interface ExpiringItem {
  id: string;
  type: 'caregiver_compliance' | 'client_snap' | 'client_medicaid';
  entityId: string;
  entityName: string;
  entityEmail?: string;
  entityPhone?: string;
  itemType: string;
  itemDescription: string;
  expirationDate: Date;
  daysUntilExpiration: number;
  officeId?: string;
  officeName?: string;
}

export async function getUpcomingExpirations(daysAhead: number = 30): Promise<ExpiringItem[]> {
  const today = new Date();
  const endDate = addDays(today, daysAhead);
  const expiringItems: ExpiringItem[] = [];

  const complianceRecords = await db
    .select({
      id: caregiverCompliance.id,
      caregiverId: caregiverCompliance.caregiverId,
      category: caregiverCompliance.category,
      itemType: caregiverCompliance.itemType,
      expirationDate: caregiverCompliance.expirationDate,
      officeId: caregiverCompliance.officeId,
      caregiverFirstName: caregivers.firstName,
      caregiverLastName: caregivers.lastName,
      caregiverEmail: caregivers.email,
      caregiverPhone: caregivers.phone,
    })
    .from(caregiverCompliance)
    .leftJoin(caregivers, eq(caregiverCompliance.caregiverId, caregivers.id))
    .where(
      and(
        isNotNull(caregiverCompliance.expirationDate),
        gte(caregiverCompliance.expirationDate, today),
        lte(caregiverCompliance.expirationDate, endDate)
      )
    );

  for (const record of complianceRecords) {
    if (record.expirationDate) {
      const daysUntil = differenceInDays(record.expirationDate, today);
      expiringItems.push({
        id: record.id,
        type: 'caregiver_compliance',
        entityId: record.caregiverId,
        entityName: `${record.caregiverFirstName || ''} ${record.caregiverLastName || ''}`.trim() || 'Unknown Caregiver',
        entityEmail: record.caregiverEmail || undefined,
        entityPhone: record.caregiverPhone || undefined,
        itemType: record.itemType,
        itemDescription: formatComplianceItemDescription(record.category, record.itemType),
        expirationDate: record.expirationDate,
        daysUntilExpiration: daysUntil,
        officeId: record.officeId || undefined,
      });
    }
  }

  const clientsWithExpiring = await db
    .select()
    .from(clients)
    .where(
      sql`(${clients.snapExpiryDate} IS NOT NULL AND ${clients.snapExpiryDate} >= ${today} AND ${clients.snapExpiryDate} <= ${endDate})
          OR (${clients.medicaidExpiryDate} IS NOT NULL AND ${clients.medicaidExpiryDate} >= ${today} AND ${clients.medicaidExpiryDate} <= ${endDate})`
    );

  for (const client of clientsWithExpiring) {
    if (client.snapExpiryDate && client.snapExpiryDate >= today && client.snapExpiryDate <= endDate) {
      const daysUntil = differenceInDays(client.snapExpiryDate, today);
      expiringItems.push({
        id: `snap-${client.id}`,
        type: 'client_snap',
        entityId: client.id,
        entityName: `${client.firstName} ${client.lastName}`,
        entityEmail: client.email || undefined,
        entityPhone: client.phone || undefined,
        itemType: 'snap',
        itemDescription: 'SNAP Benefits',
        expirationDate: client.snapExpiryDate,
        daysUntilExpiration: daysUntil,
        officeId: client.officeId || undefined,
      });
    }

    if (client.medicaidExpiryDate && client.medicaidExpiryDate >= today && client.medicaidExpiryDate <= endDate) {
      const daysUntil = differenceInDays(client.medicaidExpiryDate, today);
      expiringItems.push({
        id: `medicaid-${client.id}`,
        type: 'client_medicaid',
        entityId: client.id,
        entityName: `${client.firstName} ${client.lastName}`,
        entityEmail: client.email || undefined,
        entityPhone: client.phone || undefined,
        itemType: 'medicaid',
        itemDescription: 'Medicaid Coverage',
        expirationDate: client.medicaidExpiryDate,
        daysUntilExpiration: daysUntil,
        officeId: client.officeId || undefined,
      });
    }
  }

  expiringItems.sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);

  return expiringItems;
}

function formatComplianceItemDescription(category: string, itemType: string): string {
  const categoryLabels: Record<string, string> = {
    requirement_9: 'PA Form -9',
    background_check: 'Background Check',
    medical: 'Medical Requirement',
  };

  const itemLabels: Record<string, string> = {
    application: 'Application',
    fingerprinting: 'Fingerprinting',
    fbi: 'FBI Background Check',
    pa_state: 'PA State Background Check',
    child_abuse: 'Child Abuse Clearance',
    adult_abuse: 'Adult Protective Services Check',
    tb_test: 'TB Test',
    physical_exam: 'Physical Exam',
    drug_test: 'Drug Test',
    hepatitis_b: 'Hepatitis B Vaccine',
    flu_vaccine: 'Flu Vaccine',
    covid_vaccine: 'COVID-19 Vaccine',
  };

  const categoryLabel = categoryLabels[category] || category;
  const itemLabel = itemLabels[itemType] || itemType;

  return `${categoryLabel} - ${itemLabel}`;
}

function getExpirationAlertEmailHtml(items: ExpiringItem[], recipientName: string): string {
  const groupedItems = items.reduce((acc, item) => {
    const key = item.type === 'caregiver_compliance' ? 'Caregiver Compliance' : 'Client Benefits';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, ExpiringItem[]>);

  const itemsHtml = Object.entries(groupedItems).map(([category, categoryItems]) => `
    <tr>
      <td style="padding: 20px 0 10px 0;">
        <h3 style="color: #1a1a2e; margin: 0; font-size: 16px; border-bottom: 2px solid #4ECDC4; padding-bottom: 8px;">
          ${category}
        </h3>
      </td>
    </tr>
    ${categoryItems.map(item => `
    <tr>
      <td style="padding: 10px 15px; background: ${item.daysUntilExpiration <= 7 ? '#FFF5F5' : '#F9FAFB'}; border-left: 3px solid ${item.daysUntilExpiration <= 7 ? '#EF4444' : item.daysUntilExpiration <= 14 ? '#F59E0B' : '#10B981'}; margin-bottom: 8px; border-radius: 4px;">
        <p style="margin: 0 0 5px 0; font-weight: 600; color: #1a1a2e;">
          ${item.entityName} - ${item.itemDescription}
        </p>
        <p style="margin: 0; color: ${item.daysUntilExpiration <= 7 ? '#EF4444' : '#6B7280'}; font-size: 14px;">
          Expires: ${format(item.expirationDate, 'MMMM d, yyyy')} 
          (${item.daysUntilExpiration === 0 ? 'TODAY' : item.daysUntilExpiration === 1 ? 'Tomorrow' : `in ${item.daysUntilExpiration} days`})
        </p>
      </td>
    </tr>
    `).join('')}
  `).join('');

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
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #4ECDC4 0%, #2C3E50 100%); padding: 30px 40px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">
                ⚠️ Upcoming Expirations Alert
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px;">
              <p style="font-size: 16px; color: #4a4a6a; margin: 0 0 20px 0;">
                Hello ${recipientName},
              </p>
              <p style="font-size: 16px; color: #4a4a6a; margin: 0 0 20px 0;">
                The following items are expiring soon and require your attention:
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                ${itemsHtml}
              </table>
              <p style="font-size: 14px; color: #6B7280; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #E5E7EB;">
                Please take action to renew or update these items before they expire.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #F9FAFB; padding: 20px 40px; text-align: center;">
              <p style="font-size: 12px; color: #9CA3AF; margin: 0;">
                This is an automated message from Home Care Management System
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface ExpirationAlertResult {
  totalItems: number;
  emailsSent: number;
  smsSent: number;
  errors: string[];
}

export async function sendExpirationAlerts(): Promise<ExpirationAlertResult> {
  const settings = await getAlertSettings();
  const result: ExpirationAlertResult = {
    totalItems: 0,
    emailsSent: 0,
    smsSent: 0,
    errors: [],
  };

  if (!settings.enabled) {
    console.log('[Expiration Alerts] Alerts are disabled');
    return result;
  }

  const today = new Date();
  const allExpiringItems: ExpiringItem[] = [];

  for (const daysAhead of settings.alertDaysBefore) {
    const items = await getUpcomingExpirations(daysAhead);
    const todayAlertItems = items.filter(item => item.daysUntilExpiration === daysAhead - 1 || item.daysUntilExpiration === daysAhead);
    allExpiringItems.push(...todayAlertItems);
  }

  const uniqueItems = Array.from(new Map(allExpiringItems.map(item => [item.id, item])).values());
  result.totalItems = uniqueItems.length;

  if (uniqueItems.length === 0) {
    console.log('[Expiration Alerts] No items expiring on alert days');
    return result;
  }

  console.log(`[Expiration Alerts] Found ${uniqueItems.length} items to alert about`);

  if (settings.notifyAdmins && settings.adminEmails.length > 0) {
    for (const adminEmail of settings.adminEmails) {
      try {
        const emailHtml = getExpirationAlertEmailHtml(uniqueItems, 'Administrator');
        await sendEmail({
          to: adminEmail,
          subject: '⚠️ Expiration Alert: Items Expiring Soon',
          html: emailHtml,
          text: `${uniqueItems.length} items are expiring soon and require your attention.`,
        });
        result.emailsSent++;
        console.log(`[Expiration Alerts] Sent admin alert to ${adminEmail}`);
      } catch (error) {
        const errorMsg = `Failed to send admin email to ${adminEmail}: ${error}`;
        result.errors.push(errorMsg);
        console.error(`[Expiration Alerts] ${errorMsg}`);
      }
    }
  }

  const adminUsers = await db
    .select()
    .from(users)
    .where(sql`${users.role} IN ('admin', 'super_admin', 'office_admin')`);

  for (const admin of adminUsers) {
    if (admin.email && isValidEmail(admin.email)) {
      try {
        const adminItems = admin.primaryOfficeId
          ? uniqueItems.filter(item => !item.officeId || item.officeId === admin.primaryOfficeId)
          : uniqueItems;

        if (adminItems.length > 0) {
          const emailHtml = getExpirationAlertEmailHtml(adminItems, admin.username || 'Administrator');
          await sendEmail({
            to: admin.email,
            subject: '⚠️ Expiration Alert: Items Expiring Soon',
            html: emailHtml,
            text: `${adminItems.length} items are expiring soon and require your attention.`,
          });
          result.emailsSent++;
          console.log(`[Expiration Alerts] Sent alert to admin ${admin.email}`);
        }
      } catch (error) {
        const errorMsg = `Failed to send email to admin ${admin.email}: ${error}`;
        result.errors.push(errorMsg);
        console.error(`[Expiration Alerts] ${errorMsg}`);
      }
    }
  }

  if (settings.sendSms) {
    for (const item of uniqueItems) {
      if (item.entityPhone && isValidPhone(item.entityPhone)) {
        try {
          const formattedPhone = formatPhoneNumber(item.entityPhone);
          const smsMessage = `ALERT: Your ${item.itemDescription} expires ${item.daysUntilExpiration === 0 ? 'TODAY' : `in ${item.daysUntilExpiration} days`} (${format(item.expirationDate, 'MM/dd/yyyy')}). Please contact your Home Care office.`;
          
          await sendSMS({ to: formattedPhone, body: smsMessage });
          result.smsSent++;
          console.log(`[Expiration Alerts] Sent SMS to ${item.entityName}`);
        } catch (error) {
          const errorMsg = `Failed to send SMS to ${item.entityName}: ${error}`;
          result.errors.push(errorMsg);
          console.error(`[Expiration Alerts] ${errorMsg}`);
        }
      }
    }
  }

  console.log(`[Expiration Alerts] Completed: ${result.emailsSent} emails, ${result.smsSent} SMS sent`);
  return result;
}

export const expirationAlertService = {
  getUpcomingExpirations,
  sendExpirationAlerts,
  getAlertSettings,
};
