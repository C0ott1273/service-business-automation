/**
 * email-parser — Skill #1
 * Monitors incoming emails from website form submissions and extracts lead info.
 *
 * Inputs:  Raw email content (via IMAP)
 * Outputs: { name, phone, email, message, timestamp }
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const Imap = require('imap');
const { simpleParser } = require('mailparser');

// --- Configuration ---
const IMAP_CONFIG = {
  user: process.env.EMAIL_IMAP_USER,
  password: process.env.EMAIL_IMAP_PASS,
  host: process.env.EMAIL_IMAP_HOST || 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
};

// --- Lead extraction from parsed email ---
function extractLead(parsed) {
  const body = parsed.text || parsed.html || '';
  const from = parsed.from?.value?.[0] || {};

  // Extract name: try "Name: ..." pattern first, fall back to email sender name
  const nameMatch = body.match(/(?:name|full\s*name|customer)\s*[:\-]\s*(.+)/i);
  const name = nameMatch
    ? nameMatch[1].trim().split('\n')[0].trim()
    : from.name || 'Unknown';

  // Extract phone: multiple formats
  const phoneMatch = body.match(
    /(?:phone|tel|mobile|cell|number)\s*[:\-]\s*([\d\s\-().+]+)/i
  );
  const rawPhone = phoneMatch
    ? phoneMatch[1].trim()
    : (body.match(/(\+?1?\s*[-.]?\s*\(?\d{3}\)?\s*[-.]?\s*\d{3}\s*[-.]?\s*\d{4})/) || [])[1] || '';
  const phone = rawPhone.replace(/[^\d+]/g, '');

  // Extract email: from the body or from the sender
  const emailMatch = body.match(
    /(?:email|e-mail)\s*[:\-]\s*([\w.+-]+@[\w.-]+\.\w+)/i
  );
  const email = emailMatch ? emailMatch[1].trim() : from.address || '';

  // Extract message: try "Message: ..." pattern, fall back to full body
  const msgMatch = body.match(
    /(?:message|comments?|details?|description|inquiry)\s*[:\-]\s*([\s\S]+?)(?:\n\s*\n|$)/i
  );
  const message = msgMatch ? msgMatch[1].trim().substring(0, 500) : body.substring(0, 500).trim();

  return {
    name,
    phone,
    email,
    message,
    timestamp: parsed.date ? parsed.date.toISOString() : new Date().toISOString(),
  };
}

// --- Parse a single raw email string ---
async function parseEmail(rawEmail) {
  const parsed = await simpleParser(rawEmail);
  return extractLead(parsed);
}

// --- Monitor inbox for new emails (long-running) ---
function monitorInbox(onLead, options = {}) {
  const { mailbox = 'INBOX', markSeen = true } = options;

  if (!IMAP_CONFIG.user || !IMAP_CONFIG.password) {
    throw new Error(
      'Missing EMAIL_IMAP_USER or EMAIL_IMAP_PASS. Set them in .env'
    );
  }

  const imap = new Imap(IMAP_CONFIG);

  function processMessage(msg) {
    let buffer = '';
    msg.on('body', (stream) => {
      stream.on('data', (chunk) => { buffer += chunk.toString('utf8'); });
    });
    msg.once('end', async () => {
      try {
        const lead = await parseEmail(buffer);
        if (lead.phone || lead.email) {
          onLead(lead);
        }
      } catch (err) {
        console.error('Failed to parse email:', err.message);
      }
    });
  }

  function openInbox(cb) {
    imap.openBox(mailbox, false, cb);
  }

  imap.once('ready', () => {
    openInbox((err) => {
      if (err) throw err;
      console.log(`[email-parser] Monitoring ${mailbox} for new leads...`);

      // Fetch unseen emails on startup
      imap.search(['UNSEEN'], (err, results) => {
        if (err || !results?.length) return;
        const fetch = imap.fetch(results, { bodies: '', markSeen });
        fetch.on('message', processMessage);
      });

      // Watch for new emails
      imap.on('mail', () => {
        imap.search(['UNSEEN'], (err, results) => {
          if (err || !results?.length) return;
          const fetch = imap.fetch(results, { bodies: '', markSeen });
          fetch.on('message', processMessage);
        });
      });
    });
  });

  imap.once('error', (err) => {
    console.error('[email-parser] IMAP error:', err.message);
  });

  imap.once('end', () => {
    console.log('[email-parser] Connection ended.');
  });

  imap.connect();

  // Return a stop function
  return () => {
    try { imap.end(); } catch (_) {}
  };
}

// --- Exports ---
module.exports = { parseEmail, extractLead, monitorInbox };

// --- CLI mode ---
if (require.main === module) {
  console.log('[email-parser] Starting inbox monitor...');
  monitorInbox((lead) => {
    console.log('[email-parser] New lead detected:');
    console.log(JSON.stringify(lead, null, 2));
  });
}
