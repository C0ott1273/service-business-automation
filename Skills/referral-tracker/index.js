/**
 * referral-tracker — Customer referral program automation
 *
 * Tracks who referred whom, generates referral codes,
 * sends reward notifications, and calculates program ROI.
 *
 * Reward: $50 per successful referral (configurable).
 */

const fs = require('fs');
const path = require('path');

const REFERRAL_FILE = path.resolve(__dirname, 'referrals.json');
const REWARD_AMOUNT = parseFloat(process.env.REFERRAL_REWARD) || 50;

function loadReferrals() {
  try { return JSON.parse(fs.readFileSync(REFERRAL_FILE, 'utf8')); } catch (_) { return { customers: [], referrals: [] }; }
}

function saveReferrals(data) {
  fs.writeFileSync(REFERRAL_FILE, JSON.stringify(data, null, 2));
}

/**
 * Generate a unique referral code for a customer.
 */
function generateCode(name) {
  const slug = name.replace(/[^a-zA-Z]/g, '').substring(0, 6).toUpperCase();
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${slug}-${rand}`;
}

/**
 * Register a past customer in the referral program.
 */
function registerCustomer(params) {
  const { name, phone, email } = params;
  const data = loadReferrals();

  const existing = data.customers.find(
    (c) => c.phone === phone || (c.email && c.email === email)
  );
  if (existing) {
    return { success: true, customer: existing, message: `${name} is already registered. Code: ${existing.code}` };
  }

  const customer = {
    id: `ref_${Date.now()}`,
    name,
    phone: phone || null,
    email: email || null,
    code: generateCode(name),
    referralCount: 0,
    totalEarned: 0,
    registeredAt: new Date().toISOString(),
  };

  data.customers.push(customer);
  saveReferrals(data);

  return {
    success: true,
    customer,
    message: `${name} registered! Referral code: ${customer.code}. They earn $${REWARD_AMOUNT} per referral.`,
  };
}

/**
 * Record a referral when a new lead mentions a code or referrer name.
 */
function recordReferral(params) {
  const { referrerCode, referrerName, newLeadName, newLeadPhone, jobValue } = params;
  const data = loadReferrals();

  // Find referrer by code or name
  let referrer = null;
  if (referrerCode) {
    referrer = data.customers.find((c) => c.code === referrerCode.toUpperCase());
  }
  if (!referrer && referrerName) {
    referrer = data.customers.find((c) =>
      c.name.toLowerCase().includes(referrerName.toLowerCase())
    );
  }

  if (!referrer) {
    return { success: false, error: 'Referrer not found. Register them first with registerCustomer().' };
  }

  const referral = {
    id: `rr_${Date.now()}`,
    referrerId: referrer.id,
    referrerName: referrer.name,
    referrerCode: referrer.code,
    newLeadName: newLeadName || 'Unknown',
    newLeadPhone: newLeadPhone || null,
    jobValue: jobValue || 0,
    rewardAmount: REWARD_AMOUNT,
    rewardPaid: false,
    status: 'pending', // pending | installed | paid | cancelled
    createdAt: new Date().toISOString(),
  };

  data.referrals.push(referral);

  // Update referrer stats
  referrer.referralCount++;
  referrer.totalEarned += REWARD_AMOUNT;

  saveReferrals(data);

  return {
    success: true,
    referral,
    message: `Referral recorded! ${referrer.name} referred ${newLeadName}. Reward: $${REWARD_AMOUNT}.`,
  };
}

/**
 * Mark a referral reward as paid.
 */
function markRewardPaid(referralId) {
  const data = loadReferrals();
  const ref = data.referrals.find((r) => r.id === referralId);
  if (!ref) return { success: false, error: 'Referral not found.' };

  ref.rewardPaid = true;
  ref.status = 'paid';
  saveReferrals(data);
  return { success: true, message: `$${ref.rewardAmount} reward marked as paid to ${ref.referrerName}.` };
}

/**
 * Get pending (unpaid) rewards.
 */
function getPendingRewards() {
  const data = loadReferrals();
  return data.referrals.filter((r) => !r.rewardPaid && r.status !== 'cancelled');
}

/**
 * Get referral program stats.
 */
function getReferralStats() {
  const data = loadReferrals();
  const totalReferrals = data.referrals.length;
  const installed = data.referrals.filter((r) => r.status === 'installed' || r.status === 'paid');
  const totalRevenueFromReferrals = installed.reduce((sum, r) => sum + (r.jobValue || 0), 0);
  const totalRewardsPaid = data.referrals.filter((r) => r.rewardPaid).reduce((sum, r) => sum + r.rewardAmount, 0);
  const pendingRewards = getPendingRewards().reduce((sum, r) => sum + r.rewardAmount, 0);

  return {
    totalCustomersRegistered: data.customers.length,
    totalReferrals,
    jobsFromReferrals: installed.length,
    revenueFromReferrals: totalRevenueFromReferrals,
    totalRewardsPaid,
    pendingRewards,
    roi: totalRewardsPaid > 0
      ? `${((totalRevenueFromReferrals / totalRewardsPaid) * 100).toFixed(0)}%`
      : 'N/A',
  };
}

/**
 * Get the SMS to send to a past customer inviting them to refer.
 */
function getReferralInviteSMS(customer) {
  return `Hi ${customer.name}! Thanks again for choosing us for your pool fence. Know someone who needs one? Share your code ${customer.code} — you'll get $${REWARD_AMOUNT} for every referral that installs! Just have them mention your name or code.`;
}

