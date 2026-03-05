# lead-monitor

Periodically checks email for new leads. Used by the bot's 4-hour cron job.

## Inputs
- IMAP credentials via environment variables

## Outputs
- Array of parsed lead objects: `{ name, phone, email, message, timestamp, messageId }`

## Exports
- `checkForNewLeads()` — Connect to IMAP, fetch unseen emails, parse leads
- `markLeadProcessed(lead)` — Mark a lead as processed (persisted to processed.json)
- `getProcessedCount()` — Number of processed leads tracked

## Usage
```js
const { checkForNewLeads, markLeadProcessed } = require('./lead-monitor');

const leads = await checkForNewLeads();
for (const lead of leads) {
  console.log(`New lead: ${lead.name} (${lead.phone})`);
  markLeadProcessed(lead);
}
```
