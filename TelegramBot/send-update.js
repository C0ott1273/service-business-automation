/**
 * One-time script to send build update to the bot owner.
 */
module.paths.unshift(require('path').resolve(__dirname, '../Skills/node_modules'));
require('dotenv').config({ path: require('path').resolve(__dirname, '../Skills/.env') });
const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

const message = [
  '🟢 BUILD UPDATE — All Tasks Complete',
  '',
  '━━━━━━━━━━━━━━━━━━',
  '📊 What I Built Today',
  '━━━━━━━━━━━━━━━━━━',
  '',
  '✅ 11 Skills — all tested and working',
  '✅ Enhanced Telegram Bot:',
  '',
  '📖 DAILY LIFE',
  '  /bible — daily Bible reading (OT + NT)',
  '  /weather — weather + outdoor work warnings',
  '  /briefing — full morning briefing on demand',
  '  /pray — daily prayer prompt',
  '',
  '⏰ AUTOMATED SCHEDULES',
  '  6:00 AM — Morning briefing',
  '  Hourly — Review request processor',
  '  Friday 5PM — Weekly review reminder',
  '  Sunday 8PM — Week ahead prep',
  '',
  '🎯 GOALS & REVIEWS',
  '  /setgoal — track your goals',
  '  /goals — view progress',
  '  /weeklyreview — weekly reflection',
  '',
  '💼 BUSINESS (Enhanced)',
  '  "Send invoice to Smith" — finds by name',
  '  "Look up Johnson" — searches invoices + estimates',
  '  Invoice/estimate lookup by number, name, or address',
  '',
  '🤖 CLAUDE CODE BRIDGE',
  '  "Claude: build me a landing page"',
  '  Tasks get queued for Claude Code',
  '',
  '━━━━━━━━━━━━━━━━━━',
  '32/32 tests passing',
  '━━━━━━━━━━━━━━━━━━',
  '',
  'Try now:',
  '  /briefing — see your morning briefing',
  '  /bible — today\'s reading',
  '  /weather — today\'s forecast',
  '  /help — see everything',
  '',
  'Your 6AM briefing starts tomorrow. 🙏',
].join('\n');

bot.telegram.getUpdates(0, 100, 0).then(updates => {
  // Find the most recent chat
  for (let i = updates.length - 1; i >= 0; i--) {
    const chatId = updates[i].message?.chat?.id;
    if (chatId) {
      console.log('Sending to chat:', chatId);
      return bot.telegram.sendMessage(chatId, message);
    }
  }
  console.log('No chats found. Send /start to the bot first.');
}).then((result) => {
  if (result) console.log('Update sent successfully!');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
