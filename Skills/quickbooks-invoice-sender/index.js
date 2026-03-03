/**
 * quickbooks-invoice-sender — Skill #5
 * Mark a job complete in QuickBooks and send the invoice to the customer.
 *
 * Inputs:  Job number or invoice ID
 * Outputs: Confirmation that invoice was sent
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
    CLIENT_ID, CLIENT_SECRET, ACCESS_TOKEN || '', false,
    REALM_ID, USE_SANDBOX, true, null, '2.0', REFRESH_TOKEN || ''
  );
}

/**
 * Send an invoice to the customer via QuickBooks email.
 * @param {string} invoiceId - The QuickBooks invoice ID
 * @param {string} email - Override email address (optional)
 * @returns {Promise<{success, message?, error?}>}
 */
async function sendInvoice(invoiceId, email = null) {
  if (!invoiceId) {
    return { success: false, error: 'Invoice ID is required' };
  }

  const qbo = getQBClient();
  if (!qbo) {
    return { success: false, error: 'Missing QuickBooks credentials in .env' };
  }

  return new Promise((resolve) => {
    const sendTo = email || undefined;

    qbo.sendInvoicePdf(invoiceId, sendTo, (err, result) => {
      if (err) {
        resolve({
          success: false,
          error: err.Fault?.Error?.[0]?.Detail || err.message || 'Failed to send invoice',
        });
        return;
      }

      resolve({
        success: true,
        message: `Invoice ${invoiceId} sent successfully`,
        invoice_id: invoiceId,
        email_status: result?.EmailStatus || 'sent',
      });
    });
  });
}

/**
 * Look up a job by number, then send the invoice.
 * Combines quickbooks-job-lookup + send in one step.
 * @param {string|number} jobNumber - The job/invoice DocNumber
 * @returns {Promise<{success, message?, job?, error?}>}
 */
async function sendInvoiceByJobNumber(jobNumber) {
  const { lookupJob } = require('../quickbooks-job-lookup');

  const lookup = await lookupJob(jobNumber);
  if (!lookup.success) {
    return { success: false, error: lookup.error };
  }

  const job = lookup.job;

  if (job.status === 'paid') {
    return {
      success: true,
      message: `Job #${jobNumber} is already paid ($${job.amount.toFixed(2)})`,
      job,
    };
  }

  if (job.status === 'sent') {
    return {
      success: true,
      message: `Invoice for Job #${jobNumber} was already sent. Balance: $${job.balance.toFixed(2)}`,
      job,
    };
  }

  const sendResult = await sendInvoice(job.invoice_id, job.email);
  if (!sendResult.success) {
    return { success: false, error: sendResult.error, job };
  }

  return {
    success: true,
    message: `Invoice for Job #${jobNumber} sent to ${job.customer_name} (${job.email}). Amount: $${job.amount.toFixed(2)}`,
    job,
  };
}

module.exports = { sendInvoice, sendInvoiceByJobNumber };

// --- CLI mode ---
if (require.main === module) {
  const jobNum = process.argv[2];
  if (!jobNum) {
    console.log('Usage: node index.js <job_number>');
    process.exit(1);
  }

  sendInvoiceByJobNumber(jobNum).then((result) => {
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  });
}
