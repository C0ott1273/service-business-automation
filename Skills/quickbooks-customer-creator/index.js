/**
 * quickbooks-customer-creator — Skill
 * Create and find customers/contacts in QuickBooks.
 *
 * Requires same QuickBooks OAuth2 env vars as quickbooks-job-lookup.
 *
 * Exports: { createCustomer, findOrCreateCustomer, searchCustomer }
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const QuickBooks = require('node-quickbooks');

function getQBClient() {
  return new QuickBooks(
    process.env.QUICKBOOKS_CLIENT_ID,
    process.env.QUICKBOOKS_CLIENT_SECRET,
    process.env.QUICKBOOKS_ACCESS_TOKEN,
    false, // no token secret for OAuth2
    process.env.QUICKBOOKS_REALM_ID,
    process.env.QUICKBOOKS_USE_SANDBOX === 'true',
    true,  // debug
    null,  // minor version
    '2.0', // OAuth version
    process.env.QUICKBOOKS_REFRESH_TOKEN
  );
}

/**
 * Search for a customer by display name.
 * @param {string} name - Customer name to search
 * @returns {Promise<{success: boolean, customers: Array, count: number, error?: string}>}
 */
async function searchCustomer(name) {
  const qbo = getQBClient();

  return new Promise((resolve) => {
    const query = `SELECT * FROM Customer WHERE DisplayName LIKE '%${name.replace(/'/g, "\\'")}%' MAXRESULTS 10`;
    qbo.query(query, (err, data) => {
      if (err) {
        const detail = err.Fault?.Error?.[0]?.Detail || err.message || 'Unknown error';
        resolve({ success: false, customers: [], count: 0, error: detail });
        return;
      }

      const customers = (data.QueryResponse?.Customer || []).map((c) => ({
        id: c.Id,
        name: c.DisplayName,
        phone: c.PrimaryPhone?.FreeFormNumber || '',
        email: c.PrimaryEmailAddr?.Address || '',
        balance: c.Balance || 0,
      }));

      resolve({ success: true, customers, count: customers.length });
    });
  });
}

/**
 * Create a new customer in QuickBooks.
 * @param {object} params
 * @param {string} params.name - Display name (required)
 * @param {string} [params.phone] - Phone number
 * @param {string} [params.email] - Email address
 * @param {object} [params.address] - { line1, city, state, zip }
 * @returns {Promise<{success: boolean, customerId?: string, customerName?: string, error?: string}>}
 */
async function createCustomer({ name, phone, email, address }) {
  if (!name) {
    return { success: false, error: 'Customer name is required' };
  }

  const qbo = getQBClient();

  const customerData = {
    DisplayName: name,
  };

  if (phone) {
    customerData.PrimaryPhone = { FreeFormNumber: phone };
  }

  if (email) {
    customerData.PrimaryEmailAddr = { Address: email };
  }

  if (address) {
    customerData.BillAddr = {};
    if (address.line1) customerData.BillAddr.Line1 = address.line1;
    if (address.city) customerData.BillAddr.City = address.city;
    if (address.state) customerData.BillAddr.CountrySubDivisionCode = address.state;
    if (address.zip) customerData.BillAddr.PostalCode = address.zip;
  }

  return new Promise((resolve) => {
    qbo.createCustomer(customerData, (err, customer) => {
      if (err) {
        const detail = err.Fault?.Error?.[0]?.Detail || err.message || 'Unknown error';
        resolve({ success: false, error: detail });
        return;
      }

      resolve({
        success: true,
        customerId: customer.Id,
        customerName: customer.DisplayName,
      });
    });
  });
}

/**
 * Find an existing customer by name, or create a new one.
 * @param {object} params - Same as createCustomer
 * @returns {Promise<{success: boolean, customerId?: string, customerName?: string, created: boolean, error?: string}>}
 */
async function findOrCreateCustomer({ name, phone, email, address }) {
  // Search first
  const search = await searchCustomer(name);
  if (search.success && search.count > 0) {
    // Return the first exact-ish match
    const match = search.customers.find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    ) || search.customers[0];

    return {
      success: true,
      customerId: match.id,
      customerName: match.name,
      created: false,
    };
  }

  // Create new
  const result = await createCustomer({ name, phone, email, address });
  if (result.success) {
    return { ...result, created: true };
  }

  return { ...result, created: false };
}

module.exports = { createCustomer, findOrCreateCustomer, searchCustomer };

// --- CLI mode ---
if (require.main === module) {
  const name = process.argv[2];
  if (!name) {
    console.log('Usage: node index.js "Customer Name"');
    process.exit(1);
  }
  searchCustomer(name).then((result) => {
    console.log(JSON.stringify(result, null, 2));
  });
}
