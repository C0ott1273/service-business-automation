# inbound-command-handler

Parse natural language commands and route them to the correct skill.

## Supported Intents
| Intent | Example Commands |
|--------|-----------------|
| `job_complete` | "Job 1001 done", "finished job 999" |
| `schedule_today` | "What's my schedule today?", "today's jobs" |
| `schedule_date` | "Schedule for March 15" |
| `send_invoice` | "Send invoice for job 1001" |
| `send_sms` | "Text 5551234567: Your estimate is confirmed" |
| `expense_query` | "How much did we spend on ads?" |
| `cost_analysis` | "Where can we cut costs?" |
| `start_project` | "Start building MyApp" (requires CONFIRM) |
| `status_check` | "Status on job 500", "How's business?" |

## Outputs
```json
{
  "intent": "job_complete",
  "params": { "jobNumber": "1001" },
  "requiresConfirm": false,
  "raw": "Job 1001 done"
}
```

## Usage
```js
const { parseCommand, executeCommand } = require('./index');

// Parse only
const parsed = parseCommand("Job 1001 done");

// Parse + execute
const response = await executeCommand(parsed);
console.log(response); // "Invoice for Job #1001 sent to John Smith..."
```

### CLI
```bash
node Skills/inbound-command-handler/index.js "Job 1001 done"
```

## Testing
```bash
node Skills/inbound-command-handler/test.js
```