/**
 * Format referral stats for Telegram.
 */
function formatReferralStats() {
  const stats = getReferralStats();
  const pending = getPendingRewards();

  let msg = `Referral Program\n\n` +
    `Registered customers: ${stats.totalCustomersRegistered}\n` +
    `Total referrals: ${stats.totalReferrals}\n` +
    `Jobs from referrals: ${stats.jobsFromReferrals}\n` +
    `Revenue from referrals: $${stats.revenueFromReferrals.toLocaleString()}\n` +
    `Rewards paid: $${stats.totalRewardsPaid}\n` +
    `Pending rewards: $${stats.pendingRewards}\n` +
    `ROI: ${stats.roi}`;

  if (pending.length > 0) {
    msg += `\n\nPending rewards:\n` +
      pending.map((r) => `  ${r.referrerName}: $${r.rewardAmount} (referred ${r.newLeadName})`).join('\n');
  }

  return msg;
}

// --- Scheduled referral invite queue (survives restarts via JSON) ---
const INVITE_FILE = path.resolve(__dirname, 'pending-invites.json');

function loadInvites() {
  try { return JSON.parse(fs.readFileSync(INVITE_FILE, 'utf8')); } catch (_) { return []; }
}

function saveInvites(invites) {
  fs.writeFileSync(INVITE_FILE, JSON.stringify(invites, null, 2));
}

/**
 * Schedule a referral invite SMS to be sent 5 days after job completion.
 */
function scheduleReferralInvite(customer) {
  const invites = loadInvites();
  const existing = invites.find((i) => i.phone === customer.phone && i.status === 'pending');
  if (existing) return { success: false, message: 'Invite already scheduled.' };

  invites.push({
    id: `inv_${Date.now()}`,
    name: customer.name,
    phone: customer.phone,
    code: customer.code,
    sendAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
  saveInvites(invites);
  return { success: true, message: `Referral invite scheduled for ${customer.name} in 5 days.` };
}

/**
 * Process scheduled invites. Call on hourly cron.
 * Returns { sent, errors } count.
 */
async function processScheduledInvites() {
  const invites = loadInvites();
  const now = new Date();
  let sent = 0;

  for (const invite of invites) {
    if (invite.status !== 'pending') continue;
    if (new Date(invite.sendAt) > now) continue;

    try {
      const { sendSMS } = require('../twilio-sms-sender');
      const msg = getReferralInviteSMS({ name: invite.name, code: invite.code });
      const result = await sendSMS(invite.phone, msg);
      invite.status = result.success ? 'sent' : 'failed';
      invite.sentAt = now.toISOString();
      sent++;
    } catch (err) {
      invite.status = 'failed';
      invite.error = err.message;
    }
  }

  saveInvites(invites);
  return { sent };
}

module.exports = {
  registerCustomer,
  recordReferral,
  markRewardPaid,
  getPendingRewards,
  getReferralStats,
  getReferralInviteSMS,
  formatReferralStats,
  scheduleReferralInvite,
  processScheduledInvites,
  REWARD_AMOUNT,
};
