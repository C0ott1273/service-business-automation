# evening-summary

Compiles a daily end-of-day summary sent at 5PM via Telegram.

## Inputs
None (reads from in-memory tracking + Google Calendar)

## Outputs
Formatted evening summary string

## Exports
- `buildEveningSummary()` — Compile the full summary
- `trackJobCompleted(jobNumber, customerName)` — Call when a job is marked done
- `trackInvoiceSent(invoiceNumber, customerName, amount)` — Call when an invoice is sent
- `resetDailyTracking()` — Clear daily counters (auto-resets at midnight)

## Summary Includes
- Jobs completed today (count + list)
- Invoices sent today (count + total dollar amount)
- Pending review requests
- Tomorrow's schedule preview

## Usage
```js
const { trackJobCompleted, buildEveningSummary } = require('./evening-summary');

trackJobCompleted('1001', 'John Smith');
const summary = await buildEveningSummary();
```
