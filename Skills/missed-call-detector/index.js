/**
 * missed-call-detector — Skill
 * Polls Twilio for missed/unanswered calls and returns them.
 *
 * Requires:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_PHONE_NUMBER — must have voice capability
 *
 * Exports: { checkMissedCalls }
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

let lastCheckTime = new Date(Date.now() - 60 * 60 * 1000); // Default: 1 hour ago

/**
 * Check for missed calls since last check.
 * @returns {Promise<Array<{from: string, timestamp: string, callSid: string, status: string}>>}
 */
async function checkMissedCalls() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const businessNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken) {
    console.error('[missed-call-detector] Missing Twilio credentials');
    return [];
  }

  try {
    const twilio = require('twilio');
    const client = twilio(accountSid, authToken);

    // Fetch no-answer and busy calls since last check
    const [noAnswer, busy] = await Promise.all([
      client.calls.list({
        status: 'no-answer',
        startTimeAfter: lastCheckTime,
        to: businessNumber,
        limit: 20,
      }),
      client.calls.list({
        status: 'busy',
        startTimeAfter: lastCheckTime,
        to: businessNumber,
        limit: 20,
      }),
    ]);

    lastCheckTime = new Date();

    const allMissed = [...noAnswer, ...busy];

    return allMissed.map((call) => ({
      from: call.from,
      timestamp: call.startTime ? call.startTime.toISOString() : new Date().toISOString(),
      callSid: call.sid,
      status: call.status,
    }));
  } catch (err) {
    console.error('[missed-call-detector] Twilio API error:', err.message);
    return [];
  }
}

module.exports = { checkMissedCalls };

// --- CLI mode ---
if (require.main === module) {
  checkMissedCalls().then((calls) => {
    console.log(`Found ${calls.length} missed call(s):`);
    calls.forEach((c) => console.log(JSON.stringify(c, null, 2)));
  });
}
