/**
 * claude-task-done — Run this when Claude Code finishes a task.
 *
 * Usage:
 *   node TelegramBot/claude-task-done.js <task_id> "Summary of what was done"
 *   node TelegramBot/claude-task-done.js latest "Summary of what was done"
 *
 * What it does:
 *   1. Marks the task as "done" in claude-tasks.json
 *   2. Sends the owner a Telegram notification with the summary
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

async function markDone(taskId, summary) {
  const tasks = loadTasks();

  // Find the task — "latest" grabs the most recent pending one
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

  // Send Telegram notification
  if (!BOT_TOKEN) {
    console.error('[claude-task-done] No TELEGRAM_BOT_TOKEN — skipping notification.');
    return;
  }

  const bot = new Telegraf(BOT_TOKEN);
  let chatId = OWNER_CHAT_ID;

  // Fall back to the chat that requested the task
  if (!chatId && task.from_chat) {
    chatId = task.from_chat;
  }

  // Fall back to most recent chat from getUpdates
  if (!chatId) {
    try {
      const updates = await bot.telegram.getUpdates(0, 100, 0);
      for (let i = updates.length - 1; i >= 0; i--) {
        const id = updates[i].message?.chat?.id;
        if (id) { chatId = id; break; }
      }
    } catch (_) {}
  }

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
    console.error('[claude-task-done] Failed to send notification:', err.message);
  }

  process.exit(0);
}

// --- CLI ---
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('Usage: node claude-task-done.js <task_id|latest> "Summary of what was done"');
    process.exit(1);
  }
  const taskId = args[0];
  const summary = args.slice(1).join(' ') || 'Task completed.';
  markDone(taskId, summary);
}

module.exports = { markDone, loadTasks };
