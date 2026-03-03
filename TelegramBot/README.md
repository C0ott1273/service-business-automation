# telegram-bot-assistant

Central command interface — your personal CEO assistant via Telegram.

## What It Does
Text the bot natural language commands from your phone and it executes tasks, reports back results, and manages the business.

## Commands

### Natural Language
| Say This | What Happens |
|----------|-------------|
| "What's my schedule today?" | Pulls Google Calendar, replies with today's jobs |
| "Job 1001 done" | Looks up job in QuickBooks, sends invoice, schedules review request |
| "Send invoice for job 1001" | Sends invoice via QuickBooks |
| "How much did we spend on ads?" | Pulls expense data |
| "Where can we cut costs?" | Analyzes expenses |
| "Text 5551234567: message" | Sends SMS via Twilio |
| "Start building MyApp" | Requires CONFIRM before executing |
| "Status on job 500" | Looks up job details |

### Slash Commands
| Command | Description |
|---------|-------------|
| `/start` | Welcome message |
| `/help` | List all commands |
| `/status` | System health check |

## Confirmation Rules
**Requires CONFIRM reply:**
- Starting new projects
- Deleting or modifying data
- Sending mass messages

**Executes immediately:**
- Schedule lookups
- Job completion triggers
- Financial queries
- Status checks

## Setup
1. Create a bot via [BotFather](https://t.me/BotFather) on Telegram
2. Copy the bot token
3. Add `TELEGRAM_BOT_TOKEN=your-token` to `Skills/.env`
4. Run `node TelegramBot/index.js`

## Environment Variables
```
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
```
Plus all other credentials in Skills/.env for the skills it connects to.

## Usage
```bash
node TelegramBot/index.js
```

## Architecture
```
Telegram Message
  → TelegramBot/index.js
    → inbound-command-handler (parse intent)
      → route to correct skill
        → google-calendar-sync
        → quickbooks-job-lookup
        → quickbooks-invoice-sender
        → twilio-sms-sender
        → review-request-trigger
    → reply via Telegram
```
