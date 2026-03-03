# email-parser

Monitors incoming emails via IMAP and extracts lead information from website form submissions.

## Inputs
- **Raw email content** (via IMAP connection or passed directly to `parseEmail()`)

## Outputs
```json
{
  "name": "John Smith",
  "phone": "5551234567",
  "email": "john@example.com",
  "message": "I need my gutters cleaned. Two-story house.",
  "timestamp": "2024-01-01T15:00:00.000Z"
}
```

## Environment Variables
```
EMAIL_IMAP_HOST=imap.gmail.com
EMAIL_IMAP_USER=your-email@gmail.com
EMAIL_IMAP_PASS=your-app-password
```

For Gmail, use an [App Password](https://myaccount.google.com/apppasswords) — not your regular password.

## Usage

### As a module
```js
const { parseEmail, monitorInbox } = require('./index');

// Parse a single email
const lead = await parseEmail(rawEmailString);

// Monitor inbox continuously
const stop = monitorInbox((lead) => {
  console.log('New lead:', lead);
});

// Stop monitoring
stop();
```

### CLI
```bash
node Skills/email-parser/index.js
```

## Testing
```bash
node Skills/email-parser/test.js
```
No credentials required for tests — uses sample email content.
