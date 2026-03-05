/**
 * Centralized SMS templates for Protect A Child Pool Fence business.
 * Import these from any skill to keep messaging consistent.
 */

const templates = {
  leadResponse: (name) =>
    `Hi ${name}! Thanks for reaching out about pool fencing. When works best for a free estimate?`,

  missedCall: () =>
    `Hi! Sorry we missed your call. How can we help? We'd love to schedule a free estimate for a pool fence.`,

  estimateFollowUp: (name) =>
    `Hi ${name}! Just following up on your pool fence estimate. Any questions? We'd love to get you on the schedule!`,

  reviewRequest: (name, link) =>
    `Hi ${name}! Thank you for choosing us for your pool fence. We'd really appreciate a quick review: ${link}`,

  jobScheduled: (name, date) =>
    `Hi ${name}! Your pool fence installation is confirmed for ${date}. We'll see you then!`,

  estimateSent: (name) =>
    `Hi ${name}! We just sent over your pool fence estimate. Take a look and let us know if you have any questions!`,
};

module.exports = templates;
