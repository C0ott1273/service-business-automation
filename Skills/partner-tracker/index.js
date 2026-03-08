/**
 * partner-tracker — Track referral partners (pool builders, realtors, inspectors)
 *
 * Manage relationships with businesses that can send referrals.
 * Generate personalized outreach messages via marketing-agent.
 */

const fs = require('fs');
const path = require('path');

const PARTNER_FILE = path.resolve(__dirname, 'partners.json');

const PARTNER_TYPES = ['pool_builder', 'realtor', 'inspector', 'property_manager', 'contractor', 'other'];

function loadPartners() {
  try { return JSON.parse(fs.readFileSync(PARTNER_FILE, 'utf8')); } catch (_) { return []; }
}

function savePartners(data) {
  fs.writeFileSync(PARTNER_FILE, JSON.stringify(data, null, 2));
}

/**
 * Add a new partner.
 */
function addPartner(name, type, phone, email, notes) {
  const partners = loadPartners();
  const pType = type.toLowerCase();

  if (!PARTNER_TYPES.includes(pType)) {
    return { success: false, error: `Invalid type "${pType}". Valid: ${PARTNER_TYPES.join(', ')}` };
  }

  const existing = partners.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    return { success: false, error: `Partner "${name}" already exists.` };
  }

  const partner = {
    id: `ptr_${Date.now()}`,
    name,
    type: pType,
    phone: phone || null,
    email: email || null,
    notes: notes || '',
    referralsSent: 0,
    lastContact: null,
    outreachSent: false,
    addedAt: new Date().toISOString(),
  };

  partners.push(partner);
  savePartners(partners);
  return { success: true, partner, message: `Added partner: ${name} (${pType})` };
}

/**
 * List all partners, optionally filtered by type.
 */
function listPartners(type) {
  const partners = loadPartners();
  if (type) {
    return partners.filter((p) => p.type === type.toLowerCase());
  }
  return partners;
}

/**
 * Record that a partner sent a referral.
 */
function recordPartnerReferral(partnerId) {
  const partners = loadPartners();
  const partner = partners.find((p) => p.id === partnerId);
  if (!partner) return { success: false, error: 'Partner not found.' };

  partner.referralsSent++;
  partner.lastContact = new Date().toISOString();
  savePartners(partners);
  return { success: true, message: `${partner.name} referral count: ${partner.referralsSent}` };
}

/**
 * Mark outreach as sent for a partner.
 */
function markOutreachSent(partnerId) {
  const partners = loadPartners();
  const partner = partners.find((p) => p.id === partnerId);
  if (!partner) return { success: false, error: 'Partner not found.' };

  partner.outreachSent = true;
  partner.lastContact = new Date().toISOString();
  savePartners(partners);
  return { success: true, message: `Outreach marked as sent for ${partner.name}.` };
}

/**
 * Find a partner by name.
 */
function findPartner(name) {
  const partners = loadPartners();
  const s = name.toLowerCase();
  return partners.filter((p) => p.name.toLowerCase().includes(s));
}

/**
 * Format partner list for Telegram.
 */
function formatPartnerList() {
  const partners = loadPartners();
  if (partners.length === 0) return 'No partners tracked yet. Add with /partners add <name> <type>';

  const byType = {};
  for (const p of partners) {
    if (!byType[p.type]) byType[p.type] = [];
    byType[p.type].push(p);
  }

  let msg = `Partners (${partners.length} total)\n\n`;
  for (const type of Object.keys(byType)) {
    msg += `${type.replace(/_/g, ' ')}:\n`;
    for (const p of byType[type]) {
      msg += `  ${p.name}${p.referralsSent > 0 ? ` (${p.referralsSent} referrals)` : ''}${p.outreachSent ? ' [contacted]' : ''}\n`;
    }
    msg += '\n';
  }

  return msg;
}

module.exports = {
  addPartner,
  listPartners,
  findPartner,
  recordPartnerReferral,
  markOutreachSent,
  formatPartnerList,
  PARTNER_TYPES,
};
