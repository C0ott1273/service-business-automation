/**
 * dashboard/server.js — Simple web dashboard server
 * Serves the job dashboard and provides API endpoints for jobs and leads.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const http = require('http');
const fs = require('fs');
const path = require('path');

const { getTodaysJobs } = require('../google-calendar-sync');

const PORT = process.env.DASHBOARD_PORT || 3000;

// In-memory stores (will be replaced by proper DB in Phase 6)
const leads = [];
const completedJobs = new Set();

function addLead(lead) {
  leads.unshift({ ...lead, status: 'new' });
  if (leads.length > 50) leads.pop();
}

const routes = {
  'GET /': (req, res) => {
    const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  },

  'GET /api/jobs': async (req, res) => {
    const result = await getTodaysJobs();
    if (result.success) {
      result.events = result.events.map((e) => ({
        ...e,
        completed: completedJobs.has(e.id),
      }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  },

  'GET /api/leads': (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, leads }));
  },

  'POST /api/jobs/complete': (req, res, jobId) => {
    completedJobs.add(jobId);
    console.log(`[dashboard] Job ${jobId} marked complete`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, jobId }));
  },

  'POST /api/leads': (req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const lead = JSON.parse(body);
        addLead(lead);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
      }
    });
  },
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const key = `${req.method} ${url.pathname}`;

  // Match POST /api/jobs/:id/complete
  const completeMatch = url.pathname.match(/^\/api\/jobs\/(.+)\/complete$/);
  if (req.method === 'POST' && completeMatch) {
    return routes['POST /api/jobs/complete'](req, res, completeMatch[1]);
  }

  if (routes[key]) {
    try {
      await routes[key](req, res);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`[dashboard] Running at http://localhost:${PORT}`);
});

module.exports = { addLead, server };
