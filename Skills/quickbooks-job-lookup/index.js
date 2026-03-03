/**
 * quickbooks-job-lookup — Skill #4
 * Search QuickBooks for a job by number. Return invoice and service details.
 *
 * Inputs:  Job number (string or number)
 * Outputs: { invoice_number, customer_name, service_details, amount, status }
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const QuickBooks = require('node-quickbooks');

const CLIENT_ID = process.env.QUICKBOOKS_CLIENT_ID;
const CLIENT_SECRET = process.env.QUICKBOOKS_CLIENT_SECRET;
const REALM_ID = process.env.QUICKBOOKS_REALM_ID;
const ACCESS_TOKEN = process.env.QUICKBOOKS_ACCESS_TOKEN;
const REFRESH_TOKEN = process.env.QUICKBOOKS_REFRESH_TOKEN;
const USE_SANDBOX = process.env.QUICKBOOKS_SANDBOX === 'true';

function getQBClient() {
  if (!CLIENT_ID || !CLIENT_SECRET || !REALM_ID) {
    return null;
  }

  return new QuickBooks(
    CLIENT_ID,
    CLIENT_SECRET,
    ACCESS_TOKEN || '',
    false, // no token secret (OAuth2)
    REALM_ID,
    USE_SANDBOX, // sandbox vs production
    true, // debug
    null, // minor version
    '2.0', // OAuth version
    REFRESH_TOKEN || ''
  );
}

/**
 * Look up a job/invoice by number in QuickBooks.
 * @param {string|number} jobNumber - The job or invoice doc number
 * @returns {Promise<{success, job?, error?}>}
 */
async function lookupJob(jobNumber) {
  if (!jobNumber) {
    return { success: false, error: 'Job number is required' };
  }

  const qbo = getQBClient();
  if (!qbo) {
    return { success: false, error: 'Missing QuickBooks credentials in .env' };
  }

  return new Promise((resolve) => {
    // Search invoices by DocNumber
    qbo.findInvoices({
      DocNumber: String(jobNumber),
      fetchAll: true,
    }, (err, invoices) => {
      if (err) {
        resolve({ success: false, error: err.Fault?.Error?.[0]?.Detail || err.message || 'QuickBooks API error' });
        return;
      }

      const items = invoices?.QueryResponse?.Invoice || [];
      if (items.length === 0) {
        resolve({ success: false, error: `No job found with number ${jobNumber}` });
        return;
      }

      const invoice = items[0];
      const lineItems = (invoice.Line || [])
        .filter((l) => l.DetailType === 'SalesItemLineDetail')
        .map((l) => ({
          description: l.Description || l.SalesItemLineDetail?.ItemRef?.name || '',
          amount: l.Amount || 0,
        }));

      resolve({
        success: true,
        job: {
          invoice_number: invoice.DocNumber,
          invoice_id: invoice.Id,
          customer_name: invoice.CustomerRef?.name || 'Unknown',
          customer_id: invoice.CustomerRef?.value || '',
          service_details: lineItems,
          amount: invoice.TotalAmt || 0,
          balance: invoice.Balance || 0,
          status: invoice.Balance === 0 ? 'paid' : (invoice.EmailStatus === 'EmailSent' ? 'sent' : 'pending'),
          due_date: invoice.DueDate || '',
          email: invoice.BillEmail?.Address || '',
        },
      });
    });
  });
}

/**
 * Format job details into readable text (for Telegram bot / dashboard).
 */
function formatJobDetails(job) {
  if (!job) return 'No job data.';

  const services = job.service_details.map((s) => `  - ${s.description}: $${s.amount.toFixed(2)}`).join('\n');

  return [
    `Job #${job.invoice_number}`,
    `Customer: ${job.customer_name}`,
    `Amount: $${job.amount.toFixed(2)}`,
    `Status: ${job.status}`,
    `Balance: $${job.balance.toFixed(2)}`,
    job.due_date ? `Due: ${job.due_date}` : '',
    services ? `\nServices:\n${services}` : '',
  ].filter(Boolean).join('\n');
}

module.exports = { lookupJob, formatJobDetails };

// --- CLI mode ---
if (require.main === module) {
  const jobNum = process.argv[2];
  if (!jobNum) {
    console.log('Usage: node index.js <job_number>');
    process.exit(1);
  }

  lookupJob(jobNum).then((result) => {
    if (result.success) {
      console.log(formatJobDetails(result.job));
    } else {
      console.error('Error:', result.error);
    }
  });
}
