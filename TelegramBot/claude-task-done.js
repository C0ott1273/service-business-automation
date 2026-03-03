/**
 * claude-task-done — Notify the boss when Claude Code finishes work.
 *
 * Two modes:
 *
 *   1. Direct notification (no task queue needed):
 *      node TelegramBot/claude-task-done.js notify "Added login page and fixed CSS bugs"
 *
 *   2. Mark a queued task as done + notify:
 *      node TelegramBot/claude-task-done.js done <task_id|latest> "Summary"
 *
 * The bot also watches claude-tasks.json and auto-notifies when tasks complete.
 */

module.paths.unshift(require('path').resolve(__dirname, '../Skills/node_modules'));
require('dotenv').config({ path: require('path').resolve(__dirname, '../Skills/.env') });

const fs = require('fs');
const path = require('path');
const { Telegraf } = require('telegraf');

const TASK_FILE = path.resolve(__dirname, 'claude-tasks.json');
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OWNER_CHAT_ID = process.env.TELEGRAM_OWNER_CHAT_ID || null;

function loadTasks() {
  try {
    return JSON.parse(fs.readFileSync(TASK_FILE, 'utf8'));
  } catch (_) {
    return [];
  }
}

function saveTasks(tasks) {
  fs.writeFileSync(TASK_FILE, JSON.stringify(tasks, null, 2));
}

/**
 * Resolve the owner's chat ID from env, task data, or Telegram getUpdates.
 */
async function resolveOwnerChatId(bot, task) {
  if (OWNER_CHAT_ID) return OWNER_CHAT_ID;
  if (task && task.from_chat) return task.from_chat;
  try {
    const updates = await bot.telegram.getUpdates(0, 100, 0);
    for (let i = updates.length - 1; i >= 0; i--) {
      const id = updates[i].message?.chat?.id;
      if (id) return id;
    }
  } catch (_) {}
  return null;
}

/**
 * Send a direct Telegram notification — no task queue required.
 */
async function sendNotification(summary) {
  if (!BOT_TOKEN) {
    console.error('[claude-notify] No TELEGRAM_BOT_TOKEN — skipping.');
    return;
  }

  const bot = new Telegraf(BOT_TOKEN);
  const chatId = await resolveOwnerChatId(bot);

  if (!chatId) {
    console.error('[claude-notify] No chat ID found — send /start to the bot first.');
    process.exit(1);
  }

  const message = [
    '🤖 CLAUDE CODE — Task Complete',
    '',
    `✅ ${summary}`,
    '',
    `✔️ ${new Date().toLocaleString()}`,
  ].join('\n');

  try {
    await bot.telegram.sendMessage(chatId, message);
    console.log('[claude-notify] Notification sent.');
  } catch (err) {
    console.error('[claude-notify] Failed:', err.message);
  }

  process.exit(0);
}

/**
 * Mark a queued task as done and send a Telegram notification.
 */
async function markDone(taskId, summary) {
  const tasks = loadTasks();

  let task;
  if (taskId === 'latest') {
    task = [...tasks].reverse().find(t => t.status === 'pending' || t.status === 'in_progress');
  } else {
    task = tasks.find(t => t.id === taskId);
  }

  if (!task) {
    console.error('[claude-task-done] No matching task found.');
    process.exit(1);
  }

  task.status = 'done';
  task.completed = new Date().toISOString();
  task.summary = summary || 'Task completed.';
  saveTasks(tasks);

  console.log(`[claude-task-done] Marked task ${task.id} as done.`);

  if (!BOT_TOKEN) {
    console.error('[claude-task-done] No TELEGRAM_BOT_TOKEN — skipping notification.');
    return;
  }

  const bot = new Telegraf(BOT_TOKEN);
  const chatId = await resolveOwnerChatId(bot, task);

  if (!chatId) {
    console.error('[claude-task-done] No chat ID found — send /start to the bot first.');
    process.exit(1);
  }

  const message = [
    '🤖 CLAUDE CODE — Task Complete',
    '',
    `📝 Task: "${task.task}"`,
    '',
    `✅ ${task.summary}`,
    '',
    `⏱️ Queued: ${new Date(task.created).toLocaleString()}`,
    `✔️ Done: ${new Date(task.completed).toLocaleString()}`,
  ].join('\n');

  try {
    await bot.telegram.sendMessage(chatId, message);
    console.log('[claude-task-done] Notification sent.');
  } catch (err) {
    console.error('[claude-task-done] Failed:', err.message);
  }

  process.exit(0);
}

// --- CLI ---
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('Usage:');
    console.log('  node claude-task-done.js notify "Summary of what was done"');
    console.log('  node claude-task-done.js done <task_id|latest> "Summary"');
    process.exit(1);
  }

  const subcommand = args[0];

  if (subcommand === 'notify') {
    const summary = args.slice(1).join(' ') || 'Task completed.';
    sendNotification(summary);
  } else if (subcommand === 'done') {
    const taskId = args[1] || 'latest';
    const summary = args.slice(2).join(' ') || 'Task completed.';
    markDone(taskId, summary);
  } else {
    // Backwards-compatible: treat first arg as task ID
    const taskId = args[0];
    const summary = args.slice(1).join(' ') || 'Task completed.';
    markDone(taskId, summary);
  }
}

module.exports = { markDone, sendNotification, loadTasks, saveTasks, TASK_FILE };
