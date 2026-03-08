/**
 * sms-templates — Centralized SMS templates for Protect A Child Pool Fence
 *
 * All customer-facing text messages in one place.
 * Used by: TelegramBot, lead-auto-responder, lead-drip-sequence, review-request-trigger
 */

module.exports = {
  leadResponse: (name) =>
    `Hi ${name || 'there'}! Thanks for reaching out about pool fencing. When works best for a free estimate? We have openings this week!`,

  missedCall: () =>
    `Hi! Sorry we missed your call. We'd love to help with your pool fencing needs. When's a good time to call back, or would you prefer to schedule a free estimate?`,

  estimateFollowUp: (name) =>
    `Hi ${name || 'there'}, following up on your pool fence estimate. Any questions? We can usually schedule installation within a week!`,

  reviewRequest: (name, link) =>
    `Hi ${name || 'there'}! Thank you for choosing us. We'd really appreciate a quick review: ${link}`,

  jobScheduled: (name, date) =>
    `Hi ${name || 'there'}! Your pool fence installation is confirmed for ${date}. We'll see you then!`,

  referralInvite: (name, code) =>
    `Hi ${name || 'there'}! Thanks for choosing us for your pool fence. Know someone who needs one? Share code ${code} — you'll get $50 for every referral that installs!`,
};
