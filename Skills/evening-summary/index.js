/**
 * evening-summary — Skill
 * Compiles a 5PM end-of-day summary for the owner.
 *
 * Tracks jobs completed and invoices sent throughout the day,
 * then builds a formatted summary with tomorrow's preview.
 *
 * Exports: { buildEveningSummary, trackJobCompleted, trackInvoiceSent, resetDailyTracking }
 */

const { getTodaysJobs, getEvents, formatSchedule } = require('../google-calendar-sync');
const { getScheduledReviews } = require('../review-request-trigger');
const { getPipelineStats } = require('../pipeline-tracker');
const { getDripStats } = require('../lead-drip-sequence');

// Daily tracking (resets at midnight or on first call of new day)
let trackingDate = new Date().toDateString();
const completedJobs = [];
const sentInvoices = [];

function ensureCurrentDay() {
  const today = new Date().toDateString();
  if (trackingDate !== today) {
    completedJobs.length = 0;
    sentInvoices.length = 0;
    trackingDate = today;
  }
}

/**
 * Track a completed job for the daily summary.
 * @param {string} jobNumber
 * @param {string} customerName
 */
function trackJobCompleted(jobNumber, customerName) {
  ensureCurrentDay();
  completedJobs.push({
    jobNumber,
    customerName: customerName || 'Unknown',
    time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  });
}

/**
 * Track a sent invoice for the daily summary.
 * @param {string} invoiceNumber
 * @param {string} customerName
 * @param {number} amount
 */
function trackInvoiceSent(invoiceNumber, customerName, amount) {
  ensureCurrentDay();
  sentInvoices.push({
    invoiceNumber,
    customerName: customerName || 'Unknown',
    amount: amount || 0,
    time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
  });
}

/**
 * Reset daily tracking (called automatically on new day).
 */
function resetDailyTracking() {
  completedJobs.length = 0;
  sentInvoices.length = 0;
  trackingDate = new Date().toDateString();
}

/**
 * Build the 5PM evening summary.
 * @returns {Promise<string>}
 */
async function buildEveningSummary() {
  ensureCurrentDay();

  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const sections = [];

  // Header
  sections.push(`End of Day Summary — ${dayName}, ${dateStr}`);
  sections.push('—————————————————');

  // Jobs completed
  if (completedJobs.length > 0) {
    const jobList = completedJobs
      .map((j) => `  #${j.jobNumber} — ${j.customerName} (${j.time})`)
      .join('\n');
    sections.push(`Jobs Completed: ${completedJobs.length}\n${jobList}`);
  } else {
    sections.push('Jobs Completed: 0');
  }

  // Invoices sent
  if (sentInvoices.length > 0) {
    const totalAmount = sentInvoices.reduce((sum, inv) => sum + inv.amount, 0);
    const invList = sentInvoices
      .map((inv) => `  #${inv.invoiceNumber} — ${inv.customerName} ($${inv.amount.toFixed(2)})`)
      .join('\n');
    sections.push(`Invoices Sent: ${sentInvoices.length} — Total: $${totalAmount.toFixed(2)}\n${invList}`);
  } else {
    sections.push('Invoices Sent: 0');
  }

  // Pending review requests
  try {
    const reviews = getScheduledReviews();
    const pending = reviews.filter((r) => r.status === 'scheduled');
    if (pending.length > 0) {
      sections.push(`Pending Review Requests: ${pending.length}`);
    }
  } catch (e) {
    // Review tracking not available
  }

  // Pipeline & drip stats
  try {
    const pipeStats = getPipelineStats(30);
    const dripStats = getDripStats();
    sections.push(
      `Pipeline (30 days):\n` +
      `  Leads: ${pipeStats.totalLeads} | Active: ${pipeStats.activeDeals} | Lost: ${pipeStats.lostDeals}\n` +
      `  Close rate: ${pipeStats.closeRate} | Revenue: $${pipeStats.closedRevenue.toLocaleString()}\n` +
      `  Drip sequences: ${dripStats.active} active, ${dripStats.completed} completed`
    );
  } catch (e) {
    // Pipeline tracking not available
  }

  // Tomorrow's preview
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const result = await getEvents(tomorrowStr);
    if (result.success && result.count > 0) {
      sections.push(`\nTomorrow's Schedule (${result.count} job${result.count > 1 ? 's' : ''}):\n${formatSchedule(result.events)}`);
    } else {
      sections.push('\nTomorrow: No jobs scheduled');
    }
  } catch (e) {
    sections.push('\nTomorrow: Calendar unavailable');
  }

  sections.push('—————————————————');
  sections.push('Have a great evening, boss. Rest up for tomorrow.');

  return sections.join('\n\n');
}

module.exports = { buildEveningSummary, trackJobCompleted, trackInvoiceSent, resetDailyTracking };

// --- CLI mode ---
if (require.main === module) {
  buildEveningSummary().then((summary) => {
    console.log(summary);
  });
}
