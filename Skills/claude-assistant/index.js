/**
 * claude-assistant — Skill #9
 * Saves Claude Code tasks and reminds the owner to run them locally
 * using their Claude subscription (no API charges).
 *
 * Tasks are saved to a JSON file so they persist across restarts.
 */

const fs = require('fs');
const path = require('path');

const TASKS_FILE = path.join(__dirname, 'pending-tasks.json');

function loadTasks() {
  try {
    if (fs.existsSync(TASKS_FILE)) {
      return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('[claude-assistant] Error loading tasks:', e.message);
  }
  return [];
}

function saveTasks(tasks) {
  try {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
  } catch (e) {
    console.error('[claude-assistant] Error saving tasks:', e.message);
  }
}

/**
 * Save a Claude Code task for the owner to run locally.
 * @param {string} task - The coding task description
 * @param {string|number} chatId - Telegram chat ID
 * @returns {{success: boolean, message: string}}
 */
function triggerClaudeCode(task, chatId) {
  const taskId = `task_${Date.now()}`;
  const tasks = loadTasks();

  tasks.push({
    id: taskId,
    task,
    chatId: String(chatId),
    created: new Date().toISOString(),
    status: 'pending',
  });

  saveTasks(tasks);

  return {
    success: true,
    message:
      `Task saved!\n\n` +
      `"${task}"\n\n` +
      `Run this on your machine with Claude Code:\n` +
      `cd c:\\CLAUDE\\service-business-automation && claude\n\n` +
      `Then paste the task above. No API charges — uses your subscription.`,
  };
}

/**
 * Get all pending tasks.
 * @returns {Array}
 */
function getPendingTasks() {
  return loadTasks().filter((t) => t.status === 'pending');
}

/**
 * Mark a task as done.
 * @param {string} taskId
 */
function completeTask(taskId) {
  const tasks = loadTasks();
  const task = tasks.find((t) => t.id === taskId);
  if (task) {
    task.status = 'done';
    task.completedAt = new Date().toISOString();
    saveTasks(tasks);
  }
}

/**
 * Clear all completed tasks.
 */
function clearCompleted() {
  const tasks = loadTasks().filter((t) => t.status !== 'done');
  saveTasks(tasks);
}

module.exports = { triggerClaudeCode, getPendingTasks, completeTask, clearCompleted };
