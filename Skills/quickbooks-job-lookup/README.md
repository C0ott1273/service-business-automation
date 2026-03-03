# quickbooks-job-lookup

Search QuickBooks for a job by number. Returns invoice and service details.

## Inputs
- **Job number** (string or number): The invoice DocNumber in QuickBooks

## Outputs
```json
{
  "success": true,
  "job": {
    "invoice_number": "1001",
    "invoice_id": "123",
    "customer_name": "John Smith",
    "customer_id": "456",
    "service_details": [
      { "description": "Gutter Cleaning", "amount": 250.00 },
      { "description": "Downspout Flush", "amount": 100.00 }
    ],
    "amount": 350.00,
    "balance": 350.00,
    "status": "pending",
    "due_date": "2024-04-01",
    "email": "john@example.com"
  }
}
```

## Environment Variables
```
QUICKBOOKS_CLIENT_ID=your-client-id
QUICKBOOKS_CLIENT_SECRET=your-client-secret
QUICKBOOKS_REALM_ID=your-realm-id
QUICKBOOKS_ACCESS_TOKEN=your-access-token
QUICKBOOKS_REFRESH_TOKEN=your-refresh-token
QUICKBOOKS_SANDBOX=true
```

## Setup
1. Create an app at [developer.intuit.com](https://developer.intuit.com)
2. Get OAuth2 credentials (Client ID, Secret)
3. Complete OAuth2 flow to get access/refresh tokens
4. Set `QUICKBOOKS_SANDBOX=true` for testing, remove for production

## Usage
```js
const { lookupJob, formatJobDetails } = require('./index');

const result = await lookupJob('1001');
if (result.success) {
  console.log(formatJobDetails(result.job));
}
```

### CLI
```bash
node Skills/quickbooks-job-lookup/index.js 1001
```

## Testing
```bash
node Skills/quickbooks-job-lookup/test.js
```
