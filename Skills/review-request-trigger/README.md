# review-request-trigger

Send a review request SMS 2-3 days after job completion.

## Inputs
```json
{
  "customer_name": "John Smith",
  "phone": "+15551234567",
  "completion_date": "2024-03-15T10:00:00Z",
  "review_link": "https://g.page/r/your-review-link",
  "delay_days": 2
}
```

## Outputs
```json
{
  "success": true,
  "id": "rev_1710500000_abc123",
  "scheduled_for": "2024-03-17T15:00:00.000Z",
  "message": "Review request scheduled for John Smith on 3/17/2024 at 10:00 AM"
}
```

## Environment Variables
```
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
REVIEW_LINK=https://g.page/r/your-google-review-link
```

## Usage
```js
const { scheduleReviewRequest, processScheduledReviews, sendReviewNow } = require('./index');

// Schedule for later (2 days default)
scheduleReviewRequest({
  customer_name: 'John Smith',
  phone: '+15551234567',
  completion_date: new Date().toISOString(),
});

// Process due reviews (call via cron/N8N)
await processScheduledReviews();

// Send immediately (manual override)
await sendReviewNow('John Smith', '+15551234567');
```

### CLI
```bash
node Skills/review-request-trigger/index.js "John Smith" "+15551234567"
```

## Testing
```bash
node Skills/review-request-trigger/test.js
```
