/**
 * telegram-bot-assistant — Skill #8 (Enhanced)
 * Central CEO command interface via Telegram.
 *
 * Features:
 * - 6AM daily morning briefing (calendar, weather, Bible, prayer)
 * - Natural language command routing to all skills
 * - CONFIRM/CANCEL flow for big actions
 * - Claude Code bridge — relay tasks to Claude and get updates
 * - Weekly review and goal tracking
 */

// Resolve node_modules from Skills/ where dependencies are installed
module.paths.unshift(require('path').resolve(__dirname, '../Skills/node_modules'));

require('dotenv').config({ path: require('path').resolve(__dirname, '../Skills/.env') });
const { Telegraf } = require('telegraf');
const cron = require('node-cron');
const { parseCommand, executeCommand } = require('../Skills/inbound-command-handler');
const { scheduleReviewRequest, processScheduledReviews } = require('../Skills/review-request-trigger');
const fs = require('fs');
const { loadTasks, saveTasks, formatTaskNotification, TASK_FILE } = require('./claude-task-done');
const { getTodaysJobs, formatSchedule } = require('../Skills/google-calendar-sync');
const { buildMorningBriefing } = require('../Skills/morning-briefing');
const { formatDailyReading } = require('../Skills/daily-bible-reading');
const { formatWeatherBriefing } = require('../Skills/weather-forecast');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_CHAT_ID = process.env.TELEGRAM_OWNER_CHAT_ID || null;

