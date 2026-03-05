/**
 * inbound-command-handler — Skill #7 (Enhanced)
 * Parse natural language commands and route them to the correct skill.
 *
 * Supports dozens of natural phrasing variations so the owner can
 * speak casually and still get the right action.
 *
 * Inputs:  Natural language text command
 * Outputs: { intent, params, response }
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

// Intent definitions with patterns and handlers
// Order matters — more specific patterns must come before general ones
const INTENTS = [
  // --- Job completion ---
  {
    name: 'job_complete',
    patterns: [
      /job\s*#?\s*(\d+)\s*(?:is\s*)?(?:done|complete|finished|completed|wrapped|all\s*done)/i,
      /(?:done|complete|finished|completed|wrapped\s*up)\s*(?:with\s*)?(?:job\s*)?#?\s*(\d+)/i,
      /mark\s*(?:job\s*)?#?\s*(\d+)\s*(?:as\s*)?(?:done|complete)/i,
      /(?:just\s*)?(?:knocked\s*out|took\s*care\s*of|completed)\s*(?:job\s*)?#?\s*(\d+)/i,
      /(?:job\s*)?#?\s*(\d+)\s*(?:is\s*)?(?:good\s*to\s*go|all\s*set|wrapped)/i,
    ],
    extract: (match) => ({ jobNumber: match[1] || match[2] }),
    requiresConfirm: false,
  },

  // --- Send invoice by number ---
  {
    name: 'send_invoice',
    patterns: [
      /send\s*(?:the\s*)?invoice\s*(?:for\s*)?(?:job\s*|estimate\s*)?#?\s*(\d+)/i,
      /invoice\s*(?:job\s*|estimate\s*)?#?\s*(\d+)/i,
      /bill\s*(?:for\s*)?(?:job\s*)?#?\s*(\d+)/i,
      /send\s*(?:the\s*)?bill\s*(?:for\s*)?(?:job\s*)?#?\s*(\d+)/i,
    ],
    extract: (match) => ({ jobNumber: match[1] }),
    requiresConfirm: false,
  },

  // --- Send invoice by customer name ---
  {
    name: 'send_invoice_by_name',
    patterns: [
      /send\s*(?:the\s*)?invoice\s*(?:for|to)\s+(.+)/i,
      /send\s*(?:the\s*)?bill\s*(?:for|to)\s+(.+)/i,
      /invoice\s+(?:for|to)\s+(.+)/i,
      /bill\s+(?:for|to)\s+(.+)/i,
    ],
    extract: (match) => ({ search: match[1].trim() }),
    requiresConfirm: false,
  },

  // --- Send / lookup estimate ---
  {
    name: 'send_estimate',
    patterns: [
      /send\s*(?:the\s*)?(?:estimate|quote)\s*(?:for|to)\s+(.+)/i,
      /(?:estimate|quote)\s*(?:for|to)\s+(.+)/i,
      /(?:pull\s*up|find|get)\s*(?:the\s*)?(?:estimate|quote)\s*(?:for\s*)?(.+)/i,
    ],
    extract: (match) => ({ search: match[1].trim() }),
    requiresConfirm: false,
  },

  // --- Create customer ---
  {
    name: 'create_customer',
    patterns: [
      /(?:add|create|new)\s*(?:a\s*)?(?:customer|client|contact)\s*[:\-]?\s*(.+)/i,
    ],
    extract: (match) => ({ rawInput: match[1].trim() }),
    requiresConfirm: true,
  },

  // --- Create estimate (triggers conversation flow) ---
  {
    name: 'create_estimate',
    patterns: [
      /(?:create|new|start)\s*(?:an?\s*)?(?:estimate|quote)\s*(?:for\s*)?(.+)/i,
      /(?:make|write\s*up)\s*(?:an?\s*)?(?:estimate|quote)\s*(?:for\s*)?(.+)/i,
    ],
    extract: (match) => ({ customerSearch: match[1].trim() }),
    requiresConfirm: false,
  },

  // --- Convert estimate to invoice ---
  {
    name: 'convert_estimate',
    patterns: [
      /convert\s*(?:estimate\s*)?#?\s*(\d+)\s*(?:to\s*)?(?:an?\s*)?invoice/i,
      /(?:estimate\s*)?#?\s*(\d+)\s*to\s*invoice/i,
      /invoice\s*(?:from\s*)?estimate\s*#?\s*(\d+)/i,
      /turn\s*(?:estimate\s*)?#?\s*(\d+)\s*into\s*(?:an?\s*)?invoice/i,
    ],
    extract: (match) => ({ estimateNumber: match[1] }),
    requiresConfirm: true,
  },

  // --- Lookup customer ---
  {
    name: 'lookup_customer',
    patterns: [
      /(?:look\s*up|find|search|pull\s*up|get)\s+(?:customer|client|invoice|estimate|job|info)?\s*(?:for\s+|on\s+)?(.+)/i,
      /(?:what\s*(?:do\s*we\s*)?(?:have|know)\s*(?:on|about|for))\s+(.+)/i,
      /(?:show\s*me|check)\s+(.+)/i,
    ],
    extract: (match) => ({ search: match[1].trim() }),
    requiresConfirm: false,
  },

  // --- Bare number job lookup ---
  {
    name: 'lookup_job',
    patterns: [
      /^#?\s*(\d{3,6})\s*$/,
    ],
    extract: (match) => ({ jobNumber: match[1] }),
    requiresConfirm: false,
  },

  // --- Status check ---
  {
    name: 'status_check',
    patterns: [
      /(?:status|update|report)\s*(?:on\s*)?(?:job\s*)?#?\s*(\d+)/i,
      /how(?:'s| is)\s*(?:everything|business|things)/i,
    ],
    extract: (match) => ({ jobNumber: match[1] || null }),
    requiresConfirm: false,
  },

  // --- Schedule for specific date ---
  {
    name: 'schedule_date',
    patterns: [
      /(?:what(?:'s| is)?\s*(?:my|the)\s*)?schedule\s*(?:for|on)\s+(.+)/i,
      /(?:jobs?|appointments?)\s*(?:for|on)\s+(.+)/i,
    ],
    extract: (match) => ({ date: match[1].trim() }),
    requiresConfirm: false,
  },

  // --- Tomorrow's schedule ---
  {
    name: 'schedule_tomorrow',
    patterns: [
      /tomorrow(?:'s)?\s*(?:jobs?|schedule|calendar|appointments?|agenda|lineup)/i,
      /(?:what(?:'s| do| does)\s*(?:i|we)\s*(?:have|got)\s*)?tomorrow\s*\??/i,
      /(?:any\s*)?(?:jobs?|work|appointments?)\s*tomorrow\s*\??/i,
      /what(?:'s|\s*does)\s*tomorrow\s*look\s*like/i,
    ],
    extract: () => ({ date: 'tomorrow' }),
    requiresConfirm: false,
  },

  // --- Today's schedule ---
  {
    name: 'schedule_today',
    patterns: [
      /(?:what(?:'s| is|s)?\s*(?:my|the|our)\s*)?schedule\s*(?:today|for today)\s*\??$/i,
      /today(?:'s| is|s)?\s*(?:jobs?|schedule|appointments?|lineup|agenda)/i,
      /what(?:'s|s| do)\s*(?:i have|we have|i got|we got|on)\s*today/i,
      /(?:any\s*)?(?:jobs?|work|appointments?)\s*today\s*\??/i,
      /what\s*(?:do\s*)?(?:i|we)\s*have\s*(?:going\s*on\s*)?today/i,
      /what(?:'s|\s*is)\s*(?:on\s*)?(?:the\s*)?(?:schedule|calendar|agenda)\s*\??/i,
    ],
    extract: () => ({ date: 'today' }),
    requiresConfirm: false,
  },

  // --- Expense query ---
  {
    name: 'expense_query',
    patterns: [
      /how\s*much\s*(?:did\s*(?:we|i)\s*)?spend\s*(?:on\s*)?(.+)/i,
      /(?:what(?:'s|s| are| were)\s*(?:our|my|the)\s*)?expenses?\s*(?:for|on|this)\s*(.+)?/i,
      /(?:ad|ads|advertising)\s*(?:spend|cost|expenses?)/i,
    ],
    extract: (match) => ({ query: match[1] || 'this month' }),
    requiresConfirm: false,
  },

  // --- Cost analysis ---
  {
    name: 'cost_analysis',
    patterns: [
      /where\s*can\s*(?:we|i)\s*(?:cut|reduce|save)\s*(?:costs?|money|expenses?)/i,
      /(?:cost|expense)\s*(?:analysis|optimization|savings?)/i,
    ],
    extract: () => ({}),
    requiresConfirm: false,
  },

  // --- Send SMS ---
  {
    name: 'send_sms',
    patterns: [
      /(?:text|sms|message)\s+(.+?)\s*[:\-]\s*(.+)/i,
      /send\s*(?:a\s*)?(?:text|sms|message)\s*(?:to\s*)?(.+?)\s*(?:saying|:|-)\s*(.+)/i,
    ],
    extract: (match) => ({ to: match[1].trim(), message: match[2].trim() }),
    requiresConfirm: false,
  },

  // --- Start project ---
  {
    name: 'start_project',
    patterns: [
      /start\s*(?:building|creating|a new)\s*(.+)/i,
      /(?:build|create)\s*(?:a\s*)?(?:new\s*)?(.+)/i,
    ],
    extract: (match) => ({ projectName: match[1].trim() }),
    requiresConfirm: true,
  },
];

/**
 * Parse a natural language command into an intent + params.
 * @param {string} text - The raw command text
 * @returns {{ intent: string, params: object, requiresConfirm: boolean, raw: string }}
 */
