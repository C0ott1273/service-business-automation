/**
 * competitor-monitor — Track competitor reviews and ratings
 *
 * Stores competitor Google Business Place IDs and tracks their
 * review counts / ratings over time. Alerts when they get new reviews.
 *
 * Requires: GOOGLE_PLACES_API_KEY (or uses GOOGLE_CALENDAR_API_KEY as fallback)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_CALENDAR_API_KEY || '';
const DATA_FILE = path.resolve(__dirname, 'competitor-data.json');

/**
 * Load stored competitor data.
 */
function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (_) {
    return { competitors: [], snapshots: [], lastCheck: null };
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/**
 * Add a competitor to track.
 * @param {string} name - Business name
 * @param {string} placeId - Google Place ID
 */
function addCompetitor(name, placeId) {
  const data = loadData();
  const exists = data.competitors.find((c) => c.placeId === placeId);
  if (exists) return { success: false, message: `${name} is already being tracked.` };

  data.competitors.push({ name, placeId, addedAt: new Date().toISOString() });
  saveData(data);
  return { success: true, message: `Now tracking ${name}.` };
}

/**
 * Fetch current rating and review count from Google Places API.
 */
function fetchPlaceDetails(placeId) {
  return new Promise((resolve, reject) => {
    if (!API_KEY) {
      resolve({ success: false, error: 'No Google API key configured' });
      return;
    }

    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total&key=${API_KEY}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.result) {
            resolve({
              success: true,
              name: parsed.result.name,
              rating: parsed.result.rating || 0,
              reviewCount: parsed.result.user_ratings_total || 0,
            });
          } else {
            resolve({ success: false, error: parsed.status || 'Unknown error' });
          }
        } catch (e) {
          resolve({ success: false, error: e.message });
        }
      });
    }).on('error', (e) => resolve({ success: false, error: e.message }));
  });
}

/**
 * Check all competitors and record a snapshot.
 * Returns changes since last check.
 */
async function checkCompetitors() {
  const data = loadData();
  if (data.competitors.length === 0) {
    return { success: true, message: 'No competitors being tracked. Use addCompetitor() to add some.', changes: [] };
  }

  const changes = [];
  const snapshot = { date: new Date().toISOString(), entries: [] };

  for (const comp of data.competitors) {
    const result = await fetchPlaceDetails(comp.placeId);
    if (!result.success) {
      snapshot.entries.push({ name: comp.name, placeId: comp.placeId, error: result.error });
      continue;
    }

    // Find previous snapshot for this competitor
    const prevSnapshot = [...data.snapshots].reverse().find((s) =>
      s.entries.some((e) => e.placeId === comp.placeId && !e.error)
    );
    const prev = prevSnapshot
      ? prevSnapshot.entries.find((e) => e.placeId === comp.placeId)
      : null;

    const entry = {
      name: comp.name,
      placeId: comp.placeId,
      rating: result.rating,
      reviewCount: result.reviewCount,
    };
    snapshot.entries.push(entry);

    // Detect changes
    if (prev) {
      const newReviews = result.reviewCount - (prev.reviewCount || 0);
      const ratingChange = result.rating - (prev.rating || 0);
      if (newReviews > 0 || Math.abs(ratingChange) >= 0.1) {
        changes.push({
          name: comp.name,
          newReviews,
          rating: result.rating,
          previousRating: prev.rating,
          totalReviews: result.reviewCount,
        });
      }
    }
  }

  data.snapshots.push(snapshot);
  // Keep last 90 snapshots
  if (data.snapshots.length > 90) {
    data.snapshots = data.snapshots.slice(-90);
  }
  data.lastCheck = new Date().toISOString();
  saveData(data);

  return { success: true, changes, snapshot };
}

/**
 * Format competitor status for Telegram.
 */
function formatCompetitorReport() {
  const data = loadData();
  if (data.competitors.length === 0) {
    return 'No competitors tracked yet. Add some to start monitoring.';
  }

  const latest = data.snapshots[data.snapshots.length - 1];
  if (!latest) {
    return 'No data yet. Run a check first.';
  }

  const lines = latest.entries.map((e) => {
    if (e.error) return `  ${e.name}: Error — ${e.error}`;
    return `  ${e.name}: ${e.rating} stars (${e.reviewCount} reviews)`;
  });

  return `Competitor Watch\n\n${lines.join('\n')}\n\nLast checked: ${new Date(data.lastCheck).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`;
}

module.exports = {
  addCompetitor,
  checkCompetitors,
  formatCompetitorReport,
  loadData,
};
