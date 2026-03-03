/**
 * google-calendar-sync — Skill #3
 * Read and write Google Calendar events. Powers the daily job dashboard.
 *
 * Inputs:  Date range or event details
 * Outputs: List of events with title, time, location, notes
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const https = require('https');

const API_KEY = process.env.GOOGLE_CALENDAR_API_KEY;
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;
const BASE_URL = 'www.googleapis.com';

/**
 * Make a Google Calendar API request.
 */
function apiRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) {
            reject(new Error(parsed.error.message || JSON.stringify(parsed.error)));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data.substring(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

/**
 * Get events for a given date range.
 * @param {string} startDate - ISO date string or "today"
 * @param {string} endDate - ISO date string or "today" (defaults to end of startDate)
 * @returns {Promise<Array<{id, title, start, end, location, notes}>>}
 */
async function getEvents(startDate = 'today', endDate = null) {
  if (!API_KEY || !CALENDAR_ID) {
    return { success: false, error: 'Missing GOOGLE_CALENDAR_API_KEY or GOOGLE_CALENDAR_ID in .env' };
  }

  // Resolve "today" to actual dates
  const now = new Date();
  let timeMin, timeMax;

  if (startDate === 'today') {
    timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    timeMax = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).toISOString();
  } else {
    timeMin = new Date(startDate).toISOString();
    if (endDate) {
      timeMax = new Date(endDate).toISOString();
    } else {
      const end = new Date(startDate);
      end.setHours(23, 59, 59);
      timeMax = end.toISOString();
    }
  }

  const calId = encodeURIComponent(CALENDAR_ID);
  const path = `/calendar/v3/calendars/${calId}/events?key=${API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;

  try {
    const data = await apiRequest(path);
    const events = (data.items || []).map((item) => ({
      id: item.id,
      title: item.summary || 'Untitled',
      start: item.start?.dateTime || item.start?.date || '',
      end: item.end?.dateTime || item.end?.date || '',
      location: item.location || '',
      notes: item.description || '',
    }));

    return { success: true, events, count: events.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Get today's events (convenience method for dashboard and Telegram bot).
 */
async function getTodaysJobs() {
  return getEvents('today');
}

/**
 * Create a new calendar event.
 * @param {Object} eventDetails - { title, startTime, endTime, location, notes }
 * @returns {Promise<{success, event?, error?}>}
 */
async function createEvent({ title, startTime, endTime, location = '', notes = '' }) {
  if (!API_KEY || !CALENDAR_ID) {
    return { success: false, error: 'Missing GOOGLE_CALENDAR_API_KEY or GOOGLE_CALENDAR_ID in .env' };
  }

  if (!title || !startTime || !endTime) {
    return { success: false, error: 'title, startTime, and endTime are required' };
  }

  const calId = encodeURIComponent(CALENDAR_ID);
  const path = `/calendar/v3/calendars/${calId}/events?key=${API_KEY}`;

  const body = {
    summary: title,
    location,
    description: notes,
    start: { dateTime: new Date(startTime).toISOString() },
    end: { dateTime: new Date(endTime).toISOString() },
  };

  try {
    const data = await apiRequest(path, 'POST', body);
    return {
      success: true,
      event: {
        id: data.id,
        title: data.summary,
        start: data.start?.dateTime,
        end: data.end?.dateTime,
        location: data.location || '',
        notes: data.description || '',
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Format events into a readable text summary (for Telegram bot / dashboard).
 */
function formatSchedule(events) {
  if (!events || events.length === 0) return 'No jobs scheduled.';

  return events.map((e, i) => {
    const startTime = e.start ? new Date(e.start).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
    }) : 'TBD';
    const loc = e.location ? ` @ ${e.location}` : '';
    return `${i + 1}. ${startTime} — ${e.title}${loc}`;
  }).join('\n');
}

module.exports = { getEvents, getTodaysJobs, createEvent, formatSchedule };

// --- CLI mode ---
if (require.main === module) {
  const arg = process.argv[2] || 'today';
  console.log(`[google-calendar-sync] Fetching events for: ${arg}`);

  getEvents(arg).then((result) => {
    if (result.success) {
      console.log(`\nFound ${result.count} event(s):\n`);
      console.log(formatSchedule(result.events));
    } else {
      console.error('Error:', result.error);
    }
  });
}
