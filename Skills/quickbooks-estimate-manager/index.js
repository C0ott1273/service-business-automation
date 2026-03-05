/**
 * quickbooks-estimate-manager — Skill
 * Create estimates, fetch QB items, and convert estimates to invoices.
 *
 * Requires same QuickBooks OAuth2 env vars as quickbooks-job-lookup.
 *
 * Exports: { createEstimate, convertEstimateToInvoice, getQBItems, getEstimateById }
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const QuickBooks = require('node-quickbooks');

function getQBClient() {
  return new QuickBooks(
    process.env.QUICKBOOKS_CLIENT_ID,
    process.env.QUICKBOOKS_CLIENT_SECRET,
    process.env.QUICKBOOKS_ACCESS_TOKEN,
    false,
    process.env.QUICKBOOKS_REALM_ID,
    process.env.QUICKBOOKS_USE_SANDBOX === 'true',
    true,
    null,
    '2.0',
    process.env.QUICKBOOKS_REFRESH_TOKEN
  );
}

/**
 * Fetch all active items/services from QuickBooks.
 * Used to match user input to QB Item IDs.
 * @returns {Promise<{success: boolean, items: Array, error?: string}>}
 */
async function getQBItems() {
  const qbo = getQBClient();

  return new Promise((resolve) => {
    const query = "SELECT * FROM Item WHERE Active = true AND Type IN ('Service', 'NonInventory', 'Inventory') MAXRESULTS 100";
    qbo.query(query, (err, data) => {
      if (err) {
        const detail = err.Fault?.Error?.[0]?.Detail || err.message || 'Unknown error';
        resolve({ success: false, items: [], error: detail });
        return;
      }

      const items = (data.QueryResponse?.Item || []).map((item) => ({
        id: item.Id,
        name: item.Name,
        description: item.Description || item.Name,
        unitPrice: item.UnitPrice || 0,
        type: item.Type,
      }));

      resolve({ success: true, items });
    });
  });
}

/**
 * Create a new estimate in QuickBooks.
 * @param {object} params
 * @param {string} params.customerId - QuickBooks Customer ID
 * @param {Array<{itemId?: string, description: string, amount: number, qty?: number}>} params.lineItems
 * @param {string} [params.installDate] - Expected install date (YYYY-MM-DD)
 * @param {string} [params.notes] - Customer memo / notes
 * @returns {Promise<{success: boolean, estimateId?: string, estimateNumber?: string, amount?: number, error?: string}>}
 */
async function createEstimate({ customerId, lineItems, installDate, notes }) {
  if (!customerId || !lineItems || lineItems.length === 0) {
    return { success: false, error: 'Customer ID and at least one line item are required' };
  }

  const qbo = getQBClient();

  const lines = lineItems.map((item) => {
    const line = {
      DetailType: 'SalesItemLineDetail',
      Amount: item.amount * (item.qty || 1),
      Description: item.description,
      SalesItemLineDetail: {
        Qty: item.qty || 1,
        UnitPrice: item.amount,
      },
    };

    // Reference existing QB item if ID provided
    if (item.itemId) {
      line.SalesItemLineDetail.ItemRef = { value: item.itemId, name: item.description };
    }

    return line;
  });

  const estimateData = {
    CustomerRef: { value: customerId },
    Line: lines,
    TxnDate: new Date().toISOString().split('T')[0],
  };

  if (installDate) {
    estimateData.ExpirationDate = installDate;
  }

  if (notes) {
    estimateData.CustomerMemo = { value: notes };
  }

  return new Promise((resolve) => {
    qbo.createEstimate(estimateData, (err, estimate) => {
      if (err) {
        const detail = err.Fault?.Error?.[0]?.Detail || err.message || 'Unknown error';
        resolve({ success: false, error: detail });
        return;
      }

      const totalAmount = estimate.TotalAmt || lines.reduce((sum, l) => sum + l.Amount, 0);
      resolve({
        success: true,
        estimateId: estimate.Id,
        estimateNumber: estimate.DocNumber,
        amount: totalAmount,
      });
    });
  });
}

/**
 * Get an estimate by its QuickBooks ID.
 * @param {string} estimateId - QuickBooks Estimate ID
 * @returns {Promise<{success: boolean, estimate?: object, error?: string}>}
 */
async function getEstimateById(estimateId) {
  const qbo = getQBClient();

  return new Promise((resolve) => {
    qbo.getEstimate(estimateId, (err, estimate) => {
      if (err) {
        const detail = err.Fault?.Error?.[0]?.Detail || err.message || 'Unknown error';
        resolve({ success: false, error: detail });
        return;
      }

      resolve({ success: true, estimate });
    });
  });
}

/**
 * Convert an estimate to an invoice.
 * Fetches the estimate, creates an invoice from its line items and customer.
 * @param {string} estimateId - QuickBooks Estimate ID
 * @returns {Promise<{success: boolean, invoiceId?: string, invoiceNumber?: string, amount?: number, error?: string}>}
 */
async function convertEstimateToInvoice(estimateId) {
  const qbo = getQBClient();

  // Fetch the estimate
  const estResult = await getEstimateById(estimateId);
  if (!estResult.success) {
    return { success: false, error: `Could not find estimate: ${estResult.error}` };
  }

  const estimate = estResult.estimate;

  // Create invoice from estimate data
  const invoiceData = {
    CustomerRef: estimate.CustomerRef,
    Line: estimate.Line.filter((l) => l.DetailType === 'SalesItemLineDetail'),
    TxnDate: new Date().toISOString().split('T')[0],
  };

  if (estimate.CustomerMemo) {
    invoiceData.CustomerMemo = estimate.CustomerMemo;
  }

  return new Promise((resolve) => {
    qbo.createInvoice(invoiceData, (err, invoice) => {
      if (err) {
        const detail = err.Fault?.Error?.[0]?.Detail || err.message || 'Unknown error';
        resolve({ success: false, error: detail });
        return;
      }

      resolve({
        success: true,
        invoiceId: invoice.Id,
        invoiceNumber: invoice.DocNumber,
        amount: invoice.TotalAmt,
      });
    });
  });
}

module.exports = { createEstimate, convertEstimateToInvoice, getQBItems, getEstimateById };

// --- CLI mode ---
if (require.main === module) {
  getQBItems().then((result) => {
    if (result.success) {
      console.log(`Found ${result.items.length} item(s):`);
      result.items.forEach((item) => {
        console.log(`  [${item.id}] ${item.name} — $${item.unitPrice} (${item.type})`);
      });
    } else {
      console.error('Error:', result.error);
    }
  });
}
