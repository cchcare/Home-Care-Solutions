
const PRIMARY_COLOR = "#1a6faf";
const ACCENT_COLOR = "#e8f4fd";
const DARK_BLUE = "#0d4f82";
const LIGHT_GRAY = "#f5f7fa";
const TEXT_COLOR = "#2d3748";
const MUTED_COLOR = "#718096";
const BORDER_COLOR = "#e2e8f0";

function emailShell(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${LIGHT_GRAY};font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:${LIGHT_GRAY};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,${PRIMARY_COLOR} 0%,${DARK_BLUE} 100%);padding:32px 40px;text-align:center;">
              <div style="display:inline-block;background:#ffffff;border-radius:10px;padding:10px 20px;margin-bottom:14px;">
                <span style="font-size:20px;font-weight:800;color:${PRIMARY_COLOR};letter-spacing:-0.5px;">CCHC</span>
                <span style="font-size:20px;font-weight:400;color:${TEXT_COLOR};"> Solutions</span>
              </div>
              <div style="font-size:13px;color:rgba(255,255,255,0.8);letter-spacing:0.5px;">Home Care Management</div>
            </td>
          </tr>

          <!-- Body -->
          ${bodyContent}

          <!-- Footer -->
          <tr>
            <td style="background-color:${LIGHT_GRAY};padding:28px 40px;text-align:center;border-top:1px solid ${BORDER_COLOR};">
              <p style="font-size:13px;color:${MUTED_COLOR};margin:0 0 6px 0;">
                &copy; {{currentYear}} {{companyName}}. All rights reserved.
              </p>
              <p style="font-size:12px;color:#a0aec0;margin:0 0 8px 0;">
                This is an automated email &mdash; please do not reply directly to this message.<br>
                For questions or assistance, contact your administrator or email <a href="mailto:support@carechc.com" style="color:#718096;">support@carechc.com</a>.
              </p>
              <p style="font-size:11px;color:#b0bec5;margin:0;">
                You are receiving this email because you have an account with {{companyName}}.<br>
                If you believe this was sent in error, please contact your administrator.
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

