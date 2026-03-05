/**
 * lead-monitor — Skill
 * Periodically checks email for new leads and returns them for owner review.
 *
 * Uses the email-parser skill for extraction.
 * Tracks processed emails in a JSON file to survive restarts.
 *
 * Exports: { checkForNewLeads, markLeadProcessed, getProcessedCount }
 */

const path = require('path');
const fs = require('fs');
const { parseEmail } = require('../email-parser');

const PROCESSED_FILE = path.join(__dirname, 'processed.json');
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Load processed email IDs from disk
function loadProcessed() {
  try {
    if (fs.existsSync(PROCESSED_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROCESSED_FILE, 'utf8'));
      // Prune entries older than 30 days
      const cutoff = Date.now() - THIRTY_DAYS_MS;
      const pruned = data.filter((entry) => entry.timestamp > cutoff);
      if (pruned.length !== data.length) {
        saveProcessed(pruned);
      }
      return pruned;
    }
  } catch (e) {
    console.error('[lead-monitor] Error loading processed file:', e.message);
  }
  return [];
}

function saveProcessed(entries) {
  try {
    fs.writeFileSync(PROCESSED_FILE, JSON.stringify(entries, null, 2));
  } catch (e) {
    console.error('[lead-monitor] Error saving processed file:', e.message);
  }
}

/**
 * Check email inbox for new leads since last check.
 * Returns array of parsed lead objects.
 * @returns {Promise<Array<{name: string, phone: string, email: string, message: string, timestamp: string, messageId: string}>>}
 */
async function checkForNewLeads() {
  const Imap = require('imap');
  const { simpleParser } = require('mailparser');

  const host = process.env.EMAIL_IMAP_HOST || 'imap.gmail.com';
  const user = process.env.EMAIL_IMAP_USER;
  const pass = process.env.EMAIL_IMAP_PASS;

  if (!user || !pass) {
    console.error('[lead-monitor] Missing EMAIL_IMAP_USER or EMAIL_IMAP_PASS');
    return [];
  }

  const processed = loadProcessed();
  const processedIds = new Set(processed.map((p) => p.id));

  return new Promise((resolve) => {
    const leads = [];

    const imap = new Imap({
      user,
      password: pass,
      host,
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err) => {
        if (err) {
          console.error('[lead-monitor] Failed to open inbox:', err.message);
          imap.end();
          resolve([]);
          return;
        }

        imap.search(['UNSEEN'], (err, results) => {
          if (err || !results || results.length === 0) {
            imap.end();
            resolve([]);
            return;
          }

          const fetch = imap.fetch(results, { bodies: '', markSeen: true });
          let pending = 0;

          fetch.on('message', (msg) => {
            pending++;
            let rawEmail = '';

            msg.on('body', (stream) => {
              stream.on('data', (chunk) => { rawEmail += chunk.toString('utf8'); });
            });

            msg.once('end', async () => {
              try {
                const parsed = await simpleParser(rawEmail);
                const messageId = parsed.messageId || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

                if (!processedIds.has(messageId)) {
                  const lead = require('../email-parser').extractLead(parsed);
                  if (lead.phone || lead.email) {
                    lead.messageId = messageId;
                    leads.push(lead);
                  }
                }
              } catch (e) {
                console.error('[lead-monitor] Error parsing email:', e.message);
              }

              pending--;
              if (pending === 0) {
                imap.end();
              }
            });
          });

          fetch.once('end', () => {
            if (pending === 0) {
              imap.end();
            }
          });

          fetch.once('error', (err) => {
            console.error('[lead-monitor] Fetch error:', err.message);
            imap.end();
          });
        });
      });
    });

    imap.once('end', () => {
      resolve(leads);
    });

    imap.once('error', (err) => {
      console.error('[lead-monitor] IMAP error:', err.message);
      resolve([]);
    });

    imap.connect();
  });
}

/**
 * Mark a lead as processed so it won't appear again.
 * @param {object} lead - Lead object with messageId
 */
function markLeadProcessed(lead) {
  const processed = loadProcessed();
  const id = lead.messageId || lead.email || `${lead.name}_${lead.phone}`;
  processed.push({ id, timestamp: Date.now() });
  saveProcessed(processed);
}

/**
 * Get count of processed leads.
 * @returns {number}
 */
function getProcessedCount() {
  return loadProcessed().length;
}

module.exports = { checkForNewLeads, markLeadProcessed, getProcessedCount };

// --- CLI mode ---
if (require.main === module) {
  checkForNewLeads().then((leads) => {
    console.log(`Found ${leads.length} new lead(s):`);
    leads.forEach((lead) => console.log(JSON.stringify(lead, null, 2)));
  });
}
