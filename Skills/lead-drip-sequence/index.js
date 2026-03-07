/**
 * lead-drip-sequence — Automated follow-up for unresponsive leads
 *
 * Schedule: Day 0 (immediate), Day 1, Day 3, Day 7
 * Each step sends a progressively different SMS via Twilio.
 * Leads are removed from the sequence once they respond or schedule.
 *
 * Storage: JSON file (upgrade to DB later if needed)
 */

const fs = require('fs');
const path = require('path');
const { sendSMS } = require('../twilio-sms-sender');

const DRIP_FILE = path.resolve(__dirname, 'drip-queue.json');

// Drip steps: delay in hours from lead creation
const DRIP_STEPS = [
  {
    step: 0,
    delayHours: 0,
    template: (name) =>
      `Hi ${name}! Thanks for reaching out about pool fencing. When works best for a free estimate? We have openings this week!`,
  },
  {
    step: 1,
    delayHours: 24,
    template: (name) =>
      `Hi ${name}, just following up on your pool fence inquiry. Would this week work for a free on-site estimate? Takes about 15 minutes.`,
  },
  {
    step: 2,
    delayHours: 72,
    template: (name) =>
      `Quick reminder ${name} — we still have openings for free pool fence estimates this week. Most installs are done in one day! Let me know if you're interested.`,
  },
  {
    step: 3,
    delayHours: 168,
    template: (name) =>
      `Last check-in, ${name}! If you're still considering a pool fence, we're here whenever you're ready. Feel free to reach out anytime. Have a great week!`,
  },
];

// --- Load/save drip queue ---
function loadQueue() {
  try {
    return JSON.parse(fs.readFileSync(DRIP_FILE, 'utf8'));
  } catch (_) {
    return [];
  }
}

function saveQueue(queue) {
  fs.writeFileSync(DRIP_FILE, JSON.stringify(queue, null, 2));
}

/**
 * Add a lead to the drip sequence.
 * Step 0 (immediate) is sent right away.
 */
async function addToDrip(lead) {
  const queue = loadQueue();

  // Check for duplicate (same phone)
  const existing = queue.find(
    (l) => l.phone === lead.phone && l.status === 'active'
  );
  if (existing) {
    return { success: false, message: `${lead.name} is already in the drip sequence (step ${existing.currentStep}).` };
  }

  const entry = {
    id: `drip_${Date.now()}`,
    name: lead.name || 'there',
    phone: lead.phone,
    email: lead.email || null,
    source: lead.source || 'unknown',
    currentStep: 0,
    status: 'active', // active | completed | cancelled
    createdAt: new Date().toISOString(),
    lastSentAt: null,
    nextSendAt: new Date().toISOString(), // Step 0 = now
    history: [],
  };

  queue.push(entry);
  saveQueue(queue);

  // Send step 0 immediately
  const result = await sendDripStep(entry, DRIP_STEPS[0]);
  return {
    success: true,
    message: `${lead.name} added to drip sequence. Step 0 sent${result.success ? '' : ' (SMS failed: ' + result.error + ')'}.`,
    entry,
  };
}

/**
 * Send a specific drip step to a lead.
 */
async function sendDripStep(entry, step) {
  const message = step.template(entry.name);
  const result = await sendSMS(entry.phone, message);

  // Update entry
  const queue = loadQueue();
  const target = queue.find((l) => l.id === entry.id);
  if (target) {
    target.lastSentAt = new Date().toISOString();
    target.history.push({
      step: step.step,
      sentAt: target.lastSentAt,
      success: result.success,
      error: result.error || null,
    });

    // Schedule next step or mark completed
    const nextStepIdx = step.step + 1;
    if (nextStepIdx < DRIP_STEPS.length) {
      target.currentStep = nextStepIdx;
      const nextDelay = DRIP_STEPS[nextStepIdx].delayHours;
      target.nextSendAt = new Date(
        Date.now() + nextDelay * 60 * 60 * 1000
      ).toISOString();
    } else {
      target.status = 'completed';
      target.nextSendAt = null;
    }

    saveQueue(queue);
  }

  return result;
}

/**
 * Process all due drip messages. Call this on a cron (e.g., every hour).
 */
async function processDripQueue() {
  const queue = loadQueue();
  const now = new Date();
  let sent = 0;

  for (const entry of queue) {
    if (entry.status !== 'active') continue;
    if (!entry.nextSendAt) continue;
    if (new Date(entry.nextSendAt) > now) continue;

    const step = DRIP_STEPS[entry.currentStep];
    if (!step) continue;

    await sendDripStep(entry, step);
    sent++;
  }

  return { processed: sent, total: queue.filter((l) => l.status === 'active').length };
}

/**
 * Remove a lead from the drip sequence (they responded or scheduled).
 */
function cancelDrip(phone) {
  const queue = loadQueue();
  const entry = queue.find(
    (l) => l.phone === phone && l.status === 'active'
  );
  if (!entry) {
    return { success: false, message: 'No active drip found for that number.' };
  }

  entry.status = 'cancelled';
  entry.nextSendAt = null;
  saveQueue(queue);

  return { success: true, message: `Drip cancelled for ${entry.name} (${entry.phone}).` };
}

/**
 * Get drip queue stats for dashboard/status.
 */
function getDripStats() {
  const queue = loadQueue();
  return {
    active: queue.filter((l) => l.status === 'active').length,
    completed: queue.filter((l) => l.status === 'completed').length,
    cancelled: queue.filter((l) => l.status === 'cancelled').length,
    total: queue.length,
  };
}

module.exports = {
  addToDrip,
  processDripQueue,
  cancelDrip,
  getDripStats,
  DRIP_STEPS,
};
