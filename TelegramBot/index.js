/**
 * telegram-bot-assistant — Skill #8
 * Central command interface. Personal CEO assistant via Telegram.
 *
 * Connects to all skills and routes natural language commands.
 * Small commands execute immediately. Big tasks require CONFIRM.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../Skills/.env') });
const { Telegraf } = require('telegraf');
const { parseCommand, executeCommand } = require('../Skills/inbound-command-handler');
const { scheduleReviewRequest } = require('../Skills/review-request-trigger');
const { getTodaysJobs, formatSchedule } = require('../Skills/google-calendar-sync');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('[bot] Missing TELEGRAM_BOT_TOKEN in .env');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Track pending confirmations per chat
const pendingConfirm = new Map();

// --- /start command ---
bot.start((ctx) => {
  ctx.reply(
    'Welcome, boss. I\'m your CEO assistant.\n\n' +
    'Tell me what you need:\n' +
    '- "What\'s my schedule today?"\n' +
    '- "Job 1001 done"\n' +
    '- "Send invoice for job 1001"\n' +
    '- "How much did we spend on ads?"\n' +
    '- "Start building [app name]"\n\n' +
    'Type /help for all commands.'
  );
});

// --- /help command ---
bot.help((ctx) => {
  ctx.reply(
    'Available commands:\n\n' +
    'Schedule:\n' +
    '  "What\'s my schedule today?"\n' +
    '  "Schedule for March 15"\n\n' +
    'Jobs:\n' +
    '  "Job 1001 done" → sends invoice + schedules review\n' +
    '  "Send invoice for job 1001"\n' +
    '  "Status on job 1001"\n\n' +
    'SMS:\n' +
    '  "Text 5551234567: Your estimate is confirmed"\n\n' +
    'Business:\n' +
    '  "How much did we spend on ads?"\n' +
    '  "Where can we cut costs?"\n\n' +
    'Projects:\n' +
    '  "Start building [name]" (requires CONFIRM)\n\n' +
    'System:\n' +
    '  /status — system health check\n' +
    '  /leads — recent leads\n' +
    '  /reviews — scheduled review requests'
  );
});

// --- /status command ---
bot.command('status', async (ctx) => {
  const calResult = await getTodaysJobs();
  const jobCount = calResult.success ? calResult.count : 'N/A';

  ctx.reply(
    'System Status: All skills operational\n\n' +
    `Today's jobs: ${jobCount}\n` +
    'Skills loaded: 8/8\n' +
    '  1. email-parser\n' +
    '  2. twilio-sms-sender\n' +
    '  3. google-calendar-sync\n' +
    '  4. quickbooks-job-lookup\n' +
    '  5. quickbooks-invoice-sender\n' +
    '  6. review-request-trigger\n' +
    '  7. inbound-command-handler\n' +
    '  8. telegram-bot-assistant'
  );
});

// --- Handle natural language messages ---
bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();
  const chatId = ctx.chat.id;

  // Handle CONFIRM response
  if (text.toUpperCase() === 'CONFIRM') {
    const pending = pendingConfirm.get(chatId);
    if (pending) {
      pendingConfirm.delete(chatId);
      ctx.reply('Confirmed. Executing...');
      try {
        const response = await executeCommand(pending);
        ctx.reply(response);
      } catch (err) {
        ctx.reply(`Error: ${err.message}`);
      }
    } else {
      ctx.reply('Nothing pending to confirm.');
    }
    return;
  }

  // Handle CANCEL response
  if (text.toUpperCase() === 'CANCEL') {
    if (pendingConfirm.has(chatId)) {
      pendingConfirm.delete(chatId);
      ctx.reply('Cancelled.');
    } else {
      ctx.reply('Nothing to cancel.');
    }
    return;
  }

  // Parse the command
  const parsed = parseCommand(text);

  if (parsed.intent === 'unknown') {
    ctx.reply(
      'I didn\'t catch that. Try:\n' +
      '- "Job 1001 done"\n' +
      '- "What\'s my schedule today?"\n' +
      '- "Send invoice for job 1001"\n\n' +
      'Type /help for all commands.'
    );
    return;
  }

  // If command requires confirmation, store and ask
  if (parsed.requiresConfirm) {
    pendingConfirm.set(chatId, parsed);
    ctx.reply(
      `This requires confirmation:\n\n` +
      `Action: ${parsed.intent.replace(/_/g, ' ')}\n` +
      `Details: ${JSON.stringify(parsed.params)}\n\n` +
      `Reply CONFIRM to proceed or CANCEL to abort.`
    );
    return;
  }

  // Execute immediately
  try {
    const response = await executeCommand(parsed);

    // If this was a job_complete, also schedule a review request
    if (parsed.intent === 'job_complete' && response && !response.startsWith('Error')) {
      const { lookupJob } = require('../Skills/quickbooks-job-lookup');
      const lookup = await lookupJob(parsed.params.jobNumber);
      if (lookup.success && lookup.job) {
        const reviewResult = scheduleReviewRequest({
          customer_name: lookup.job.customer_name,
          phone: lookup.job.email, // Will use phone if available
          completion_date: new Date().toISOString(),
        });
        ctx.reply(response + '\n\n' + (reviewResult.message || ''));
        return;
      }
    }

    ctx.reply(response);
  } catch (err) {
    ctx.reply(`Something went wrong: ${err.message}`);
  }
});

// --- Error handler ---
bot.catch((err) => {
  console.error('[bot] Error:', err.message);
});

// --- Launch ---
console.log('[bot] Starting Telegram CEO Assistant...');
bot.launch().then(() => {
  console.log('[bot] Bot is running. Send a message on Telegram.');
});

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = { bot };