function ctaButton(href: string, label: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px auto 0 auto;">
    <tr>
      <td style="border-radius:6px;background-color:${PRIMARY_COLOR};">
        <a href="${href}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

function sectionBody(content: string): string {
  return `<tr>
    <td style="padding:40px 40px 32px 40px;">
      ${content}
    </td>
  </tr>`;
}

function greeting(name: string): string {
  return `<p style="font-size:22px;font-weight:700;color:${TEXT_COLOR};margin:0 0 16px 0;">Hello, ${name}</p>`;
}

function para(text: string): string {
  return `<p style="font-size:15px;color:${MUTED_COLOR};line-height:1.7;margin:0 0 16px 0;">${text}</p>`;
}

function infoBox(content: string, color = PRIMARY_COLOR): string {
  return `<div style="background-color:${ACCENT_COLOR};border-left:4px solid ${color};border-radius:6px;padding:16px 20px;margin:20px 0;">
    ${content}
  </div>`;
}

function divider(): string {
  return `<div style="border-top:1px solid ${BORDER_COLOR};margin:24px 0;"></div>`;
}

export interface TemplateDefinition {
  type: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  placeholders: { key: string; label: string; example: string }[];
  isDefault: boolean;
}

export function getEmailTemplateSeeds(): TemplateDefinition[] {
  return [

    // ── 1. Signup Confirmation ─────────────────────────────────────────────
    {
      type: "signup_confirmation",
      name: "Account Created Confirmation",
      subject: "Welcome to {{companyName}} — Your Account is Ready",
      htmlContent: emailShell(sectionBody(`
        ${greeting("{{firstName}}")}
        ${para("Your account with <strong>{{companyName}}</strong> has been successfully created. You're now part of our home care platform.")}
        ${para("You can log in at any time using your registered email address. If you haven't set a password yet, please use the forgot-password option on the login page.")}
        ${ctaButton("{{loginUrl}}", "Log In to Your Account")}
        ${divider()}
        ${para("If you did not create this account, please contact your administrator immediately.")}
      `)),
      textContent: `Welcome to {{companyName}}!\n\nHello {{firstName}},\n\nYour account has been created. Log in at: {{loginUrl}}\n\nIf you did not create this account, contact your administrator.\n\n— {{companyName}} Team`,
      placeholders: [
        { key: "firstName", label: "First Name", example: "Maria" },
        { key: "loginUrl", label: "Login URL", example: "https://app.carechc.com/login" },
        { key: "companyName", label: "Company Name", example: "CCHC Solutions" },
        { key: "currentYear", label: "Current Year", example: "2026" },
      ],
      isDefault: true,
    },

    // ── 2. Password Reset (Staff) ─────────────────────────────────────────
    {
      type: "password_reset",
      name: "Password Reset — Staff",
      subject: "{{companyName}} — Password Reset Request",
      htmlContent: emailShell(sectionBody(`
        ${greeting("{{firstName}}")}
        ${para("We received a request to reset the password for your staff account. Click the button below to set a new password.")}
        ${infoBox(`<p style="font-size:14px;color:${PRIMARY_COLOR};margin:0;"><strong>⏳ This link expires in {{expiryTime}}.</strong></p><p style="font-size:13px;color:${MUTED_COLOR};margin:6px 0 0 0;">If you didn't request a reset, you can safely ignore this email — your password will remain unchanged.</p>`)}
        ${ctaButton("{{resetUrl}}", "Reset My Password")}
        ${divider()}
        ${para("Having trouble with the button? Copy and paste this link into your browser:<br><span style='font-size:13px;color:${PRIMARY_COLOR};word-break:break-all;'>{{resetUrl}}</span>")}
      `)),
      textContent: `Password Reset Request\n\nHello {{firstName}},\n\nClick the link below to reset your password. This link expires in {{expiryTime}}.\n\n{{resetUrl}}\n\nIf you didn't request this, ignore this email.\n\n— {{companyName}} Team`,
      placeholders: [
        { key: "firstName", label: "First Name", example: "John" },
        { key: "resetUrl", label: "Reset URL", example: "https://app.carechc.com/reset-password?token=abc123" },
        { key: "expiryTime", label: "Expiry Time", example: "1 hour" },
        { key: "companyName", label: "Company Name", example: "CCHC Solutions" },
        { key: "currentYear", label: "Current Year", example: "2026" },
      ],
      isDefault: true,
    },

    // ── 3. Password Reset (Caregiver) ────────────────────────────────────
    {
      type: "password_reset_caregiver",
      name: "Password Reset — Caregiver",
      subject: "{{companyName}} — Caregiver Portal Password Reset",
      htmlContent: emailShell(sectionBody(`
        ${greeting("{{firstName}}")}
        ${para("We received a request to reset your Caregiver Portal password. Click the button below to choose a new password.")}
        ${infoBox(`<p style="font-size:14px;color:${PRIMARY_COLOR};margin:0;"><strong>⏳ This link expires in {{expiryTime}}.</strong></p><p style="font-size:13px;color:${MUTED_COLOR};margin:6px 0 0 0;">If you didn't request a reset, your password is unchanged — no action needed.</p>`)}
        ${ctaButton("{{resetUrl}}", "Reset My Password")}
        ${divider()}
        ${para("If the button doesn't work, copy this link into your browser:<br><span style='font-size:13px;color:${PRIMARY_COLOR};word-break:break-all;'>{{resetUrl}}</span>")}
        ${para("After resetting your password you can log back in at the Caregiver Portal.")}
      `)),
      textContent: `Caregiver Portal Password Reset\n\nHello {{firstName}},\n\nReset your password here (expires in {{expiryTime}}):\n{{resetUrl}}\n\nIf you didn't request this, ignore this email.\n\n— {{companyName}} Team`,
      placeholders: [
        { key: "firstName", label: "First Name", example: "Sarah" },
        { key: "resetUrl", label: "Reset URL", example: "https://app.carechc.com/reset-password?token=abc123" },
        { key: "expiryTime", label: "Expiry Time", example: "1 hour" },
        { key: "companyName", label: "Company Name", example: "CCHC Solutions" },
        { key: "currentYear", label: "Current Year", example: "2026" },
      ],
      isDefault: true,
    },

    // ── 4. User Invitation ────────────────────────────────────────────────
    {
      type: "user_invitation",
      name: "Staff Invitation",
      subject: "You've Been Invited to Join {{companyName}}",
      htmlContent: emailShell(sectionBody(`
        ${greeting("{{firstName}}")}
        ${para("You have been invited to join <strong>{{companyName}}</strong> as a staff member on our home care management platform.")}
        ${para("Click the button below to set up your account. This one-time link will allow you to create your password and get started.")}
        ${infoBox(`<p style="font-size:14px;color:${PRIMARY_COLOR};margin:0;"><strong>🔒 This invitation link expires in {{expiryTime}}.</strong></p><p style="font-size:13px;color:${MUTED_COLOR};margin:6px 0 0 0;">If you believe this was sent in error, please disregard this email.</p>`)}
        ${ctaButton("{{inviteUrl}}", "Accept Invitation & Set Up Account")}
        ${divider()}
        ${para("If the button doesn't work, copy this link: <span style='font-size:13px;color:${PRIMARY_COLOR};word-break:break-all;'>{{inviteUrl}}</span>")}
      `)),
      textContent: `You're Invited to {{companyName}}\n\nHello {{firstName}},\n\nYou've been invited to join {{companyName}}. Set up your account here (expires in {{expiryTime}}):\n\n{{inviteUrl}}\n\n— {{companyName}} Team`,
      placeholders: [
        { key: "firstName", label: "First Name", example: "Alex" },
        { key: "inviteUrl", label: "Invitation URL", example: "https://app.carechc.com/accept-invite?token=abc123" },
        { key: "expiryTime", label: "Expiry Time", example: "48 hours" },
        { key: "companyName", label: "Company Name", example: "CCHC Solutions" },
        { key: "currentYear", label: "Current Year", example: "2026" },
      ],
      isDefault: true,
    },

    // ── 5. Welcome — Staff ───────────────────────────────────────────────
    {
      type: "welcome",
      name: "Welcome — Staff",
      subject: "Welcome to {{companyName}}, {{firstName}}!",
      htmlContent: emailShell(`
        <tr>
          <td style="background-color:${ACCENT_COLOR};padding:28px 40px;text-align:center;">
            <p style="font-size:36px;margin:0;">🏠</p>
            <h2 style="font-size:24px;font-weight:700;color:${TEXT_COLOR};margin:8px 0 4px 0;">Welcome aboard!</h2>
            <p style="font-size:15px;color:${MUTED_COLOR};margin:0;">We're glad to have you on the team.</p>
          </td>
        </tr>
        ${sectionBody(`
          ${greeting("{{firstName}}")}
          ${para("You've successfully joined <strong>{{companyName}}</strong>. Your account is active and ready to use.")}
          ${para("Here's how to get started:")}
          <ul style="font-size:15px;color:${MUTED_COLOR};line-height:2;padding-left:20px;margin:0 0 16px 0;">
            <li>Log in using your email and password</li>
            <li>Complete your profile</li>
            <li>Explore the dashboard and familiarize yourself with the platform</li>
            <li>Reach out to your administrator if you need help</li>
          </ul>
          ${ctaButton("{{loginUrl}}", "Log In Now")}
        `)}
      `),
      textContent: `Welcome to {{companyName}}, {{firstName}}!\n\nYour account is active. Log in at: {{loginUrl}}\n\nWelcome to the team!\n\n— {{companyName}} Team`,
      placeholders: [
        { key: "firstName", label: "First Name", example: "Jordan" },
        { key: "lastName", label: "Last Name", example: "Smith" },
        { key: "loginUrl", label: "Login URL", example: "https://app.carechc.com/login" },
        { key: "companyName", label: "Company Name", example: "CCHC Solutions" },
        { key: "currentYear", label: "Current Year", example: "2026" },
      ],
      isDefault: true,
    },

    // ── 6. Welcome — Caregiver ───────────────────────────────────────────
    {
      type: "welcome_caregiver",
      name: "Welcome — Caregiver",
      subject: "Welcome to {{companyName}}, {{firstName}}! 🏠",
      htmlContent: emailShell(`
        <tr>
          <td style="background-color:${ACCENT_COLOR};padding:28px 40px;text-align:center;">
            <p style="font-size:36px;margin:0;">💙</p>
            <h2 style="font-size:24px;font-weight:700;color:${TEXT_COLOR};margin:8px 0 4px 0;">Welcome to the Care Team!</h2>
            <p style="font-size:15px;color:${MUTED_COLOR};margin:0;">We're grateful to have you with us.</p>
          </td>
        </tr>
        ${sectionBody(`
          ${greeting("{{firstName}}")}
          ${para("Thank you for joining <strong>{{companyName}}</strong> as a caregiver. Your compassion and dedication make a real difference in the lives of our clients and their families.")}
          ${para("Here are your next steps:")}
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:20px;">
            <tr>
              <td style="padding:10px 16px;background:${ACCENT_COLOR};border-radius:8px;margin-bottom:8px;">
                <p style="margin:0;font-size:15px;color:${TEXT_COLOR};"><strong>📱 Download the App</strong></p>
                <p style="margin:4px 0 0 0;font-size:13px;color:${MUTED_COLOR};">Access your schedule and clock in/out on the go.</p>
              </td>
            </tr>
            <tr><td style="height:8px;"></td></tr>
            <tr>
              <td style="padding:10px 16px;background:${ACCENT_COLOR};border-radius:8px;margin-bottom:8px;">
                <p style="margin:0;font-size:15px;color:${TEXT_COLOR};"><strong>📅 Check Your Schedule</strong></p>
                <p style="margin:4px 0 0 0;font-size:13px;color:${MUTED_COLOR};">Log in to view your upcoming visits and client assignments.</p>
              </td>
            </tr>
            <tr><td style="height:8px;"></td></tr>
            <tr>
              <td style="padding:10px 16px;background:${ACCENT_COLOR};border-radius:8px;">
                <p style="margin:0;font-size:15px;color:${TEXT_COLOR};"><strong>📋 Review Your Profile</strong></p>
                <p style="margin:4px 0 0 0;font-size:13px;color:${MUTED_COLOR};">Make sure your contact info and certifications are up to date.</p>
              </td>
            </tr>
          </table>
          ${ctaButton("{{portalUrl}}", "Access Caregiver Portal")}
          ${divider()}
          ${para("If you have questions, please contact your coordinator or office administrator. We're here to support you every step of the way.")}
        `)}
      `),
      textContent: `Welcome to {{companyName}}, {{firstName}}!\n\nThank you for joining our care team.\n\nNext steps:\n1. Download the app\n2. Check your schedule\n3. Review your profile\n\nAccess your portal: {{portalUrl}}\n\n— {{companyName}} Team`,
      placeholders: [
        { key: "firstName", label: "First Name", example: "Maria" },
        { key: "portalUrl", label: "Portal URL", example: "https://app.carechc.com/caregiver-login" },
        { key: "companyName", label: "Company Name", example: "CCHC Solutions" },
        { key: "currentYear", label: "Current Year", example: "2026" },
      ],
      isDefault: true,
    },

    // ── 7. Family Portal Invitation ──────────────────────────────────────
    {
      type: "family_portal_invitation",
      name: "Family Portal Invitation",
      subject: "Invitation to {{clientFirstName}}'s Family Portal — {{companyName}}",
      htmlContent: emailShell(sectionBody(`
        ${greeting("{{firstName}}")}
        ${para("You have been invited by <strong>{{companyName}}</strong> to access the Family Portal for <strong>{{clientFirstName}} {{clientLastName}}</strong>.")}
        ${para("The Family Portal lets you stay informed about care updates, schedules, and important information — all in one secure place.")}
        ${infoBox(`<p style="font-size:15px;color:${TEXT_COLOR};font-weight:600;margin:0 0 4px 0;">Your Access</p><p style="font-size:13px;color:${MUTED_COLOR};margin:0;">Use the link below to access the portal. For security, you may be asked to verify your identity on first visit.</p>`)}
        ${ctaButton("{{portalUrl}}", "Access Family Portal")}
        ${divider()}
        ${para("If you have questions about your loved one's care, please contact us directly. We're committed to keeping you connected and informed.")}
        ${para("If you received this email in error, please disregard it or contact us.")}
      `)),
      textContent: `Family Portal Invitation — {{companyName}}\n\nHello {{firstName}},\n\nYou've been invited to access the family portal for {{clientFirstName}} {{clientLastName}}.\n\nAccess the portal here: {{portalUrl}}\n\n— {{companyName}} Team`,
      placeholders: [
        { key: "firstName", label: "Recipient First Name", example: "David" },
        { key: "clientFirstName", label: "Client First Name", example: "Margaret" },
        { key: "clientLastName", label: "Client Last Name", example: "Johnson" },
        { key: "portalUrl", label: "Portal URL", example: "https://app.carechc.com/family-portal?token=abc123" },
        { key: "companyName", label: "Company Name", example: "CCHC Solutions" },
        { key: "currentYear", label: "Current Year", example: "2026" },
      ],
      isDefault: true,
    },

    // ── 8. Schedule Change ────────────────────────────────────────────────
    {
      type: "schedule_change",
      name: "Schedule Change Notification",
      subject: "Schedule {{changeType}} — {{companyName}}",
      htmlContent: emailShell(sectionBody(`
        ${greeting("{{firstName}}")}
        ${para("This is to inform you of a schedule change. Please review the details below.")}
        ${infoBox(`
          <p style="font-size:15px;font-weight:700;color:${PRIMARY_COLOR};margin:0 0 12px 0;">📅 Schedule {{changeType}}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr><td style="font-size:13px;color:${MUTED_COLOR};padding:3px 0;width:120px;">Client</td><td style="font-size:13px;color:${TEXT_COLOR};font-weight:600;padding:3px 0;">{{clientName}}</td></tr>
            <tr><td style="font-size:13px;color:${MUTED_COLOR};padding:3px 0;">Date</td><td style="font-size:13px;color:${TEXT_COLOR};font-weight:600;padding:3px 0;">{{scheduleDate}}</td></tr>
            <tr><td style="font-size:13px;color:${MUTED_COLOR};padding:3px 0;">Time</td><td style="font-size:13px;color:${TEXT_COLOR};font-weight:600;padding:3px 0;">{{scheduleTime}}</td></tr>
            <tr><td style="font-size:13px;color:${MUTED_COLOR};padding:3px 0;">Caregiver</td><td style="font-size:13px;color:${TEXT_COLOR};font-weight:600;padding:3px 0;">{{caregiverName}}</td></tr>
          </table>
        `)}
        ${para("If you have questions about this change, please contact your coordinator.")}
        ${ctaButton("{{portalUrl}}", "View My Schedule")}
      `)),
      textContent: `Schedule {{changeType}} — {{companyName}}\n\nHello {{firstName}},\n\nYour schedule has been updated:\nClient: {{clientName}}\nDate: {{scheduleDate}}\nTime: {{scheduleTime}}\nCaregiver: {{caregiverName}}\n\nView your schedule at: {{portalUrl}}\n\n— {{companyName}} Team`,
      placeholders: [
        { key: "firstName", label: "First Name", example: "Sarah" },
        { key: "changeType", label: "Change Type", example: "Updated" },
        { key: "clientName", label: "Client Name", example: "Margaret Johnson" },
        { key: "scheduleDate", label: "Schedule Date", example: "March 22, 2026" },
        { key: "scheduleTime", label: "Schedule Time", example: "9:00 AM – 5:00 PM" },
        { key: "caregiverName", label: "Caregiver Name", example: "Maria Santos" },
        { key: "portalUrl", label: "Portal URL", example: "https://app.carechc.com/caregiver-login" },
        { key: "companyName", label: "Company Name", example: "CCHC Solutions" },
        { key: "currentYear", label: "Current Year", example: "2026" },
      ],
      isDefault: true,
    },

    // ── 9. Schedule Reminder ─────────────────────────────────────────────
    {
      type: "schedule_reminder",
      name: "Schedule Reminder",
      subject: "Reminder: Upcoming Visit — {{scheduleDate}}",
      htmlContent: emailShell(sectionBody(`
        ${greeting("{{firstName}}")}
        ${para("This is a friendly reminder about your upcoming visit. Please review the details below and ensure you're prepared.")}
        ${infoBox(`
          <p style="font-size:15px;font-weight:700;color:${PRIMARY_COLOR};margin:0 0 12px 0;">🔔 Upcoming Visit Reminder</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr><td style="font-size:13px;color:${MUTED_COLOR};padding:3px 0;width:120px;">Client</td><td style="font-size:13px;color:${TEXT_COLOR};font-weight:600;padding:3px 0;">{{clientName}}</td></tr>
            <tr><td style="font-size:13px;color:${MUTED_COLOR};padding:3px 0;">Date</td><td style="font-size:13px;color:${TEXT_COLOR};font-weight:600;padding:3px 0;">{{scheduleDate}}</td></tr>
            <tr><td style="font-size:13px;color:${MUTED_COLOR};padding:3px 0;">Start Time</td><td style="font-size:13px;color:${TEXT_COLOR};font-weight:600;padding:3px 0;">{{scheduleTime}}</td></tr>
            <tr><td style="font-size:13px;color:${MUTED_COLOR};padding:3px 0;">Address</td><td style="font-size:13px;color:${TEXT_COLOR};font-weight:600;padding:3px 0;">{{clientAddress}}</td></tr>
          </table>
        `)}
        ${para("Please clock in through the app when you arrive. If you cannot make this visit, contact your coordinator immediately.")}
        ${ctaButton("{{portalUrl}}", "View Visit Details")}
      `)),
      textContent: `Visit Reminder — {{companyName}}\n\nHello {{firstName}},\n\nReminder of your upcoming visit:\nClient: {{clientName}}\nDate: {{scheduleDate}}\nTime: {{scheduleTime}}\nAddress: {{clientAddress}}\n\n— {{companyName}} Team`,
      placeholders: [
        { key: "firstName", label: "First Name", example: "Maria" },
        { key: "clientName", label: "Client Name", example: "Margaret Johnson" },
        { key: "scheduleDate", label: "Schedule Date", example: "March 22, 2026" },
        { key: "scheduleTime", label: "Start Time", example: "9:00 AM" },
        { key: "clientAddress", label: "Client Address", example: "123 Oak Street, Pittsburgh, PA" },
        { key: "portalUrl", label: "Portal URL", example: "https://app.carechc.com/caregiver-login" },
        { key: "companyName", label: "Company Name", example: "CCHC Solutions" },
        { key: "currentYear", label: "Current Year", example: "2026" },
      ],
      isDefault: true,
    },

    // ── 10. EVV Confirmation ────────────────────────────────────────────
    {
      type: "evv_confirmation",
      name: "EVV Clock-In/Out Confirmation",
      subject: "EVV {{eventType}} Recorded — {{companyName}}",
      htmlContent: emailShell(sectionBody(`
        ${greeting("{{firstName}}")}
        ${para("Your Electronic Visit Verification (EVV) event has been successfully recorded. This confirmation is for your records.")}
        ${infoBox(`
          <p style="font-size:15px;font-weight:700;color:${PRIMARY_COLOR};margin:0 0 12px 0;">✅ EVV Record Confirmed</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr><td style="font-size:13px;color:${MUTED_COLOR};padding:3px 0;width:120px;">Event</td><td style="font-size:13px;color:${TEXT_COLOR};font-weight:600;padding:3px 0;">{{eventType}}</td></tr>
            <tr><td style="font-size:13px;color:${MUTED_COLOR};padding:3px 0;">Client</td><td style="font-size:13px;color:${TEXT_COLOR};font-weight:600;padding:3px 0;">{{clientName}}</td></tr>
            <tr><td style="font-size:13px;color:${MUTED_COLOR};padding:3px 0;">Date & Time</td><td style="font-size:13px;color:${TEXT_COLOR};font-weight:600;padding:3px 0;">{{eventDateTime}}</td></tr>
            <tr><td style="font-size:13px;color:${MUTED_COLOR};padding:3px 0;">Location</td><td style="font-size:13px;color:${TEXT_COLOR};font-weight:600;padding:3px 0;">{{location}}</td></tr>
          </table>
        `)}
        ${para("This record is required for Medicaid compliance. If any information is incorrect, please notify your coordinator immediately.")}
      `)),
      textContent: `EVV Confirmation — {{companyName}}\n\nHello {{firstName}},\n\nYour EVV event has been recorded:\nEvent: {{eventType}}\nClient: {{clientName}}\nDate/Time: {{eventDateTime}}\nLocation: {{location}}\n\n— {{companyName}} Team`,
      placeholders: [
        { key: "firstName", label: "First Name", example: "Maria" },
        { key: "eventType", label: "Event Type", example: "Clock-In" },
        { key: "clientName", label: "Client Name", example: "Margaret Johnson" },
        { key: "eventDateTime", label: "Event Date & Time", example: "March 22, 2026 at 9:02 AM" },
        { key: "location", label: "Location", example: "123 Oak Street, Pittsburgh, PA" },
        { key: "companyName", label: "Company Name", example: "CCHC Solutions" },
        { key: "currentYear", label: "Current Year", example: "2026" },
      ],
      isDefault: true,
    },

    // ── 11. Compliance Alert ─────────────────────────────────────────────
    {
      type: "compliance_alert",
      name: "Compliance Expiration Alert",
      subject: "⚠️ Action Required: {{itemName}} Expiring in {{daysUntilExpiry}} Days",
      htmlContent: emailShell(sectionBody(`
        ${greeting("{{firstName}}")}
        ${para("This is an important compliance alert. A required document or certification is expiring soon and requires your immediate attention.")}
        ${infoBox(`
          <p style="font-size:15px;font-weight:700;color:#c53030;margin:0 0 12px 0;">⚠️ Compliance Item Expiring Soon</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr><td style="font-size:13px;color:${MUTED_COLOR};padding:3px 0;width:140px;">Item</td><td style="font-size:13px;color:${TEXT_COLOR};font-weight:600;padding:3px 0;">{{itemName}}</td></tr>
            <tr><td style="font-size:13px;color:${MUTED_COLOR};padding:3px 0;">Expiration Date</td><td style="font-size:13px;color:#c53030;font-weight:600;padding:3px 0;">{{expiryDate}}</td></tr>
            <tr><td style="font-size:13px;color:${MUTED_COLOR};padding:3px 0;">Days Remaining</td><td style="font-size:13px;color:#c53030;font-weight:700;padding:3px 0;">{{daysUntilExpiry}} days</td></tr>
          </table>
        `, "#fed7d7")}
        ${para("Please renew or update this item before the expiration date to remain in compliance. Failure to do so may affect your work assignments.")}
        ${para("Contact your coordinator or submit updated documentation through the portal.")}
      `)),
      textContent: `Compliance Alert — {{companyName}}\n\nHello {{firstName}},\n\nAction required: {{itemName}} expires on {{expiryDate}} ({{daysUntilExpiry}} days remaining).\n\nPlease renew this item promptly.\n\n— {{companyName}} Team`,
      placeholders: [
        { key: "firstName", label: "First Name", example: "Maria" },
        { key: "itemName", label: "Compliance Item", example: "TB Test" },
        { key: "expiryDate", label: "Expiry Date", example: "March 31, 2026" },
        { key: "daysUntilExpiry", label: "Days Until Expiry", example: "7" },
        { key: "companyName", label: "Company Name", example: "CCHC Solutions" },
        { key: "currentYear", label: "Current Year", example: "2026" },
      ],
      isDefault: true,
    },

    // ── 12. Incident Report Notification ─────────────────────────────────
    {
      type: "incident_report_notification",
      name: "Incident Report Filed",
      subject: "Incident Report Submitted — {{companyName}}",
      htmlContent: emailShell(sectionBody(`
        ${greeting("{{firstName}}")}
        ${para("An incident report has been filed and requires your attention. Please review the details and take any necessary follow-up actions.")}
        ${infoBox(`
          <p style="font-size:15px;font-weight:700;color:${PRIMARY_COLOR};margin:0 0 12px 0;">📋 Incident Report Details</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr><td style="font-size:13px;color:${MUTED_COLOR};padding:3px 0;width:140px;">Report #</td><td style="font-size:13px;color:${TEXT_COLOR};font-weight:600;padding:3px 0;">{{reportId}}</td></tr>
            <tr><td style="font-size:13px;color:${MUTED_COLOR};padding:3px 0;">Date</td><td style="font-size:13px;color:${TEXT_COLOR};font-weight:600;padding:3px 0;">{{incidentDate}}</td></tr>
            <tr><td style="font-size:13px;color:${MUTED_COLOR};padding:3px 0;">Type</td><td style="font-size:13px;color:${TEXT_COLOR};font-weight:600;padding:3px 0;">{{incidentType}}</td></tr>
            <tr><td style="font-size:13px;color:${MUTED_COLOR};padding:3px 0;">Severity</td><td style="font-size:13px;color:${TEXT_COLOR};font-weight:600;padding:3px 0;">{{severity}}</td></tr>
            <tr><td style="font-size:13px;color:${MUTED_COLOR};padding:3px 0;">Reported By</td><td style="font-size:13px;color:${TEXT_COLOR};font-weight:600;padding:3px 0;">{{reportedBy}}</td></tr>
          </table>
        `)}
        ${para("Please log in to the system to review the full report, add notes, and assign follow-up actions as needed.")}
        ${ctaButton("{{reportUrl}}", "View Incident Report")}
      `)),
      textContent: `Incident Report Notification — {{companyName}}\n\nHello {{firstName}},\n\nAn incident report has been filed:\nReport #: {{reportId}}\nDate: {{incidentDate}}\nType: {{incidentType}}\nSeverity: {{severity}}\nReported By: {{reportedBy}}\n\nView the report: {{reportUrl}}\n\n— {{companyName}} Team`,
      placeholders: [
        { key: "firstName", label: "First Name", example: "Admin" },
        { key: "reportId", label: "Report ID", example: "IR-2026-0042" },
        { key: "incidentDate", label: "Incident Date", example: "March 22, 2026" },
        { key: "incidentType", label: "Incident Type", example: "Fall" },
        { key: "severity", label: "Severity", example: "Medium" },
        { key: "reportedBy", label: "Reported By", example: "Maria Santos" },
        { key: "reportUrl", label: "Report URL", example: "https://app.carechc.com/incident-reports/42" },
        { key: "companyName", label: "Company Name", example: "CCHC Solutions" },
        { key: "currentYear", label: "Current Year", example: "2026" },
      ],
      isDefault: true,
    },

    // ── 13. E-Signature Request ───────────────────────────────────────────
    {
      type: "esignature_request",
      name: "Document Signature Request",
      subject: "Action Required: Please Sign — {{documentName}}",
      htmlContent: emailShell(sectionBody(`
        ${greeting("{{firstName}}")}
        ${para("<strong>{{senderName}}</strong> at <strong>{{companyName}}</strong> has sent you a document for your electronic signature.")}
        ${infoBox(`
          <p style="font-size:15px;font-weight:700;color:${PRIMARY_COLOR};margin:0 0 12px 0;">✍️ Signature Required</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr><td style="font-size:13px;color:${MUTED_COLOR};padding:3px 0;width:140px;">Document</td><td style="font-size:13px;color:${TEXT_COLOR};font-weight:600;padding:3px 0;">{{documentName}}</td></tr>
            <tr><td style="font-size:13px;color:${MUTED_COLOR};padding:3px 0;">Sent By</td><td style="font-size:13px;color:${TEXT_COLOR};font-weight:600;padding:3px 0;">{{senderName}}</td></tr>
            <tr><td style="font-size:13px;color:${MUTED_COLOR};padding:3px 0;">Deadline</td><td style="font-size:13px;color:#c53030;font-weight:600;padding:3px 0;">{{deadline}}</td></tr>
          </table>
        `)}
        ${para("Please click below to review and sign the document. Your signature is required to proceed.")}
        ${ctaButton("{{signUrl}}", "Review & Sign Document")}
        ${divider()}
        ${para("If the button doesn't work, copy this link into your browser:<br><span style='font-size:13px;color:${PRIMARY_COLOR};word-break:break-all;'>{{signUrl}}</span>")}
        ${para("If you believe you received this in error, please contact your administrator.")}
      `)),
      textContent: `Signature Request — {{companyName}}\n\nHello {{firstName}},\n\n{{senderName}} has sent you a document to sign:\nDocument: {{documentName}}\nDeadline: {{deadline}}\n\nSign here: {{signUrl}}\n\n— {{companyName}} Team`,
      placeholders: [
        { key: "firstName", label: "First Name", example: "Maria" },
        { key: "documentName", label: "Document Name", example: "Employment Agreement 2026" },
        { key: "senderName", label: "Sender Name", example: "Office Administrator" },
        { key: "deadline", label: "Signing Deadline", example: "March 28, 2026" },
        { key: "signUrl", label: "Signing URL", example: "https://app.carechc.com/esign/abc123" },
        { key: "companyName", label: "Company Name", example: "CCHC Solutions" },
        { key: "currentYear", label: "Current Year", example: "2026" },
      ],
      isDefault: true,
    },

    // ── 14. Birthday — Client ─────────────────────────────────────────────
    {
      type: "birthday_client",
      name: "Birthday Greeting — Client",
      subject: "Happy Birthday, {{firstName}}! From the {{companyName}} Family",
      htmlContent: emailShell(`
          <tr>
            <td style="padding:40px 40px 8px 40px;text-align:center;">
              <p style="font-size:48px;margin:0 0 8px 0;">🎂</p>
              <h1 style="font-size:28px;font-weight:700;color:${TEXT_COLOR};margin:0 0 8px 0;">Happy Birthday, {{firstName}}!</h1>
              <p style="font-size:14px;color:${MUTED_COLOR};margin:0;">Wishing you a wonderful day</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 32px 40px;">
              <p style="font-size:16px;color:${TEXT_COLOR};line-height:1.8;margin:0 0 16px 0;">On this special day, the entire {{companyName}} team wants you to know how much you mean to us. We feel privileged to be part of your care journey.</p>
              <p style="font-size:16px;color:${TEXT_COLOR};line-height:1.8;margin:0 0 24px 0;">May your birthday be filled with love, laughter, and wonderful memories — and may the year ahead bring you health, happiness, and countless beautiful moments!</p>
              <div style="background:${ACCENT_COLOR};border-left:4px solid ${PRIMARY_COLOR};border-radius:6px;padding:16px 20px;margin:0 0 24px 0;">
                <p style="font-size:14px;color:${PRIMARY_COLOR};font-weight:600;margin:0 0 4px 0;">"Wishing you all the best on your special day!"</p>
                <p style="font-size:13px;color:${MUTED_COLOR};margin:0;">With warm wishes and gratitude</p>
              </div>
              <p style="font-size:15px;color:${TEXT_COLOR};margin:0;font-weight:600;">With love and warm wishes,</p>
              <p style="font-size:16px;color:${PRIMARY_COLOR};margin:6px 0 0 0;font-weight:700;">The {{companyName}} Family</p>
            </td>
          </tr>
      `),
      textContent: `Happy Birthday, {{firstName}}!\n\nOn this special day, the entire {{companyName}} team wants you to know how much you mean to us.\n\nMay your birthday be filled with love, laughter, and wonderful memories — and may the year ahead bring you health and happiness!\n\nWith warm wishes,\nThe {{companyName}} Family`,
      placeholders: [
        { key: "firstName", label: "First Name", example: "Margaret" },
        { key: "companyName", label: "Company Name", example: "CCHC Solutions" },
        { key: "currentYear", label: "Current Year", example: "2026" },
      ],
      isDefault: true,
    },

    // ── 15. Birthday — Caregiver ─────────────────────────────────────────
    {
      type: "birthday_caregiver",
      name: "Birthday Greeting — Caregiver",
      subject: "Happy Birthday, {{firstName}}! From the {{companyName}} Team",
      htmlContent: emailShell(`
          <tr>
            <td style="padding:40px 40px 8px 40px;text-align:center;">
              <p style="font-size:48px;margin:0 0 8px 0;">🌟</p>
              <h1 style="font-size:28px;font-weight:700;color:${TEXT_COLOR};margin:0 0 8px 0;">Happy Birthday, {{firstName}}!</h1>
              <p style="font-size:14px;color:${MUTED_COLOR};margin:0;">Celebrating you today and every day</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 32px 40px;">
              <p style="font-size:16px;color:${TEXT_COLOR};line-height:1.8;margin:0 0 16px 0;">On your special day, the entire {{companyName}} team wants to take a moment to celebrate you. Your dedication, compassion, and hard work make a real difference in the lives of those we serve together.</p>
              <p style="font-size:16px;color:${TEXT_COLOR};line-height:1.8;margin:0 0 24px 0;">Thank you for being such an incredible part of our caregiving family. We are so grateful to have you on our team — today and every day!</p>
              <div style="background:${ACCENT_COLOR};border-left:4px solid ${PRIMARY_COLOR};border-radius:6px;padding:16px 20px;margin:0 0 24px 0;">
                <p style="font-size:15px;color:${PRIMARY_COLOR};font-weight:600;margin:0 0 4px 0;">You make a difference every single day.</p>
                <p style="font-size:13px;color:${MUTED_COLOR};margin:0;">Happy Birthday from all of us!</p>
              </div>
              <p style="font-size:15px;color:${TEXT_COLOR};margin:0;font-weight:600;">With appreciation and warm wishes,</p>
              <p style="font-size:16px;color:${PRIMARY_COLOR};margin:6px 0 0 0;font-weight:700;">The {{companyName}} Team</p>
            </td>
          </tr>
      `),
      textContent: `Happy Birthday, {{firstName}}!\n\nOn your special day, the entire {{companyName}} team wants to celebrate you. Your dedication and compassion make a real difference in the lives of those we serve.\n\nThank you for being such an incredible part of our team!\n\nWith appreciation,\nThe {{companyName}} Team`,
      placeholders: [
        { key: "firstName", label: "First Name", example: "Maria" },
        { key: "companyName", label: "Company Name", example: "CCHC Solutions" },
        { key: "currentYear", label: "Current Year", example: "2026" },
      ],
      isDefault: true,
    },

  ];
}
