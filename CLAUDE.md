# Service Business Automation — Telegram Bot & Skills
## Protect A Child Pool Fence — CEO Personal Assistant

## Project Location
`c:\CLAUDE\service-business-automation\`

## Tech Stack
- **Runtime:** Node.js 18+
- **Bot Framework:** Telegraf 4.x (Telegram Bot API)
- **Integrations:** Twilio (SMS + voice), QuickBooks (customers, estimates, invoices), Google Calendar, IMAP (email)
- **AI:** Claude Code via GitHub Actions (`claude-code-task.yml`)
- **Scheduling:** node-cron
- **Deployment:** Railway (Procfile-based)

## Project Structure
```
service-business-automation/
├── CLAUDE.md
├── TelegramBot/
│   ├── index.js           ← main bot entry point (npm start)
│   ├── send-update.js
│   └── CLAUDE.md
├── Skills/
│   ├── CLAUDE.md
│   ├── email-parser/
│   ├── twilio-sms-sender/
│   ├── google-calendar-sync/
│   ├── quickbooks-job-lookup/
│   ├── quickbooks-invoice-sender/
│   ├── quickbooks-customer-creator/   ← NEW: create QB contacts
│   ├── quickbooks-estimate-manager/   ← NEW: estimates + convert to invoice
│   ├── review-request-trigger/
│   ├── inbound-command-handler/       ← enhanced natural language
│   ├── morning-briefing/
│   ├── evening-summary/              ← NEW: 5PM daily summary
│   ├── lead-monitor/                 ← NEW: 4-hour email lead check
│   ├── missed-call-detector/         ← NEW: Twilio missed call polling
│   ├── daily-bible-reading/
│   ├── weather-forecast/
│   ├── claude-assistant/             ← Claude Code only (no chat)
│   ├── dashboard/
│   ├── lead-auto-responder.js
│   └── n8n/
├── protect-a-child-pool-fence/       ← business materials + SMS templates
│   ├── README.md
│   └── sms-templates.js
├── Procfile
└── package.json
```

## Bot Features
- **7AM Morning Briefing** — calendar, weather, Bible reading, business tip
- **5PM Evening Summary** — jobs completed, invoices sent, tomorrow preview
- **Lead Monitoring (every 4h)** — checks email, prompts YES/NO to text
- **Missed Call Detection (every 15m)** — polls Twilio, prompts YES/NO to text
- **Natural Language Commands** — dozens of variations for jobs, invoices, estimates, schedule
- **Estimate Flow** — create QB customer → create estimate → schedule install → convert to invoice
- **Claude Code** — "Claude: <task>" dispatches GitHub Actions workflow
- **Review Requests** — auto-schedules SMS reviews 2-3 days after job completion

## Rules
- Every modular component = a named skill in `/Skills` with its own README
- Never hardcode credentials — use environment variables only
- Keep it simple — no over-engineering
- SMS templates live in `protect-a-child-pool-fence/sms-templates.js`
- Claude Code only — no direct Claude API chat mode

## Environment Variables
```
TELEGRAM_BOT_TOKEN
TELEGRAM_OWNER_CHAT_ID
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER          # must have voice capability for missed calls
GOOGLE_CALENDAR_API_KEY
GOOGLE_CALENDAR_ID
QUICKBOOKS_CLIENT_ID
QUICKBOOKS_CLIENT_SECRET
QUICKBOOKS_REALM_ID
QUICKBOOKS_ACCESS_TOKEN
QUICKBOOKS_REFRESH_TOKEN
EMAIL_IMAP_HOST
EMAIL_IMAP_USER
EMAIL_IMAP_PASS
REVIEW_LINK
GITHUB_TOKEN                 # for Claude Code via GitHub Actions
GITHUB_REPO                  # defaults to C0ott1273/service-business-automation
```

## Running Locally
```bash
npm install
npm start          # starts the Telegram bot
```

## Deployment
Deployed on Railway. The `Procfile` defines the start command. Environment variables are set in Railway dashboard.

## Important: Only one bot instance can run at a time
Telegram's polling API only allows one active connection per bot token. If you see a "409: Conflict" error, it means another instance is already running (e.g., Railway + local). Stop one before starting the other.
