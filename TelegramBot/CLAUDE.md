# Service Business Automation System

## Project Overview
This system automates the full workflow of a field-based service business — from lead
capture through job completion and review requests. A Telegram bot serves as the
primary command interface, acting as a personal CEO assistant accessible from anywhere
via phone. Every component must be built as a reusable skill saved to the /Skills folder.

---

## Core Directive
For every modular component built, extract it as a named reusable skill saved to the
/Skills folder with its own README documenting inputs, outputs, and example usage.
Future projects will reference these skills instead of rebuilding them from scratch.

---

## Full System Workflow
Google Ad → Website Form → Email
→ email-parser → Extract name + phone
→ twilio-sms-sender → Auto-text lead to schedule estimate
→ google-calendar-sync → Job booked on calendar
→ Dashboard → Today's jobs visible
→ Telegram Bot → "Job xxxx done"
→ inbound-command-handler → Parse intent
→ quickbooks-job-lookup → Find job + invoice
→ quickbooks-invoice-sender → Send invoice to customer
→ review-request-trigger → SMS review request 2-3 days later

---

## Telegram Bot — Personal CEO Assistant
The Telegram bot is the central command interface for the entire system. I text it
natural language commands from my phone and it executes tasks, reports back results,
and manages the business.

### Example Commands
- "What's my schedule today?" → pulls Google Calendar, replies with today's jobs
- "Job xxxx done" → looks up job in QuickBooks, sends invoice, schedules review request
- "How much did we spend on ads this month?" → pulls QuickBooks data and analyzes
- "Where can we cut costs?" → analyzes expenses and suggests optimizations
- "Start building [app name]" → initiates a new Claude Code project

### Confirmation Rules
The following require a CONFIRM reply before executing:
- Starting a new app or project build
- Deleting or modifying data
- Sending mass messages
- Any task estimated to take more than 5 minutes

The following execute immediately with no confirmation:
- Schedule and calendar lookups
- Job completion triggers
- Financial and expense queries
- Status checks

---

## Skills to Build

### 1. email-parser
Purpose: Monitor incoming emails from website form submissions and extract lead info.
- Inputs: Raw email content
- Outputs: { name, phone, email, message, timestamp }
- Save to: /Skills/email-parser/

### 2. twilio-sms-sender
Purpose: Send outbound SMS from the registered business Twilio number.
- Inputs: { to_phone, message_body }
- Outputs: Delivery status
- Notes: Business number must be registered as Twilio Messaging Service sender
- Save to: /Skills/twilio-sms-sender/

### 3. google-calendar-sync
Purpose: Read and write Google Calendar events. Power the daily job dashboard.
- Inputs: Date range or event details
- Outputs: List of events with title, time, location, notes
- Save to: /Skills/google-calendar-sync/

### 4. quickbooks-job-lookup
Purpose: Search QuickBooks for a job by number. Return invoice and service details.
- Inputs: Job number
- Outputs: { invoice_number, customer_name, service_details, amount, status }
- Save to: /Skills/quickbooks-job-lookup/

### 5. quickbooks-invoice-sender
Purpose: Mark a job complete in QuickBooks and send the invoice to the customer.
- Inputs: Job number or invoice ID
- Outputs: Confirmation that invoice was sent
- Save to: /Skills/quickbooks-invoice-sender/

### 6. review-request-trigger
Purpose: Send a review request SMS 2-3 days after job completion.
- Inputs: { customer_name, phone, completion_date, review_link }
- Outputs: Scheduled SMS confirmation
- Save to: /Skills/review-request-trigger/

### 7. inbound-command-handler
Purpose: Parse natural language commands and route them to the correct skill.
- Trigger examples: "job xxxx done", "what's my schedule", "how much did we spend on ads"
- Flow: Parse intent → route to skill → return confirmation to Telegram
- Save to: /Skills/inbound-command-handler/

### 8. telegram-bot-assistant
Purpose: Central command interface. Connects to all skills and acts as CEO assistant.
- Inputs: Natural language Telegram messages
- Outputs: Replies via Telegram with results or CONFIRM prompts
- Requires: Telegram Bot Token from BotFather
- Save to: /Skills/telegram-bot-assistant/

---

## Dashboard
Build a simple web dashboard that:
- Pulls today's jobs from Google Calendar
- Displays job title, time, location, invoice number, and service details
- Allows marking jobs complete (triggers same flow as Telegram command)
- Shows recent leads and their follow-up status

---

## N8N Automation Workflows
1. Lead Capture: Email received → parse → send welcome SMS via Twilio
2. Job Completion: Telegram command → QuickBooks lookup → send invoice → schedule review
3. Daily Digest: Every morning at 7AM pull calendar events for dashboard

---

## Environment Variables
```
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TELEGRAM_BOT_TOKEN=
GOOGLE_CALENDAR_API_KEY=
GOOGLE_CALENDAR_ID=
QUICKBOOKS_CLIENT_ID=
QUICKBOOKS_CLIENT_SECRET=
QUICKBOOKS_REALM_ID=
EMAIL_IMAP_HOST=
EMAIL_IMAP_USER=
EMAIL_IMAP_PASS=
REVIEW_LINK=
```

---

## Development Phases
1. Phase 1 — email-parser + twilio-sms-sender → auto-text new leads
2. Phase 2 — google-calendar-sync + simple job dashboard
3. Phase 3 — quickbooks-job-lookup + quickbooks-invoice-sender + inbound-command-handler
4. Phase 4 — review-request-trigger with 2-3 day delay
5. Phase 5 — telegram-bot-assistant wired to all skills
6. Phase 6 — Polish, unified dashboard, error handling, edge cases

---

## Rules
- Read this CLAUDE.md at the start of every session
- Save every modular component as a named skill in /Skills with a README
- Use N8N to orchestrate automation pipelines
- Keep the dashboard simple — no over-engineering
- Never hardcode credentials — use environment variables only
- Ask for API keys and tokens before proceeding
- Complete each phase fully before moving to the next
