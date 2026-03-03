/**
 * claude-task-done — Notify the boss when Claude Code finishes work.
 *
 * Subcommands:
 *
 *   notify "Summary of what was done"
 *     → Send a direct Telegram notification (no task queue needed)
 *
 *   start <task_id|latest>
 *     → Mark a queued task as in_progress (triggers "started" notification via bot watcher)
 *
 *   done <task_id|latest> "Summary of what was done"
 *     → Mark a queued task as done (triggers "complete" notification via bot watcher)
 *
 * The bot watches claude-tasks.json and auto-notifies on status changes.
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
    const raw = fs.readFileSync(TASK_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    console.error('[claude-tasks] Failed to load tasks:', err.message);
    return [];
  }
}

function saveTasks(tasks) {
  const tmpFile = TASK_FILE + '.tmp';
  fs.writeFileSync(tmpFile, JSON.stringify(tasks, null, 2));
  fs.renameSync(tmpFile, TASK_FILE);
}

/**
 * Format a task completion notification message.
 */
function formatTaskNotification(task, label) {
  const lines = [
    `🤖 CLAUDE CODE — ${label || 'Task Complete'}`,
    '',
    `📝 "${task.task}"`,
  ];

  if (task.summary) {
    lines.push('', `✅ ${task.summary}`);
  }

  if (task.created && task.completed) {
    const elapsed = new Date(task.completed) - new Date(task.created);
    const mins = Math.round(elapsed / 60000);
    const display = mins < 60
      ? `${mins} min`
      : `${Math.floor(mins / 60)}h ${mins % 60}m`;
    lines.push('', `⏱️ Completed in ${display}`);
  }

  if (task.created && !task.completed) {
    lines.push('', `⏱️ Queued: ${new Date(task.created).toLocaleString()}`);
  }
  if (task.completed) {
    lines.push(`✔️ Done: ${new Date(task.completed).toLocaleString()}`);
  }

  return lines.join('\n');
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
  } catch (err) {
    console.error('[claude-tasks] Failed to resolve chat ID:', err.message);
  }
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
 * Mark a queued task as in_progress. The bot watcher sends the notification.
 */
function markStarted(taskId) {
  const tasks = loadTasks();

  let task;
  if (taskId === 'latest') {
    task = [...tasks].reverse().find(t => t.status === 'pending');
  } else {
    task = tasks.find(t => t.id === taskId);
  }

  if (!task) {
    console.error('[claude-task-done] No matching pending task found.');
    process.exit(1);
  }

  task.status = 'in_progress';
  task.started = new Date().toISOString();
  saveTasks(tasks);

  console.log(`[claude-task-done] Marked task ${task.id} as in_progress.`);
}

/**
 * Mark a queued task as done. The bot watcher sends the notification.
 */
function markDone(taskId, summary) {
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
}

// --- CLI ---
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('Usage:');
    console.log('  node claude-task-done.js notify "Summary of what was done"');
    console.log('  node claude-task-done.js start <task_id|latest>');
    console.log('  node claude-task-done.js done <task_id|latest> "Summary"');
    process.exit(1);
  }

  const subcommand = args[0];

  if (subcommand === 'notify') {
    const summary = args.slice(1).join(' ') || 'Task completed.';
    sendNotification(summary);
  } else if (subcommand === 'start') {
    const taskId = args[1] || 'latest';
    markStarted(taskId);
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

module.exports = { markDone, markStarted, sendNotification, formatTaskNotification, loadTasks, saveTasks, TASK_FILE };
