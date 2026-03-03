/**
 * inbound-command-handler — Skill #7
 * Parse natural language commands and route them to the correct skill.
 *
 * Inputs:  Natural language text command
 * Outputs: { intent, params, response }
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

// Intent definitions with patterns and handlers
// Order matters — more specific patterns must come before general ones
const INTENTS = [
  {
    name: 'job_complete',
    patterns: [
      /job\s*#?\s*(\d+)\s*(?:done|complete|finished|completed)/i,
      /(?:done|complete|finished|completed)\s*(?:with\s*)?job\s*#?\s*(\d+)/i,
      /mark\s*job\s*#?\s*(\d+)\s*(?:done|complete)/i,
    ],
    extract: (match) => ({ jobNumber: match[1] }),
    requiresConfirm: false,
  },
  {
    name: 'send_invoice',
    patterns: [
      /send\s*(?:the\s*)?invoice\s*(?:for\s*)?(?:job\s*|estimate\s*)?#?\s*(\d+)/i,
      /invoice\s*(?:job\s*|estimate\s*)?#?\s*(\d+)/i,
    ],
    extract: (match) => ({ jobNumber: match[1] }),
    requiresConfirm: false,
  },
  {
    name: 'send_invoice_by_name',
    patterns: [
      /send\s*(?:the\s*)?(?:invoice|estimate)\s*(?:for|to)\s+(.+)/i,
      /(?:invoice|estimate)\s+(?:for|to)\s+(.+)/i,
    ],
    extract: (match) => ({ search: match[1].trim() }),
    requiresConfirm: false,
  },
  {
    name: 'lookup_customer',
    patterns: [
      /(?:look\s*up|find|search|pull\s*up)\s+(?:customer|client|invoice|estimate|job)?\s*(?:for\s+)?(.+)/i,
    ],
    extract: (match) => ({ search: match[1].trim() }),
    requiresConfirm: false,
  },
  {
    name: 'status_check',
    patterns: [
      /(?:status|update|report)\s*(?:on\s*)?(?:job\s*)?#?\s*(\d+)/i,
      /how(?:'s| is)\s*(?:everything|business|things)/i,
    ],
    extract: (match) => ({ jobNumber: match[1] || null }),
    requiresConfirm: false,
  },
  {
    name: 'schedule_date',
    patterns: [
      /(?:what(?:'s| is)?\s*(?:my|the)\s*)?schedule\s*(?:for|on)\s+(.+)/i,
      /(?:jobs?|appointments?)\s*(?:for|on)\s+(.+)/i,
    ],
    extract: (match) => ({ date: match[1].trim() }),
    requiresConfirm: false,
  },
  {
    name: 'schedule_today',
    patterns: [
      /(?:what(?:'s| is|s)?\s*(?:my|the|our)\s*)?schedule\s*(?:today|for today)\s*\??$/i,
      /today(?:'s| is|s)?\s*(?:jobs?|schedule|appointments?)/i,
      /what(?:'s|s| do)\s*(?:i have|we have|on)\s*today/i,
    ],
    extract: () => ({ date: 'today' }),
    requiresConfirm: false,
  },
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
  {
    name: 'cost_analysis',
    patterns: [
      /where\s*can\s*(?:we|i)\s*(?:cut|reduce|save)\s*(?:costs?|money|expenses?)/i,
      /(?:cost|expense)\s*(?:analysis|optimization|savings?)/i,
    ],
    extract: () => ({}),
    requiresConfirm: false,
  },
  {
    name: 'send_sms',
    patterns: [
      /(?:text|sms|message)\s+(.+?)\s*[:\-]\s*(.+)/i,
      /send\s*(?:a\s*)?(?:text|sms|message)\s*(?:to\s*)?(.+?)\s*(?:saying|:|-)\s*(.+)/i,
    ],
    extract: (match) => ({ to: match[1].trim(), message: match[2].trim() }),
    requiresConfirm: false,
  },
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

    case 'lookup_customer': {
      const { lookupByCustomer, lookupEstimate, formatJobList } = require('../quickbooks-job-lookup');
      // Try invoices first, then estimates
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
      return `I didn't understand that command. Try:\n- "Job 1001 done"\n- "What's my schedule today?"\n- "Send invoice for job 1001"\n- "Text 5551234567: Your estimate is confirmed"`;
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
    console.log('  node index.js "What\'s my schedule today?"');
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
