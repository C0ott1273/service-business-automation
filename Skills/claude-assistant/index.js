/**
 * claude-assistant — Skill #9
 * Triggers Claude Code via GitHub Actions to execute coding tasks.
 * Also provides a direct Claude AI chat mode for non-coding questions.
 *
 * Requires:
 *   GITHUB_TOKEN — Personal access token with workflow dispatch permission
 *   GITHUB_REPO — Repository in "owner/repo" format
 *   ANTHROPIC_API_KEY — For direct chat mode (optional, enables "Claude chat:" prefix)
 */

const https = require('https');

const GITHUB_REPO = process.env.GITHUB_REPO || 'C0ott1273/service-business-automation';
const WORKFLOW_FILE = 'claude-code-task.yml';
const WORKFLOW_BRANCH = 'service-automation';

/**
 * Trigger a Claude Code task via GitHub Actions workflow_dispatch
 * @param {string} task - The coding task to execute
 * @param {string|number} chatId - Telegram chat ID for notifications
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function triggerClaudeCode(task, chatId) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return {
      success: false,
      message: 'GITHUB_TOKEN is not set. Add a GitHub Personal Access Token in Railway Variables to enable Claude Code.',
    };
  }

  const taskId = `task_${Date.now()}`;

  const payload = JSON.stringify({
    ref: WORKFLOW_BRANCH,
    inputs: {
      task,
      chat_id: String(chatId),
      task_id: taskId,
    },
  });

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'api.github.com',
        path: `/repos/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'service-business-automation-bot',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode === 204) {
            resolve({
              success: true,
              message:
                `🤖 Claude Code task dispatched!\n\n` +
                `Task: "${task}"\n` +
                `ID: ${taskId}\n\n` +
                `I'll message you when it starts and when it's done.`,
            });
          } else {
            console.error(`[claude-assistant] GitHub API ${res.statusCode}:`, body);
            resolve({
              success: false,
              message: `Failed to trigger Claude Code (HTTP ${res.statusCode}). Check GITHUB_TOKEN permissions.`,
            });
          }
        });
      }
    );

    req.on('error', (err) => {
      console.error('[claude-assistant] GitHub API error:', err.message);
      resolve({
        success: false,
        message: `Failed to reach GitHub: ${err.message}`,
      });
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Direct Claude AI chat for non-coding questions (business advice, drafting, etc.)
 * @param {string} message - The user's question
 * @param {string|number} chatId - Telegram chat ID
 * @returns {Promise<{success: boolean, response: string}>}
 */
async function askClaude(message, chatId) {
  const Anthropic = require('@anthropic-ai/sdk');
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      response: 'ANTHROPIC_API_KEY is not set. Add it in Railway Variables.',
    };
  }

  const client = new Anthropic({ apiKey });

  // Simple per-chat history (in-memory)
  if (!askClaude._histories) askClaude._histories = new Map();
  if (!askClaude._histories.has(chatId)) askClaude._histories.set(chatId, []);
  const history = askClaude._histories.get(chatId);

  history.push({ role: 'user', content: message });
  while (history.length > 20) history.shift();

  try {
    const result = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: `You are the AI assistant for a field-service fencing business CEO. Answer concisely. Keep responses under 4000 characters.`,
      messages: history,
    });

    const response = result.content[0].text;
    history.push({ role: 'assistant', content: response });
    return { success: true, response };
  } catch (err) {
    history.pop();
    return { success: false, response: `Claude API error: ${err.message}` };
  }
}

function clearHistory(chatId) {
  if (askClaude._histories) askClaude._histories.delete(chatId);
}

module.exports = { triggerClaudeCode, askClaude, clearHistory };
