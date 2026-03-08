/**
 * weekly-pnl — Weekly Profit & Loss tracking
 *
 * Log expenses by category, calculate revenue from pipeline,
 * and generate weekly P&L reports.
 */

const fs = require('fs');
const path = require('path');

const PNL_FILE = path.resolve(__dirname, 'pnl-data.json');

const EXPENSE_CATEGORIES = [
  'google_ads',
  'facebook_ads',
  'materials',
  'labor',
  'gas',
  'tools',
  'insurance',
  'phone',
  'marketing',
  'software',
  'other',
];

function loadData() {
  try { return JSON.parse(fs.readFileSync(PNL_FILE, 'utf8')); } catch (_) { return { expenses: [], revenue: [] }; }
}

function saveData(data) {
  fs.writeFileSync(PNL_FILE, JSON.stringify(data, null, 2));
}

/**
 * Log an expense.
 */
function addExpense(amount, category, note) {
  const data = loadData();
  const cat = category.toLowerCase();
  if (!EXPENSE_CATEGORIES.includes(cat)) {
    return { success: false, error: `Invalid category "${cat}". Valid: ${EXPENSE_CATEGORIES.join(', ')}` };
  }

  const expense = {
    id: `exp_${Date.now()}`,
    amount: parseFloat(amount),
    category: cat,
    note: note || '',
    date: new Date().toISOString(),
  };

  data.expenses.push(expense);
  saveData(data);
  return { success: true, expense, message: `Logged $${expense.amount} expense (${cat})${note ? ': ' + note : ''}` };
}

/**
 * Log revenue (manual entry or from pipeline).
 */
function addRevenue(amount, source, note) {
  const data = loadData();
  const entry = {
    id: `rev_${Date.now()}`,
    amount: parseFloat(amount),
    source: source || 'job',
    note: note || '',
    date: new Date().toISOString(),
  };

  data.revenue.push(entry);
  saveData(data);
  return { success: true, entry, message: `Logged $${entry.amount} revenue (${source || 'job'})` };
}

/**
 * Get P&L for a given number of days back.
 */
function getPnL(daysBack = 7) {
  const data = loadData();
  const cutoff = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

  const recentExpenses = data.expenses.filter((e) => new Date(e.date) >= cutoff);
  const recentRevenue = data.revenue.filter((r) => new Date(r.date) >= cutoff);

  const totalExpenses = recentExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalRevenue = recentRevenue.reduce((sum, r) => sum + r.amount, 0);

  // Group expenses by category
  const byCategory = {};
  for (const e of recentExpenses) {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  }

  // Group revenue by source
  const bySource = {};
  for (const r of recentRevenue) {
    bySource[r.source] = (bySource[r.source] || 0) + r.amount;
  }

  return {
    period: `Last ${daysBack} days`,
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
    margin: totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue * 100).toFixed(1) + '%' : 'N/A',
    expensesByCategory: byCategory,
    revenueBySource: bySource,
  };
}

/**
 * Format P&L for Telegram display.
 */
function formatPnL(daysBack = 7) {
  const pnl = getPnL(daysBack);

  let msg = `P&L Report (${pnl.period})\n\n`;
  msg += `Revenue: $${pnl.totalRevenue.toLocaleString()}\n`;
  msg += `Expenses: $${pnl.totalExpenses.toLocaleString()}\n`;
  msg += `Net Profit: $${pnl.netProfit.toLocaleString()}\n`;
  msg += `Margin: ${pnl.margin}\n`;

  const cats = Object.keys(pnl.expensesByCategory);
  if (cats.length > 0) {
    msg += '\nExpenses breakdown:\n';
    cats.sort((a, b) => pnl.expensesByCategory[b] - pnl.expensesByCategory[a]);
    for (const cat of cats) {
      msg += `  ${cat}: $${pnl.expensesByCategory[cat].toLocaleString()}\n`;
    }
  }

  const sources = Object.keys(pnl.revenueBySource);
  if (sources.length > 0) {
    msg += '\nRevenue breakdown:\n';
    sources.sort((a, b) => pnl.revenueBySource[b] - pnl.revenueBySource[a]);
    for (const src of sources) {
      msg += `  ${src}: $${pnl.revenueBySource[src].toLocaleString()}\n`;
    }
  }

  return msg;
}

module.exports = {
  addExpense,
  addRevenue,
  getPnL,
  formatPnL,
  EXPENSE_CATEGORIES,
};
