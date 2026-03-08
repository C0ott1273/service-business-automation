/**
 * remote-control — Interactive Telegram Control Panel
 *
 * Provides inline keyboard buttons for one-tap access to common
 * business operations. Tap /remote to open the control panel.
 *
 * Categories:
 *   - Schedule & Jobs
 *   - Leads & Customers
 *   - Marketing & Growth
 *   - System & Reports
 */

const { Markup } = require('telegraf');

// Callback action prefix
const PREFIX = 'rc:';

// --- Main menu ---
function buildMainMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📅 Schedule', `${PREFIX}schedule`),
      Markup.button.callback('📋 Jobs Today', `${PREFIX}jobs_today`),
    ],
    [
      Markup.button.callback('📨 Check Leads', `${PREFIX}check_leads`),
      Markup.button.callback('📞 Missed Calls', `${PREFIX}missed_calls`),
    ],
    [
      Markup.button.callback('💰 Pipeline', `${PREFIX}pipeline`),
      Markup.button.callback('📊 Status', `${PREFIX}status`),
    ],
    [
      Markup.button.callback('🌤 Weather', `${PREFIX}weather`),
      Markup.button.callback('📖 Bible', `${PREFIX}bible`),
    ],
    [
      Markup.button.callback('📣 Marketing', `${PREFIX}marketing_menu`),
      Markup.button.callback('🔧 Operations', `${PREFIX}ops_menu`),
    ],
    [
      Markup.button.callback('☀️ Briefing', `${PREFIX}briefing`),
      Markup.button.callback('🌙 Summary', `${PREFIX}summary`),
    ],
  ]);
}

// --- Marketing submenu ---
function buildMarketingMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('📣 Strategy', `${PREFIX}marketing`),
      Markup.button.callback('📝 Content', `${PREFIX}content`),
    ],
    [
      Markup.button.callback('🏢 GBP Post', `${PREFIX}gbp`),
      Markup.button.callback('🤝 Outreach', `${PREFIX}outreach`),
    ],
    [
      Markup.button.callback('🏆 Competitors', `${PREFIX}competitors`),
      Markup.button.callback('⭐ Referrals', `${PREFIX}referrals`),
    ],
    [
      Markup.button.callback('« Back', `${PREFIX}main`),
    ],
  ]);
}

// --- Operations submenu ---
function buildOpsMenu() {
  return Markup.inlineKeyboard([
    [
      Markup.button.callback('💧 Drip Stats', `${PREFIX}drip`),
      Markup.button.callback('📅 Bookings', `${PREFIX}bookings`),
    ],
    [
      Markup.button.callback('🎯 Goals', `${PREFIX}goals`),
      Markup.button.callback('🙏 Prayer', `${PREFIX}pray`),
    ],
    [
      Markup.button.callback('« Back', `${PREFIX}main`),
    ],
  ]);
}

module.exports = {
  PREFIX,
  buildMainMenu,
  buildMarketingMenu,
  buildOpsMenu,
};
