# missed-call-detector

Polls Twilio for missed/unanswered calls to the business number.

## Requirements
- Twilio number must have **voice capability** (not just SMS)
- Check at twilio.com/console → Phone Numbers

## Inputs
- Twilio credentials via environment variables

## Outputs
- Array of missed calls: `{ from, timestamp, callSid, status }`

## Exports
- `checkMissedCalls()` — Poll Twilio for missed calls since last check

## Usage
```js
const { checkMissedCalls } = require('./missed-call-detector');

const missed = await checkMissedCalls();
missed.forEach(call => console.log(`Missed call from ${call.from}`));
```
