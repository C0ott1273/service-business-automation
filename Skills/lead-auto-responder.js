/**
 * lead-auto-responder — Phase 1 Glue
 * Wires email-parser → twilio-sms-sender
 * When a new lead email is detected, auto-sends a welcome SMS.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
const { monitorInbox } = require('./email-parser');
const { sendSMS } = require('./twilio-sms-sender');

// --- Configurable message template ---
const WELCOME_TEMPLATE = (name) =>
  `Hi ${name}! Thanks for reaching out. We'd love to schedule a free estimate for you. What day and time works best? Reply here or call us anytime.`;

// --- Track processed leads to avoid duplicates ---
const processed = new Set();

function onNewLead(lead) {
  const key = lead.phone || lead.email;
  if (!key || processed.has(key)) return;
  processed.add(key);

  console.log(`[lead-auto-responder] New lead: ${lead.name} (${lead.phone || lead.email})`);

  if (!lead.phone) {
    console.log('[lead-auto-responder] No phone number — skipping SMS. Lead saved for manual follow-up.');
    return;
  }

  const message = WELCOME_TEMPLATE(lead.name);

  sendSMS(lead.phone, message).then((result) => {
    if (result.success) {
      console.log(`[lead-auto-responder] SMS sent to ${lead.phone} (SID: ${result.sid})`);
    } else {
      console.error(`[lead-auto-responder] SMS failed: ${result.error}`);
    }
  });
}

// --- Start ---
console.log('[lead-auto-responder] Phase 1 pipeline starting...');
console.log('[lead-auto-responder] Email → Parse Lead → Auto-SMS');
console.log('');

const stop = monitorInbox(onNewLead);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[lead-auto-responder] Shutting down...');
  stop();
  process.exit(0);
});
