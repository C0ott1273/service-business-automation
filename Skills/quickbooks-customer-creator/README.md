# quickbooks-customer-creator

Create and find customers/contacts in QuickBooks.

## Inputs
- `{ name, phone?, email?, address?: { line1, city, state, zip } }`

## Outputs
- `{ success, customerId, customerName, created?, error? }`

## Exports
- `createCustomer({ name, phone, email, address })` — Create new QB customer
- `findOrCreateCustomer({ name, phone, email, address })` — Search first, create if not found
- `searchCustomer(name)` — Search for customers by name

## Usage
```js
const { findOrCreateCustomer } = require('./quickbooks-customer-creator');

const result = await findOrCreateCustomer({
  name: 'John Smith',
  phone: '555-123-4567',
  email: 'john@example.com',
  address: { line1: '123 Oak St', city: 'Orlando', state: 'FL', zip: '32801' }
});
```
