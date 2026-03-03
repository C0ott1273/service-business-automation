/**
 * twilio-sms-sender — Skill #2
 * Sends outbound SMS from the registered business Twilio number.
 *
 * Inputs:  { to_phone, message_body }
 * Outputs: { success, sid, status, to, error? }
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const twilio = require('twilio');

// --- Configuration ---
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER;

/**
 * Send an SMS message via Twilio.
 * @param {string} toPhone - Recipient phone number (E.164 format preferred, e.g. +15551234567)
 * @param {string} messageBody - The SMS text content
 * @returns {Promise<{success: boolean, sid?: string, status?: string, to?: string, error?: string}>}
 */
async function sendSMS(toPhone, messageBody) {
  if (!ACCOUNT_SID || !AUTH_TOKEN || !FROM_NUMBER) {
    return {
      success: false,
      error: 'Missing Twilio credentials. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env',
    };
  }

  if (!toPhone || !messageBody) {
    return { success: false, error: 'to_phone and message_body are required' };
  }

  // Normalize phone number to E.164
  let normalized = toPhone.replace(/[^\d+]/g, '');
  if (!normalized.startsWith('+')) {
    normalized = '+1' + normalized; // Default to US
  }

  try {
    const client = twilio(ACCOUNT_SID, AUTH_TOKEN);
    const message = await client.messages.create({
      body: messageBody,
      from: FROM_NUMBER,
      to: normalized,
    });

    return {
      success: true,
      sid: message.sid,
      status: message.status,
      to: message.to,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
    };
  }
}

// --- Exports ---
module.exports = { sendSMS };

// --- CLI mode ---
if (require.main === module) {
  const [,, phone, ...msgParts] = process.argv;
  const msg = msgParts.join(' ');

  if (!phone || !msg) {
    console.log('Usage: node index.js <phone> <message>');
    console.log('Example: node index.js +15551234567 "Thanks for reaching out! We will contact you shortly."');
    process.exit(1);
  }

  sendSMS(phone, msg).then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  });
}
