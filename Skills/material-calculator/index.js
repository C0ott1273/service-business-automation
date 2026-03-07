/**
 * material-calculator — Pool fence materials estimator
 *
 * Input: linear footage, number of gates, surface type
 * Output: materials list, estimated cost, profit margin
 *
 * Pricing is configurable via environment variables or defaults.
 * Update DEFAULT_PRICING with your actual dealer costs.
 */

const DEFAULT_PRICING = {
  // Cost per linear foot (your dealer cost)
  meshPerFoot: parseFloat(process.env.MESH_COST_PER_FOOT) || 18.00,
  // Retail price per linear foot (what you charge)
  meshRetailPerFoot: parseFloat(process.env.MESH_RETAIL_PER_FOOT) || 32.00,
  // Self-closing gate cost
  gateCost: parseFloat(process.env.GATE_COST) || 175.00,
  gateRetail: parseFloat(process.env.GATE_RETAIL) || 350.00,
  // Deck sleeve / anchor (per post)
  sleeveCost: parseFloat(process.env.SLEEVE_COST) || 3.50,
  sleeveRetail: parseFloat(process.env.SLEEVE_RETAIL) || 8.00,
  // Posts are typically every 30 inches (2.5 feet)
  postSpacingFeet: 2.5,
  // Labor per foot (your install cost)
  laborPerFoot: parseFloat(process.env.LABOR_PER_FOOT) || 5.00,
};

/**
 * Calculate materials needed for a pool fence job.
 *
 * @param {Object} params
 * @param {number} params.footage - Linear feet of fence needed
 * @param {number} [params.gates=1] - Number of self-closing gates
 * @param {string} [params.surface='concrete'] - Surface type: concrete, pavers, wood_deck, dirt
 * @param {Object} [params.pricing] - Override default pricing
 * @returns {Object} Materials breakdown with costs and profit
 */
function calculateMaterials(params) {
  const {
    footage,
    gates = 1,
    surface = 'concrete',
    pricing = DEFAULT_PRICING,
  } = params;

  if (!footage || footage <= 0) {
    return { success: false, error: 'Footage must be greater than 0' };
  }

  // Calculate posts needed (one every 2.5 feet + 1 for the end)
  const posts = Math.ceil(footage / pricing.postSpacingFeet) + 1;

  // Sleeves needed = posts (each post needs a sleeve/anchor)
  const sleeves = posts;

  // Surface type affects install time and may need special anchors
  const surfaceMultiplier = {
    concrete: 1.0,
    pavers: 1.2,     // slightly more work
    wood_deck: 1.3,  // deck sleeves, more careful drilling
    dirt: 0.8,       // easier install
  };
  const multiplier = surfaceMultiplier[surface] || 1.0;

  // Costs
  const meshCost = footage * pricing.meshPerFoot;
  const meshRetail = footage * pricing.meshRetailPerFoot;
  const gateCostTotal = gates * pricing.gateCost;
  const gateRetailTotal = gates * pricing.gateRetail;
  const sleeveCostTotal = sleeves * pricing.sleeveCost;
  const sleeveRetailTotal = sleeves * pricing.sleeveRetail;
  const laborCost = footage * pricing.laborPerFoot * multiplier;

  const totalCost = meshCost + gateCostTotal + sleeveCostTotal + laborCost;
  const totalRetail = meshRetail + gateRetailTotal + sleeveRetailTotal;
  const profit = totalRetail - totalCost;
  const margin = totalRetail > 0 ? ((profit / totalRetail) * 100).toFixed(1) : 0;

  return {
    success: true,
    input: { footage, gates, surface },
    materials: {
      meshFence: { qty: `${footage} linear ft`, unitCost: pricing.meshPerFoot, total: meshCost },
      selfClosingGates: { qty: gates, unitCost: pricing.gateCost, total: gateCostTotal },
      deckSleeves: { qty: sleeves, unitCost: pricing.sleeveCost, total: sleeveCostTotal },
      posts: { qty: posts, note: `1 every ${pricing.postSpacingFeet}ft` },
    },
    costs: {
      materialsCost: round(meshCost + gateCostTotal + sleeveCostTotal),
      laborCost: round(laborCost),
      totalCost: round(totalCost),
      retailPrice: round(totalRetail),
      profit: round(profit),
      margin: `${margin}%`,
    },
  };
}

/**
 * Format materials calculation for Telegram display.
 */
function formatEstimate(result) {
  if (!result.success) return `Error: ${result.error}`;

  const m = result.materials;
  const c = result.costs;

  return (
    `Pool Fence Estimate\n\n` +
    `Specs: ${result.input.footage}ft | ${result.input.gates} gate(s) | ${result.input.surface}\n\n` +
    `Materials:\n` +
    `  Mesh fence: ${m.meshFence.qty}\n` +
    `  Gates: ${m.selfClosingGates.qty}\n` +
    `  Sleeves/anchors: ${m.deckSleeves.qty}\n` +
    `  Posts: ${m.posts.qty} (${m.posts.note})\n\n` +
    `Your Cost: $${c.totalCost}\n` +
    `  Materials: $${c.materialsCost}\n` +
    `  Labor: $${c.laborCost}\n\n` +
    `Retail Price: $${c.retailPrice}\n` +
    `Profit: $${c.profit} (${c.margin} margin)`
  );
}

function round(n) {
  return Math.round(n * 100) / 100;
}

module.exports = { calculateMaterials, formatEstimate, DEFAULT_PRICING };
