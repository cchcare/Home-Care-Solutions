import twilio from 'twilio';

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

export async function sendSMS(to: string, message: string) {
  const client = getTwilioClient();
  const fromNumber = getTwilioFromPhoneNumber();
  
  const result = await client.messages.create({
    body: message,
    from: fromNumber,
    to: to
  });
  
  return {
    success: true,
    messageSid: result.sid,
    status: result.status
  };
}
