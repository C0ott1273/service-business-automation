# twilio-sms-sender

Sends outbound SMS from the registered business Twilio number.

## Inputs
```json
{
  "to_phone": "+15551234567",
  "message_body": "Thanks for reaching out! We'll call you shortly to schedule an estimate."
}
```

## Outputs
```json
{
  "success": true,
  "sid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "status": "queued",
  "to": "+15551234567"
}
```

## Environment Variables
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
```

## Setup
1. Create a Twilio account at [twilio.com](https://www.twilio.com)
2. Get your Account SID and Auth Token from the dashboard
3. Register a phone number (or use Twilio Messaging Service)
4. Add credentials to `.env`

## Usage

### As a module
```js
const { sendSMS } = require('./index');

const result = await sendSMS('+15551234567', 'Your invoice is ready!');
if (result.success) {
  console.log('Sent:', result.sid);
} else {
  console.error('Failed:', result.error);
}
```

### CLI
```bash
node Skills/twilio-sms-sender/index.js +15551234567 "Thanks for contacting us!"
```

## Phone Number Handling
- Accepts any format: `(555) 123-4567`, `555.123.4567`, `5551234567`
- Auto-normalizes to E.164 format
- Defaults to US (+1) if no country code provided

## Testing
```bash
node Skills/twilio-sms-sender/test.js
```
No credentials required — uses a mock Twilio client.
