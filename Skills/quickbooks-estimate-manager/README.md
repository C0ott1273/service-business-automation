# quickbooks-estimate-manager

Create estimates, convert estimates to invoices, and fetch QuickBooks items.

## Inputs

### createEstimate
- `customerId` (string) — QuickBooks Customer ID
- `lineItems` (array) — `[{ itemId?, description, amount, qty? }]`
- `installDate` (string, optional) — YYYY-MM-DD
- `notes` (string, optional) — Customer memo

### convertEstimateToInvoice
- `estimateId` (string) — QuickBooks Estimate ID

## Outputs
- `{ success, estimateId, estimateNumber, amount, error? }`
- `{ success, invoiceId, invoiceNumber, amount, error? }`

## Exports
- `createEstimate({ customerId, lineItems, installDate, notes })` — Create QB estimate
- `convertEstimateToInvoice(estimateId)` — Fetch estimate + create invoice from it
- `getQBItems()` — Fetch all active items/services from QB
- `getEstimateById(estimateId)` — Fetch a single estimate

## Usage
```js
const { createEstimate, convertEstimateToInvoice } = require('./quickbooks-estimate-manager');

// Create estimate
const est = await createEstimate({
  customerId: '42',
  lineItems: [{ itemId: '1', description: 'Pool Fence Mesh', amount: 30, qty: 80 }],
  installDate: '2026-03-20',
});

// Later, convert to invoice
const inv = await convertEstimateToInvoice(est.estimateId);
```
