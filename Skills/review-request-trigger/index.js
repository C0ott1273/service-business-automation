/**
 * review-request-trigger — Skill #6
 * Send a review request SMS 2-3 days after job completion.
 *
 * Inputs:  { customer_name, phone, completion_date, review_link }
 * Outputs: Scheduled SMS confirmation
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sendSMS } = require('../twilio-sms-sender');

const REVIEW_LINK = process.env.REVIEW_LINK || 'https://g.page/r/your-review-link';

// In-memory queue (replace with DB in Phase 6)
const scheduledReviews = [];

/**
 * Generate the review request message.
 */
function buildReviewMessage(customerName, reviewLink) {
  return `Hi ${customerName}! Thank you for choosing us. We'd really appreciate it if you could leave us a quick review — it helps us grow and serve more customers like you.\n\n${reviewLink}\n\nThank you!`;
}

/**
 * Schedule a review request SMS for 2-3 days after job completion.
 * @param {Object} params
 * @param {string} params.customer_name
 * @param {string} params.phone
 * @param {string} params.completion_date - ISO date string
 * @param {string} [params.review_link] - Override the default review link
 * @param {number} [params.delay_days] - Days to wait (default: 2)
 * @returns {{ success, scheduled_for?, id?, error? }}
 */
function scheduleReviewRequest({ customer_name, phone, completion_date, review_link, delay_days = 2 }) {
  if (!customer_name || !phone) {
    return { success: false, error: 'customer_name and phone are required' };
  }

  const completionDate = completion_date ? new Date(completion_date) : new Date();
  const sendDate = new Date(completionDate);
  sendDate.setDate(sendDate.getDate() + delay_days);

  // Set to 10 AM on the send date
  sendDate.setHours(10, 0, 0, 0);

  const id = `rev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const entry = {
    id,
    customer_name,
    phone,
    review_link: review_link || REVIEW_LINK,
    completion_date: completionDate.toISOString(),
    scheduled_for: sendDate.toISOString(),
    status: 'scheduled',
  };

  scheduledReviews.push(entry);

  console.log(`[review-request] Scheduled for ${customer_name} (${phone}) on ${sendDate.toLocaleDateString()}`);

  return {
    success: true,
    id,
    scheduled_for: sendDate.toISOString(),
    message: `Review request scheduled for ${customer_name} on ${sendDate.toLocaleDateString()} at 10:00 AM`,
  };
}

/**
 * Send a review request immediately (for testing or manual trigger).
 */
async function sendReviewNow(customerName, phone, reviewLink) {
  const link = reviewLink || REVIEW_LINK;
  const message = buildReviewMessage(customerName, link);
  return sendSMS(phone, message);
}

/**
 * Process the scheduled queue — send any reviews that are due.
 * Call this on a timer (e.g., every hour) or via N8N cron.
 */
async function processScheduledReviews() {
  const now = new Date();
  const due = scheduledReviews.filter(
    (r) => r.status === 'scheduled' && new Date(r.scheduled_for) <= now
  );

  const results = [];

  for (const review of due) {
    console.log(`[review-request] Sending to ${review.customer_name} (${review.phone})...`);
    const smsResult = await sendSMS(review.phone, buildReviewMessage(review.customer_name, review.review_link));

    if (smsResult.success) {
      review.status = 'sent';
      review.sent_at = now.toISOString();
      review.sms_sid = smsResult.sid;
      results.push({ ...review, sms: 'sent' });
    } else {
      review.status = 'failed';
      review.error = smsResult.error;
      results.push({ ...review, sms: 'failed', error: smsResult.error });
    }
  }

  return { processed: results.length, results };
}

/**
 * Get all scheduled reviews.
 */
function getScheduledReviews() {
  return [...scheduledReviews];
}

module.exports = {
  scheduleReviewRequest,
  sendReviewNow,
  processScheduledReviews,
  getScheduledReviews,
  buildReviewMessage,
};

// --- CLI mode ---
if (require.main === module) {
  const [,, name, phone] = process.argv;

  if (!name || !phone) {
    console.log('Usage: node index.js <customer_name> <phone>');
    console.log('Example: node index.js "John Smith" "+15551234567"');
    process.exit(1);
  }

  const result = scheduleReviewRequest({
    customer_name: name,
    phone,
    completion_date: new Date().toISOString(),
  });
  console.log(JSON.stringify(result, null, 2));
}