if (!BOT_TOKEN) {
  console.error('[bot] Missing TELEGRAM_BOT_TOKEN in .env');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

// Track state
const pendingConfirm = new Map();
let ownerChatId = OWNER_CHAT_ID; // Will be set on first /start if not in env

// --- Helper: send message to owner ---
async function notifyOwner(message) {
  if (!ownerChatId) return;
  try {
    await bot.telegram.sendMessage(ownerChatId, message);
  } catch (err) {
    console.error('[bot] Failed to notify owner:', err.message);
  }
}

// =====================
// SLASH COMMANDS
// =====================

bot.start((ctx) => {
  // Save owner chat ID on first /start
  if (!ownerChatId) {
    ownerChatId = ctx.chat.id;
    console.log(`[bot] Owner chat ID set: ${ownerChatId}`);
  }

  ctx.reply(
    `Welcome back, boss. Your CEO assistant is online.\n\n` +
    `Here's what I can do:\n\n` +
    `📋 Business\n` +
    `  "What's my schedule today?"\n` +
    `  "Job xxxx done"\n` +
    `  "Send invoice for job xxxx"\n\n` +
    `📖 Daily Life\n` +
    `  /bible — today's Bible reading\n` +
    `  /weather — weather forecast\n` +
    `  /briefing — full morning briefing now\n\n` +
    `🤖 Claude Code\n` +
    `  "Claude: build me a landing page"\n` +
    `  "Claude update" — check task status\n` +
    `  /claudestatus — all Claude tasks\n\n` +
    `📊 Weekly\n` +
    `  /weeklyreview — review the week\n` +
    `  /goals — check your goals\n\n` +
    `⚙️ System\n` +
    `  /status — system health\n` +
    `  /help — all commands\n\n` +
    `Morning briefing arrives at 6:00 AM daily. 🌅`
  );
});

bot.help((ctx) => {
  ctx.reply(
    `📋 All Commands\n\n` +
    `SCHEDULE & JOBS\n` +
    `  "What's my schedule today?"\n` +
    `  "Schedule for March 15"\n` +
    `  "Job xxxx done" → invoice + review\n` +
    `  "Send invoice for job xxxx"\n` +
    `  "Status on job xxxx"\n\n` +
    `SMS & COMMUNICATION\n` +
    `  "Text 5551234567: message here"\n\n` +
    `BUSINESS INTEL\n` +
    `  "How much did we spend on ads?"\n` +
    `  "Where can we cut costs?"\n\n` +
    `DAILY LIFE\n` +
    `  /bible — today's reading + verse\n` +
    `  /weather — forecast + work warnings\n` +
    `  /briefing — full morning briefing\n` +
    `  /pray — prayer prompt\n\n` +
    `CLAUDE CODE\n` +
    `  "Claude: build a customer intake form"\n` +
    `  "Claude update" — check task progress\n` +
    `  /claudestatus — all Claude tasks\n\n` +
    `GOALS & REVIEWS\n` +
    `  /goals — view your goals\n` +
    `  /setgoal <goal> — add a new goal\n` +
    `  /weeklyreview — weekly business review\n\n` +
    `SYSTEM\n` +
    `  /status — health check\n` +
    `  CONFIRM / CANCEL — for pending actions`
  );
});

// --- /bible ---
bot.command('bible', (ctx) => {
  ctx.reply(formatDailyReading());
});

// --- /weather ---
bot.command('weather', async (ctx) => {
  ctx.reply(await formatWeatherBriefing());
});

// --- /briefing ---
bot.command('briefing', async (ctx) => {
  ctx.reply('Compiling your briefing...');
  const briefing = await buildMorningBriefing();
  ctx.reply(briefing);
});

// --- /pray ---
bot.command('pray', (ctx) => {
  const prayers = [
    `🙏 Lord, bless my work today. Give me wisdom with every customer, patience with every challenge, and gratitude for every opportunity. Protect my crew and let our work honor You. Amen.`,
    `🙏 Father, I commit this day to You. Guide my hands, my words, and my decisions. Let every fence I install protect a family. Thank You for the gift of meaningful work. Amen.`,
    `🙏 God, grant me strength for today's work. Help me serve my customers with excellence and integrity. Keep us safe on every job site. I trust Your plan for my business. Amen.`,
    `🙏 Lord, thank You for another day to build and serve. Help me lead with character, work with diligence, and finish with excellence. May my business be a blessing to others. Amen.`,
    `🙏 Heavenly Father, order my steps today. Give me clarity on priorities, energy for the work, and peace in the process. I put my trust in You. Amen.`,
  ];
  const idx = new Date().getDate() % prayers.length;
  ctx.reply(prayers[idx]);
});

// --- /status ---
bot.command('status', async (ctx) => {
  const calResult = await getTodaysJobs();
  const jobCount = calResult.success ? calResult.count : 'N/A';

  ctx.reply(
    `⚙️ System Status: All systems go\n\n` +
    `Today's jobs: ${jobCount}\n` +
    `Skills loaded: 11\n` +
    `  1. email-parser\n` +
    `  2. twilio-sms-sender\n` +
    `  3. google-calendar-sync\n` +
    `  4. quickbooks-job-lookup\n` +
    `  5. quickbooks-invoice-sender\n` +
    `  6. review-request-trigger\n` +
    `  7. inbound-command-handler\n` +
    `  8. telegram-bot-assistant\n` +
    `  9. daily-bible-reading\n` +
    `  10. weather-forecast\n` +
    `  11. morning-briefing\n\n` +
    `6AM briefing: Active\n` +
    `Review processor: Active (hourly)\n` +
    `Owner chat: ${ownerChatId ? 'Connected' : 'Send /start to connect'}`
  );
});

// --- Goals tracking (in-memory, persists while bot runs) ---
const goals = [];

bot.command('setgoal', (ctx) => {
  const goal = ctx.message.text.replace('/setgoal', '').trim();
  if (!goal) {
    ctx.reply('Usage: /setgoal <your goal>\nExample: /setgoal Close 15 jobs this month');
    return;
  }
  goals.push({ text: goal, created: new Date().toISOString(), done: false });
  ctx.reply(`✅ Goal added: "${goal}"\n\nYou now have ${goals.length} active goal(s). Use /goals to view them.`);
});

bot.command('goals', (ctx) => {
  if (goals.length === 0) {
    ctx.reply('No goals set yet. Use /setgoal <goal> to add one.');
    return;
  }
  const list = goals.map((g, i) =>
    `${g.done ? '✅' : '⬜'} ${i + 1}. ${g.text}`
  ).join('\n');
  ctx.reply(`🎯 Your Goals\n\n${list}\n\nMark done: /goaldone <number>`);
});

bot.command('goaldone', (ctx) => {
  const num = parseInt(ctx.message.text.replace('/goaldone', '').trim());
  if (!num || num < 1 || num > goals.length) {
    ctx.reply('Usage: /goaldone <number>');
    return;
  }
  goals[num - 1].done = true;
  ctx.reply(`🎉 Goal completed: "${goals[num - 1].text}"\n\nKeep crushing it, boss!`);
});

// --- /weeklyreview ---
bot.command('weeklyreview', async (ctx) => {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const activeGoals = goals.filter(g => !g.done).length;
  const completedGoals = goals.filter(g => g.done).length;

  ctx.reply(
    `📊 Weekly Review — Week of ${weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}\n\n` +
    `Goals: ${completedGoals} completed, ${activeGoals} in progress\n\n` +
    `Questions to reflect on:\n` +
    `1. What were your biggest wins this week?\n` +
    `2. What jobs did you complete?\n` +
    `3. How many new leads came in?\n` +
    `4. Any outstanding quotes to follow up on?\n` +
    `5. What can you improve next week?\n\n` +
    `Take 10 minutes to answer these. Your future self will thank you. 💪`
  );
});

// --- /claudestatus ---
bot.command('claudestatus', (ctx) => {
  ctx.reply(getClaudeStatusMessage());
});

function getClaudeStatusMessage() {
  const tasks = loadTasks();
  if (tasks.length === 0) {
    return '🤖 No Claude Code tasks yet.\n\nQueue one with: "Claude: build me a landing page"';
  }

  const pending = tasks.filter(t => t.status === 'pending');
  const inProgress = tasks.filter(t => t.status === 'in_progress');
  const done = tasks.filter(t => t.status === 'done');

  let msg = '🤖 Claude Code Tasks\n\n';

  if (inProgress.length > 0) {
    msg += '🔄 IN PROGRESS\n';
    inProgress.forEach(t => {
      msg += `  • "${t.task}"\n    Queued: ${new Date(t.created).toLocaleString()}\n`;
    });
    msg += '\n';
  }

  if (pending.length > 0) {
    msg += '⏳ PENDING\n';
    pending.forEach(t => {
      msg += `  • "${t.task}"\n    Queued: ${new Date(t.created).toLocaleString()}\n`;
    });
    msg += '\n';
  }

  if (done.length > 0) {
    // Show only the last 5 completed tasks
    const recent = done.slice(-5);
    msg += `✅ COMPLETED (last ${recent.length})\n`;
    recent.forEach(t => {
      msg += `  • "${t.task}"\n`;
      if (t.summary) msg += `    ${t.summary}\n`;
      if (t.completed) msg += `    Done: ${new Date(t.completed).toLocaleString()}\n`;
    });
    msg += '\n';
  }

  msg += `Total: ${done.length} done, ${inProgress.length} in progress, ${pending.length} pending`;
  return msg;
}

// =====================
// NATURAL LANGUAGE HANDLER
// =====================

bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();
  const chatId = ctx.chat.id;

  // Save owner chat ID if not set
  if (!ownerChatId) {
    ownerChatId = chatId;
  }

  // Handle CONFIRM
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

  // Handle CANCEL
  if (text.toUpperCase() === 'CANCEL') {
    if (pendingConfirm.has(chatId)) {
      pendingConfirm.delete(chatId);
      ctx.reply('Cancelled.');
    } else {
      ctx.reply('Nothing to cancel.');
    }
    return;
  }

  // --- Claude Code status check ---
  // "Claude update", "Claude status", "what did Claude do", etc.
  const claudeStatusMatch = text.match(/^claude\s*(?:update|status|progress|report|tasks?|what(?:'s| is| did))/i);
  if (claudeStatusMatch) {
    ctx.reply(getClaudeStatusMessage());
    return;
  }

  // --- Claude Code bridge ---
  // Messages starting with "Claude:" get queued as tasks for Claude Code
  const claudeMatch = text.match(/^claude\s*[:\-]\s*(.+)/i);
  if (claudeMatch) {
    const task = claudeMatch[1].trim();
    const tasks = loadTasks();

    tasks.push({
      id: `task_${Date.now()}`,
      task,
      status: 'pending',
      created: new Date().toISOString(),
      from_chat: chatId,
    });
    saveTasks(tasks);

    ctx.reply(
      `🤖 Task queued for Claude Code:\n\n` +
      `"${task}"\n\n` +
      `I'll update you when it's started and when it's done.`
    );
    return;
  }

  // Parse the command
  const parsed = parseCommand(text);

  if (parsed.intent === 'unknown') {
    ctx.reply(
      `I didn't catch that. Try:\n\n` +
      `Business: "Job xxxx done", "What's my schedule?"\n` +
      `Life: /bible, /weather, /briefing, /pray\n` +
      `Claude: "Claude: build me a landing page"\n` +
      `Updates: "Claude update"\n\n` +
      `/help for all commands.`
    );
    return;
  }

  // Confirmation flow
  if (parsed.requiresConfirm) {
    pendingConfirm.set(chatId, parsed);
    ctx.reply(
      `⚠️ This requires confirmation:\n\n` +
      `Action: ${parsed.intent.replace(/_/g, ' ')}\n` +
      `Details: ${JSON.stringify(parsed.params)}\n\n` +
      `Reply CONFIRM to proceed or CANCEL to abort.`
    );
    return;
  }

  // Execute immediately
  try {
    const response = await executeCommand(parsed);

    // Job complete → also schedule review
    if (parsed.intent === 'job_complete' && response && !response.startsWith('Error')) {
      const { lookupJob } = require('../Skills/quickbooks-job-lookup');
      const lookup = await lookupJob(parsed.params.jobNumber);
      if (lookup.success && lookup.job) {
        const reviewResult = scheduleReviewRequest({
          customer_name: lookup.job.customer_name,
          phone: lookup.job.email,
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

// =====================
// SCHEDULED TASKS
// =====================

// 6:00 AM — Morning Briefing
cron.schedule('0 6 * * *', async () => {
  console.log('[bot] Sending 6AM morning briefing...');
  const briefing = await buildMorningBriefing();
  await notifyOwner(briefing);
}, { timezone: 'America/New_York' });

// Every hour — Process scheduled review requests
cron.schedule('0 * * * *', async () => {
  const result = await processScheduledReviews();
  if (result.processed > 0) {
    console.log(`[bot] Processed ${result.processed} review request(s)`);
    await notifyOwner(`📬 Sent ${result.processed} review request(s) to customers.`);
  }
});

// Friday 5PM — Weekly review reminder
cron.schedule('0 17 * * 5', async () => {
  await notifyOwner(
    `📊 Happy Friday, boss!\n\n` +
    `Time for your weekly review. Take 10 minutes to reflect on the week.\n\n` +
    `Type /weeklyreview to get started.`
  );
}, { timezone: 'America/New_York' });

// Sunday 8PM — Week ahead prep
cron.schedule('0 20 * * 0', async () => {
  await notifyOwner(
    `📅 Week Ahead Prep\n\n` +
    `Plan your week tomorrow morning. Things to check:\n` +
    `• Confirm all scheduled jobs\n` +
    `• Order any materials needed\n` +
    `• Follow up on outstanding quotes\n` +
    `• Set your top 3 goals for the week\n\n` +
    `Use /setgoal to add your goals. Have a restful Sunday! 🙏`
  );
}, { timezone: 'America/New_York' });

// =====================
// CLAUDE TASK WATCHER
// =====================
// Watch claude-tasks.json for status changes and auto-notify the owner.
// Tracks both "in_progress" (started) and "done" (completed) transitions.

let lastKnownStatuses = new Map(
  loadTasks().map(t => [t.id, t.status])
);

fs.watchFile(TASK_FILE, { interval: 5000 }, () => {
  try {
    const tasks = loadTasks();
    let needsSave = false;

    for (const task of tasks) {
      const prev = lastKnownStatuses.get(task.id);

      // Task started — notify "in progress"
      if (task.status === 'in_progress' && prev !== 'in_progress') {
        console.log(`[bot] Claude task started: ${task.id}`);
        notifyOwner(
          `🤖 CLAUDE CODE — Task Started\n\n` +
          `📝 "${task.task}"\n\n` +
          `⏱️ Queued: ${new Date(task.created).toLocaleString()}\n` +
          `🔄 Claude is working on this now.`
        );
      }

      // Task completed — notify "done"
      if (task.status === 'done' && prev !== 'done') {
        console.log(`[bot] Claude task completed: ${task.id}`);
        notifyOwner(formatTaskNotification(task, 'Task Complete'));
        task.notified = true;
        needsSave = true;
      }
    }

    // Persist notified flags
    if (needsSave) saveTasks(tasks);

    // Update snapshot
    lastKnownStatuses = new Map(tasks.map(t => [t.id, t.status]));
  } catch (err) {
    console.error('[bot] Task watcher error:', err.message);
  }
});

// =====================
// ERROR & LAUNCH
// =====================

bot.catch((err) => {
  console.error('[bot] Error:', err.message);
});

console.log('[bot] Starting Telegram CEO Assistant (Enhanced)...');
bot.launch().then(() => {
  console.log('[bot] Bot is live. Cron jobs active.');
  console.log('[bot] 6AM briefing | Hourly review processor | Friday/Sunday reminders');

  // Send startup notification + catch up on tasks completed while bot was offline
  setTimeout(async () => {
    notifyOwner(
      `🟢 Bot is online and ready.\n\n` +
      `Active schedules:\n` +
      `• 6:00 AM — Morning briefing\n` +
      `• Hourly — Review request processor\n` +
      `• Friday 5PM — Weekly review reminder\n` +
      `• Sunday 8PM — Week ahead prep\n\n` +
      `Type /help to see all commands.`
    );

    // Sweep for tasks completed while bot was offline
    const tasks = loadTasks();
    let changed = false;
    for (const task of tasks) {
      if (task.status === 'done' && !task.notified) {
        await notifyOwner(formatTaskNotification(task, 'Task Complete (while offline)'));
        task.notified = true;
        changed = true;
      }
    }
    if (changed) saveTasks(tasks);
  }, 2000);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

module.exports = { bot, notifyOwner };
