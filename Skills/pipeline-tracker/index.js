/**
 * pipeline-tracker — Sales pipeline from lead to review
 *
 * Tracks every lead through the funnel:
 * LEAD → CONTACTED → ESTIMATE_SCHEDULED → ESTIMATE_SENT → JOB_SCHEDULED → INSTALLED → REVIEW_SENT
 *
 * Provides conversion rates and revenue forecasting.
 */

const fs = require('fs');
const path = require('path');

const PIPELINE_FILE = path.resolve(__dirname, 'pipeline.json');

const STAGES = [
  'lead',
  'contacted',
  'estimate_scheduled',
  'estimate_sent',
  'job_scheduled',
  'installed',
  'review_sent',
];

function loadPipeline() {
  try {
    return JSON.parse(fs.readFileSync(PIPELINE_FILE, 'utf8'));
  } catch (_) {
    return { deals: [], stats: {} };
  }
}

function savePipeline(data) {
  fs.writeFileSync(PIPELINE_FILE, JSON.stringify(data, null, 2));
}

/**
 * Add a new lead to the pipeline.
 */
function addLead(lead) {
  const data = loadPipeline();
  const deal = {
    id: `deal_${Date.now()}`,
    name: lead.name,
    phone: lead.phone || null,
    email: lead.email || null,
    source: lead.source || 'unknown',
    stage: 'lead',
    estimatedValue: lead.estimatedValue || 0,
    notes: lead.notes || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    history: [{ stage: 'lead', at: new Date().toISOString() }],
    lost: false,
    lostReason: null,
  };

  data.deals.push(deal);
  savePipeline(data);
  return { success: true, deal };
}

/**
 * Move a deal to the next stage (or a specific stage).
 */
function advanceDeal(dealId, toStage) {
  const data = loadPipeline();
  const deal = data.deals.find((d) => d.id === dealId);
  if (!deal) return { success: false, error: 'Deal not found' };

  if (toStage && !STAGES.includes(toStage)) {
    return { success: false, error: `Invalid stage: ${toStage}. Valid: ${STAGES.join(', ')}` };
  }

  const nextStage = toStage || STAGES[STAGES.indexOf(deal.stage) + 1];
  if (!nextStage) return { success: false, error: 'Deal is already at final stage' };

  deal.stage = nextStage;
  deal.updatedAt = new Date().toISOString();
  deal.history.push({ stage: nextStage, at: deal.updatedAt });
  savePipeline(data);

  return { success: true, deal };
}

/**
 * Mark a deal as lost.
 */
function loseDeal(dealId, reason) {
  const data = loadPipeline();
  const deal = data.deals.find((d) => d.id === dealId);
  if (!deal) return { success: false, error: 'Deal not found' };

  deal.lost = true;
  deal.lostReason = reason || 'unknown';
  deal.updatedAt = new Date().toISOString();
  savePipeline(data);

  return { success: true, deal };
}

/**
 * Find a deal by customer name or phone.
 */
function findDeal(search) {
  const data = loadPipeline();
  const s = search.toLowerCase();
  return data.deals.filter(
    (d) =>
      !d.lost &&
      (d.name.toLowerCase().includes(s) ||
        (d.phone && d.phone.includes(search)) ||
        (d.email && d.email.toLowerCase().includes(s)))
  );
}

/**
 * Get pipeline summary stats.
 */
function getPipelineStats(daysBack = 30) {
  const data = loadPipeline();
  const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  const recent = data.deals.filter((d) => new Date(d.createdAt) >= cutoff);
  const active = recent.filter((d) => !d.lost);
  const lost = recent.filter((d) => d.lost);

  const byStage = {};
  for (const stage of STAGES) {
    byStage[stage] = active.filter((d) => d.stage === stage).length;
  }

  const installed = active.filter((d) => d.stage === 'installed' || d.stage === 'review_sent');
  const totalValue = installed.reduce((sum, d) => sum + (d.estimatedValue || 0), 0);
  const pipelineValue = active
    .filter((d) => d.stage !== 'installed' && d.stage !== 'review_sent')
    .reduce((sum, d) => sum + (d.estimatedValue || 0), 0);

  const closeRate = recent.length > 0
    ? ((installed.length / recent.length) * 100).toFixed(1)
    : '0.0';

  return {
    period: `Last ${daysBack} days`,
    totalLeads: recent.length,
    activeDeals: active.length,
    lostDeals: lost.length,
    byStage,
    closedRevenue: totalValue,
    pipelineValue,
    closeRate: `${closeRate}%`,
  };
}

/**
 * Update a deal's lead source.
 */
function updateDealSource(dealId, source) {
  const data = loadPipeline();
  const deal = data.deals.find((d) => d.id === dealId);
  if (!deal) return { success: false, error: 'Deal not found' };

  deal.source = source;
  deal.updatedAt = new Date().toISOString();
  savePipeline(data);
  return { success: true, deal };
}

/**
 * Get leads grouped by source with conversion stats.
 */
function getLeadsBySource(daysBack = 30) {
  const data = loadPipeline();
  const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  const recent = data.deals.filter((d) => new Date(d.createdAt) >= cutoff);

  const sources = {};
  for (const deal of recent) {
    const src = deal.source || 'unknown';
    if (!sources[src]) {
      sources[src] = { total: 0, closed: 0, lost: 0, revenue: 0 };
    }
    sources[src].total++;
    if (deal.lost) {
      sources[src].lost++;
    } else if (deal.stage === 'installed' || deal.stage === 'review_sent') {
      sources[src].closed++;
      sources[src].revenue += deal.estimatedValue || 0;
    }
  }

  // Add close rate to each source
  for (const src of Object.keys(sources)) {
    const s = sources[src];
    s.closeRate = s.total > 0 ? ((s.closed / s.total) * 100).toFixed(1) + '%' : '0.0%';
  }

  return sources;
}

/**
 * Format pipeline for Telegram display.
 */
function formatPipeline() {
  const stats = getPipelineStats();

  const funnel = STAGES.map((stage) => {
    const count = stats.byStage[stage] || 0;
    const bar = '█'.repeat(Math.min(count, 20));
    const label = stage.replace(/_/g, ' ');
    return `  ${label}: ${count} ${bar}`;
  }).join('\n');

  return (
    `Sales Pipeline (${stats.period})\n\n` +
    `${funnel}\n\n` +
    `Total leads: ${stats.totalLeads}\n` +
    `Active: ${stats.activeDeals} | Lost: ${stats.lostDeals}\n` +
    `Close rate: ${stats.closeRate}\n` +
    `Closed revenue: $${stats.closedRevenue.toLocaleString()}\n` +
    `Pipeline value: $${stats.pipelineValue.toLocaleString()}`
  );
}

module.exports = {
  addLead,
  advanceDeal,
  loseDeal,
  findDeal,
  getPipelineStats,
  getLeadsBySource,
  updateDealSource,
  formatPipeline,
  STAGES,
};
