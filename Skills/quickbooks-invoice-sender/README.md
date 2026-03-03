# quickbooks-invoice-sender

Mark a job complete and send the invoice to the customer via QuickBooks.

## Inputs
- **Job number** or **Invoice ID**

## Outputs
```json
{
  "success": true,
  "message": "Invoice for Job #1001 sent to John Smith (john@example.com). Amount: $350.00",
  "job": { "invoice_number": "1001", "customer_name": "John Smith", "amount": 350.00 }
}
```

## Environment Variables
Same as quickbooks-job-lookup — see that README for setup.

## Usage
```js
const { sendInvoiceByJobNumber, sendInvoice } = require('./index');

// By job number (most common — used by Telegram bot)
const result = await sendInvoiceByJobNumber('1001');

// By invoice ID (direct)
const result2 = await sendInvoice('inv_123', 'customer@email.com');
```

### CLI
```bash
node Skills/quickbooks-invoice-sender/index.js 1001
```

## Behavior
- If job is already **paid**: returns success with "already paid" message
- If invoice was already **sent**: returns success with "already sent" message
- Otherwise: sends invoice PDF via QuickBooks email
