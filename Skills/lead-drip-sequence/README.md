# Lead Drip Sequence

Automated SMS follow-up for leads who don't respond immediately.

## Schedule
| Step | Delay | Message |
|------|-------|---------|
| 0 | Immediate | Thanks for reaching out, when works for an estimate? |
| 1 | +24 hours | Following up, would this week work? |
| 2 | +3 days | Quick reminder, we have openings |
| 3 | +7 days | Last check-in, we're here when you're ready |

## Usage
```js
const { addToDrip, processDripQueue, cancelDrip } = require('./lead-drip-sequence');

// Add a new lead
await addToDrip({ name: 'John Smith', phone: '+15551234567', source: 'google_ad' });

// Process due messages (call hourly via cron)
await processDripQueue();

// Cancel when lead responds
cancelDrip('+15551234567');
```

## Storage
JSON file at `drip-queue.json`. Upgrade to database for production scale.