function parseCommand(text) {
  if (!text || typeof text !== 'string') {
    return { intent: 'unknown', params: {}, requiresConfirm: false, raw: text || '' };
  }

  const trimmed = text.trim();

  for (const intent of INTENTS) {
    for (const pattern of intent.patterns) {
      const match = trimmed.match(pattern);
      if (match) {
        return {
          intent: intent.name,
          params: intent.extract(match),
          requiresConfirm: intent.requiresConfirm,
          raw: trimmed,
        };
      }
    }
  }

  return { intent: 'unknown', params: {}, requiresConfirm: false, raw: trimmed };
}

/**
 * Route a parsed command to the correct skill and execute it.
 * @param {object} parsed - Output from parseCommand()
 * @returns {Promise<string>} - Response text
 */
async function executeCommand(parsed) {
  switch (parsed.intent) {
    case 'job_complete': {
      const { sendInvoiceByJobNumber } = require('../quickbooks-invoice-sender');
      const result = await sendInvoiceByJobNumber(parsed.params.jobNumber);
      return result.success ? result.message : `Error: ${result.error}`;
    }

    case 'schedule_today':
    case 'schedule_date': {
      const { getEvents, formatSchedule } = require('../google-calendar-sync');
      const result = await getEvents(parsed.params.date);
      if (result.success) {
        return result.count > 0
          ? `You have ${result.count} job(s) today:\n\n${formatSchedule(result.events)}`
          : 'No jobs scheduled.';
      }
      return `Error: ${result.error}`;
    }

    case 'schedule_tomorrow': {
      const { getEvents, formatSchedule } = require('../google-calendar-sync');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const result = await getEvents(tomorrow.toISOString().split('T')[0]);
      if (result.success) {
        return result.count > 0
          ? `Tomorrow you have ${result.count} job(s):\n\n${formatSchedule(result.events)}`
          : 'No jobs scheduled for tomorrow.';
      }
      return `Error: ${result.error}`;
    }

    case 'send_invoice': {
      const { sendInvoiceByJobNumber } = require('../quickbooks-invoice-sender');
      const result = await sendInvoiceByJobNumber(parsed.params.jobNumber);
      return result.success ? result.message : `Error: ${result.error}`;
    }

    case 'send_invoice_by_name': {
      const { lookupByCustomer, formatJobList } = require('../quickbooks-job-lookup');
      const { sendInvoiceByJobNumber } = require('../quickbooks-invoice-sender');
      const lookup = await lookupByCustomer(parsed.params.search);
      if (!lookup.success) return `Error: ${lookup.error}`;
      if (lookup.count === 1) {
        const result = await sendInvoiceByJobNumber(lookup.jobs[0].invoice_number);
        return result.success ? result.message : `Error: ${result.error}`;
      }
      return `Found ${lookup.count} invoices for "${parsed.params.search}":\n\n${formatJobList(lookup.jobs)}\n\nSay "send invoice #<number>" to send a specific one.`;
    }

    case 'send_estimate': {
      const { lookupEstimate } = require('../quickbooks-job-lookup');
      const result = await lookupEstimate(parsed.params.search);
      if (!result.success) return `Error: ${result.error}`;
      if (result.count === 0) return `No estimates found for "${parsed.params.search}"`;
      const list = result.estimates
        .map((e, i) => `${i + 1}. #${e.estimate_number} — ${e.customer_name} | $${e.amount.toFixed(2)} (${e.status})`)
        .join('\n');
      return `Found ${result.count} estimate(s):\n\n${list}`;
    }

    case 'lookup_customer': {
      const { lookupByCustomer, lookupEstimate, formatJobList } = require('../quickbooks-job-lookup');
      const invoices = await lookupByCustomer(parsed.params.search);
      const estimates = await lookupEstimate(parsed.params.search);
      let response = '';
      if (invoices.success && invoices.count > 0) {
        response += `Invoices:\n${formatJobList(invoices.jobs)}\n\n`;
      }
      if (estimates.success && estimates.count > 0) {
        response += `Estimates:\n${estimates.estimates.map((e, i) => `${i + 1}. #${e.estimate_number} — ${e.customer_name} | $${e.amount.toFixed(2)} (${e.status})`).join('\n')}`;
      }
      return response || `No invoices or estimates found for "${parsed.params.search}"`;
    }

    case 'lookup_job': {
      const { lookupJob, formatJobDetails } = require('../quickbooks-job-lookup');
      const result = await lookupJob(parsed.params.jobNumber);
      return result.success ? formatJobDetails(result.job) : `Error: ${result.error}`;
    }

    case 'create_customer': {
      const { createCustomer } = require('../quickbooks-customer-creator');
      const result = await createCustomer({ name: parsed.params.rawInput });
      return result.success
        ? `Customer "${result.customerName}" created (ID: ${result.customerId})`
        : `Error: ${result.error}`;
    }

    case 'create_estimate': {
      // Handled by conversation state machine in TelegramBot/index.js
      return `__START_ESTIMATE_FLOW__${parsed.params.customerSearch}`;
    }

    case 'convert_estimate': {
      const { lookupEstimate } = require('../quickbooks-job-lookup');
      const { convertEstimateToInvoice } = require('../quickbooks-estimate-manager');

      const lookup = await lookupEstimate(parsed.params.estimateNumber);
      if (!lookup.success || lookup.count === 0) {
        return `No estimate #${parsed.params.estimateNumber} found.`;
      }

      const estimate = lookup.estimates[0];
      const result = await convertEstimateToInvoice(estimate.estimate_id);
      if (!result.success) return `Error converting: ${result.error}`;

      return `Invoice #${result.invoiceNumber} created from estimate #${parsed.params.estimateNumber} — $${result.amount.toFixed(2)}.\n\nSay "send invoice #${result.invoiceNumber}" to send it to the customer.`;
    }

    case 'send_sms': {
      const { sendSMS } = require('../twilio-sms-sender');
      const result = await sendSMS(parsed.params.to, parsed.params.message);
      return result.success ? `SMS sent to ${result.to}` : `SMS failed: ${result.error}`;
    }

    case 'expense_query':
      return `Expense tracking will be available after QuickBooks reports integration. Query: "${parsed.params.query}"`;

    case 'cost_analysis':
      return 'Cost analysis will be available after QuickBooks reports integration.';

    case 'start_project':
      return `Ready to start building "${parsed.params.projectName}". Reply CONFIRM to proceed.`;

    case 'status_check': {
      if (parsed.params.jobNumber) {
        const { lookupJob, formatJobDetails } = require('../quickbooks-job-lookup');
        const result = await lookupJob(parsed.params.jobNumber);
        return result.success ? formatJobDetails(result.job) : `Error: ${result.error}`;
      }
      return 'System is running. All skills operational.';
    }

    default:
      return `I didn't understand that command. Try:\n- "Job 1001 done"\n- "What's my schedule today?"\n- "Send invoice for job 1001"\n- "Pull up Smith"\n- "New estimate for Johnson"`;
  }
}

module.exports = { parseCommand, executeCommand, INTENTS };

// --- CLI mode ---
if (require.main === module) {
  const command = process.argv.slice(2).join(' ');
  if (!command) {
    console.log('Usage: node index.js <natural language command>');
    console.log('Examples:');
    console.log('  node index.js "Job 1001 done"');
    console.log('  node index.js "finished 1001"');
    console.log('  node index.js "any jobs today?"');
    console.log('  node index.js "pull up smith"');
    console.log('  node index.js "new estimate for johnson"');
    process.exit(1);
  }

  const parsed = parseCommand(command);
  console.log('Intent:', parsed.intent);
  console.log('Params:', parsed.params);
  console.log('Confirm required:', parsed.requiresConfirm);
  console.log('');

  executeCommand(parsed).then((response) => {
    console.log('Response:', response);
  });
}
