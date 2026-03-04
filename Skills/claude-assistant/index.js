/**
 * claude-assistant — Skill #9
 * Sends tasks to the Claude API and streams back responses.
 *
 * Inputs:  { task: string, conversationHistory?: array }
 * Outputs: { success: boolean, response: string }
 *
 * Requires: ANTHROPIC_API_KEY environment variable
 */

const Anthropic = require('@anthropic-ai/sdk');

const SYSTEM_PROMPT = `You are the AI assistant for a field-service fencing business. The CEO texts you tasks via Telegram.

Your role:
- Answer business questions clearly and concisely
- Help with planning, strategy, marketing ideas, and operations
- Draft messages, emails, and social media posts when asked
- Provide actionable advice, not generic fluff
- Keep responses under 4000 characters (Telegram message limit)

Business context:
- Field service business (fencing/contractor)
- Uses QuickBooks for invoicing, Google Calendar for scheduling, Twilio for SMS
- The CEO manages everything from his phone via Telegram`;

// Per-chat conversation history (in-memory, resets on restart)
const chatHistories = new Map();
const MAX_HISTORY = 20; // Keep last 20 messages per chat

/**
 * Send a task to Claude and get a response
 * @param {string} task - The user's message/task
 * @param {string|number} chatId - Telegram chat ID for conversation history
 * @returns {Promise<{success: boolean, response: string}>}
 */
async function askClaude(task, chatId) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      response: 'ANTHROPIC_API_KEY is not set. Add it in Railway Variables to enable Claude commands.',
    };
  }

  const client = new Anthropic({ apiKey });

  // Get or create conversation history for this chat
  if (!chatHistories.has(chatId)) {
    chatHistories.set(chatId, []);
  }
  const history = chatHistories.get(chatId);

  // Add user message to history
  history.push({ role: 'user', content: task });

  // Trim history if too long
  while (history.length > MAX_HISTORY) {
    history.shift();
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: history,
    });

    const response = message.content[0].text;

    // Add assistant response to history
    history.push({ role: 'assistant', content: response });

    return { success: true, response };
  } catch (err) {
    // Don't save failed messages in history
    history.pop();
    console.error('[claude-assistant] API error:', err.message);
    return {
      success: false,
      response: `Claude API error: ${err.message}`,
    };
  }
}

/**
 * Clear conversation history for a chat
 * @param {string|number} chatId
 */
function clearHistory(chatId) {
  chatHistories.delete(chatId);
}

module.exports = { askClaude, clearHistory };
