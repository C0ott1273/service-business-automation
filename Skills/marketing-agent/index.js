/**
 * marketing-agent — Pool Fence Niche Marketing Expert
 *
 * Deep domain expertise in:
 * - Protect A Child mesh pool fencing products
 * - Pool builder partnerships
 * - Rental property compliance marketing
 * - Local SEO and Google Ads for pool fencing
 * - Social media content for pool safety
 *
 * Generates ad copy, social posts, partnership outreach,
 * email campaigns, and strategic marketing plans.
 */

const fs = require('fs');
const path = require('path');

// =====================
// PRODUCT KNOWLEDGE BASE
// =====================

const PRODUCT_KNOWLEDGE = {
  brand: 'Protect A Child',
  tagline: 'The #1 Removable Pool Safety Fence',
  products: {
    meshFence: {
      name: 'Removable Mesh Pool Safety Fence',
      features: [
        'Transparent mesh panels — see your pool at all times',
        'Removable in seconds — lift out of deck anchors',
        'Self-closing, self-latching gates',
        'Climb-resistant design (no footholds)',
        'UV-resistant, all-weather mesh material',
        'Flush-mount deck anchors — nearly invisible when fence is down',
        'Available in black, brown, and green mesh',
        'Custom-fit to any pool shape',
      ],
      specs: {
        height: '4 feet (48 inches) — meets code requirements',
        postSpacing: '30 inches apart',
        meshOpening: 'Less than 1.75 inches (child cannot fit through)',
        material: 'Vinyl-coated polyester mesh with aluminum poles',
        warranty: 'Limited lifetime warranty on mesh and hardware',
      },
      installTime: '2-4 hours for typical residential pool',
      priceRange: '$15-$25 per linear foot installed (varies by market)',
    },
    gate: {
      name: 'Self-Closing Pool Fence Gate',
      features: [
        'Closes and latches automatically from any position',
        'Opens outward (away from pool)',
        'Key-lockable latch option',
        'Same mesh material as fence panels',
        'Meets ASTM F1346 safety standards',
      ],
    },
    accessories: [
      'Deck sleeves (concrete, pavers, wood)',
      'Replacement poles',
      'Replacement mesh panels',
      'Gate lock kits',
      'Winter covers',
    ],
  },
  safetyStats: {
    drowningStats: 'Drowning is the #1 cause of death for children ages 1-4 (CDC)',
    fenceEffectiveness: 'Pool fencing reduces drowning risk by 83% (Pediatrics journal)',
    windowOfDanger: '69% of child drownings occur during non-swim times — when kids access the pool unsupervised',
    responseTime: 'A child can drown in as little as 20 seconds — silently',
  },
  regulations: {
    florida: {
      requirement: 'All residential pools must have a barrier at least 48 inches high',
      code: 'Florida Building Code Section 454.2.17',
      penalty: 'Fines + liability exposure if a child is injured',
      rentalExtra: 'Rental property owners have additional liability — landlord can be held responsible',
    },
  },
  competitiveAdvantages: [
    'Protect A Child is the original mesh pool fence — trusted since 1992',
    'Dealer-backed warranty and support',
    'Professional installation (not DIY)',
    'Meets all building codes and ASTM safety standards',
    'Transparent mesh maintains pool aesthetics',
    'Removable design — not permanent like aluminum fencing',
    'More affordable than glass or aluminum fencing',
  ],
};

// =====================
// TARGET AUDIENCE PROFILES
// =====================

const AUDIENCES = {
  homeowners: {
    name: 'Homeowners with Pools',
    painPoints: [
      'Worry about child safety around the pool',
      'New baby or toddler in the home',
      'Just bought a house with a pool',
      'Need to comply with local building codes',
      'Want something that looks good and is removable',
    ],
    triggers: [
      'New pool construction',
      'New baby/grandchild',
      'Moving to a home with a pool',
      'Insurance requirement',
      'Neighbor had a close call',
      'Failed home inspection',
    ],
    messaging: {
      emotional: 'Every parent deserves peace of mind. A pool fence gives you that.',
      logical: '83% reduction in drowning risk. Installs in one day. Removable when you want.',
      urgency: "Every day without a fence is a day your child is at risk. Don't wait for an accident.",
    },
  },
  poolBuilders: {
    name: 'Pool Builders & Contractors',
    painPoints: [
      'Clients ask about fencing — they have no partner to refer',
      'Want to offer complete pool packages',
      'Liability concerns if they build a pool without recommending a barrier',
      'Need reliable subcontractor for fencing',
    ],
    partnership: {
      valueProposition: 'Add $2,000-$5,000 revenue per pool build with zero extra work',
      model: 'We install, you upsell. Dealer pricing available for volume partners.',
      benefits: [
        'Revenue add-on for every pool you build',
        'Reduce your liability — you recommended the safety barrier',
        'Same-week turnaround — we work around your schedule',
        'White-label option — we install under your company name',
        'Volume discounts for 5+ referrals per month',
      ],
    },
    outreach: {
      emailSubject: 'Partnership opportunity: pool fencing for your builds',
      coldEmail: (builderName) => `Hi ${builderName},

I run Protect A Child Pool Fence in the area and wanted to reach out about a potential partnership.

Many of our customers mention they wish their pool builder had offered fencing as part of the build. We'd love to be your go-to pool fence partner — here's what that looks like:

- You recommend us to your clients (or include fencing in your package)
- We handle everything: measure, install, warranty
- You earn a referral fee on every install ($100-$200 per job)
- Your clients get professional safety fencing from day one

We install in 2-4 hours and work around your construction schedule. Happy to meet up and discuss — coffee's on me.

Best,
[Your Name]
Protect A Child Pool Fence
[Phone]`,
    },
  },
  rentalProperties: {
    name: 'Rental Property Owners & Managers',
    painPoints: [
      'Florida law requires pool barriers on ALL pools — including rentals',
      'Liability if a tenant or guest child is injured',
      'Insurance may not cover incidents without proper barrier',
      'Need low-maintenance solution for investment properties',
      'Multiple properties = multiple fences needed',
    ],
    messaging: {
      fear: 'If a child drowns in your rental pool without a fence, you could face criminal charges and a wrongful death lawsuit.',
      compliance: 'Florida code requires pool barriers on all residential pools — including rentals. Are you in compliance?',
      roi: 'A pool fence costs less than one month of insurance premium increase. Protect your tenants AND your investment.',
    },
    outreach: {
      emailSubject: 'Is your rental pool code-compliant? (Florida requires a barrier)',
      coldEmail: (managerName) => `Hi ${managerName},

Quick question — do all of your rental properties with pools have a barrier installed?

Florida building code requires a pool barrier on all residential swimming pools, including rental properties. Without one, you're exposed to:
- Fines from code enforcement
- Insurance claims denied for lack of safety compliance
- Personal liability if a tenant or guest child is injured

We specialize in removable mesh pool fences for rental properties. Multi-property discounts available — most installs are done in one visit.

Happy to do a quick assessment of your properties. Free, no obligation.

Best,
[Your Name]
Protect A Child Pool Fence
[Phone]`,
    },
  },
};

// =====================
// CONTENT GENERATORS
// =====================

/**
 * Generate Google Ads copy variations.
 */
function generateGoogleAds(city, state = 'FL') {
  return {
    searchAds: [
      {
        headline1: `Pool Fence Install ${city}`,
        headline2: 'Free Estimates - Same Day',
        headline3: 'Licensed & 5-Star Rated',
        description1: `Professional pool fence installation in ${city}. Removable mesh safety fences. Protect your children. Free estimates.`,
        description2: `Most installs done same day. Meets FL code. Removable design. Call now for a free quote!`,
      },
      {
        headline1: `Child Pool Safety Fence`,
        headline2: `${city} - Free Estimate`,
        headline3: '#1 Rated Pool Fence Co.',
        description1: `Drowning is the #1 cause of death for kids 1-4. A pool fence reduces risk 83%. Get a free estimate today.`,
        description2: `Protect A Child mesh fences. Removable, code-compliant, installed in hours. Serving ${city} & surrounding areas.`,
      },
      {
        headline1: `Pool Fence - $15/ft`,
        headline2: `${city} Installation`,
        headline3: 'Book Free Estimate Today',
        description1: `Affordable pool safety fencing starting at $15/ft installed. Self-closing gates. Removable design. Free on-site estimates.`,
        description2: `Trusted by 1000s of families. Same-day installation available. Call or book online. ${city}, ${state}.`,
      },
    ],
    keywords: [
      `pool fence installation ${city}`,
      `pool safety fence ${city}`,
      `child pool fence near me`,
      `removable pool fence ${city}`,
      `pool barrier installation`,
      `pool fence cost ${city}`,
      `mesh pool fence ${city}`,
      `pool fence company near me`,
      `baby pool fence`,
      `pool fence ${state}`,
    ],
    negativeKeywords: [
      'aluminum fence',
      'wrought iron fence',
      'vinyl fence',
      'privacy fence',
      'dog fence',
      'DIY pool fence',
      'pool fence repair',
    ],
  };
}

/**
 * Generate Facebook/Instagram ad copy.
 */
function generateSocialAds(city) {
  return [
    {
      type: 'safety_emotional',
      headline: 'Every Parent Deserves Peace of Mind',
      body: `Drowning is the #1 cause of death for children ages 1-4. A pool fence reduces that risk by 83%.\n\nOur removable mesh pool fences install in hours, meet all Florida safety codes, and blend beautifully with your pool area.\n\nFree estimates in ${city}. Book today.`,
      cta: 'Get Free Estimate',
      image_suggestion: 'Before/after of pool with fence, happy family in background',
    },
    {
      type: 'before_after',
      headline: 'See the Difference a Pool Fence Makes',
      body: `Left: An unprotected pool — an accident waiting to happen.\nRight: A Protect A Child mesh fence — peace of mind in minutes.\n\nInstalls in 2-4 hours. Removable when you want. Starting at $15/ft.\n\nServing ${city} families. Free estimates.`,
      cta: 'Book Free Estimate',
      image_suggestion: 'Side-by-side before/after photos of a real install',
    },
    {
      type: 'rental_targeted',
      headline: 'Rental Property Owners: Is Your Pool Legal?',
      body: `Florida law requires a pool barrier on ALL residential pools — including rentals.\n\nNo barrier = fines + massive liability exposure.\n\nWe offer multi-property discounts for landlords and property managers. Most installs done same day.\n\nProtect your tenants. Protect your investment.`,
      cta: 'Get Compliant Today',
      image_suggestion: 'Professional fence around a pool at a clean rental property',
      targeting: 'Real estate investors, property managers, landlords in target area',
    },
    {
      type: 'pool_builder_partnership',
      headline: 'Pool Builders: Add $3K Revenue Per Build',
      body: `Your clients need a pool fence — why not offer it?\n\nPartner with Protect A Child:\n- We install, you upsell\n- Same-week turnaround\n- Referral fees on every job\n- White-label option available\n\nLet's chat. DM or call.`,
      cta: 'Learn More',
      image_suggestion: 'New pool build with fence being installed',
      targeting: 'Pool contractors, pool builders, pool construction companies',
    },
  ];
}

/**
 * Generate weekly social media content calendar.
 */
function generateWeeklyContent() {
  const days = [
    {
      day: 'Monday',
      type: 'Safety Tip',
      content: 'Did you know? 69% of child drownings happen during non-swim times — when kids access the pool unsupervised. A pool fence is your first line of defense. #PoolSafety #ProtectAChild',
    },
    {
      day: 'Tuesday',
      type: 'Before/After',
      content: 'Another beautiful install completed! This family can now enjoy their pool with total peace of mind. Swipe to see the transformation. Free estimates — link in bio. #PoolFence #BeforeAndAfter',
    },
    {
      day: 'Wednesday',
      type: 'Educational',
      content: "Florida law requires a pool barrier on ALL residential pools. Our removable mesh fences meet code, look great, and install in hours. Don't risk fines or worse — get compliant today. #FloridaPoolLaw",
    },
    {
      day: 'Thursday',
      type: 'Testimonial',
      content: '"Best investment we made. The fence is practically invisible and our 2-year-old is safe." Share your story! Tag us in your pool fence photos for a chance to be featured. #CustomerLove',
    },
    {
      day: 'Friday',
      type: 'FAQ',
      content: "Q: Can I remove the fence for parties?\nA: Absolutely! Each section lifts out in seconds. When it's down, all you see are small flush caps on your deck. Easy on, easy off. #PoolFenceFAQ",
    },
    {
      day: 'Saturday',
      type: 'Promo/CTA',
      content: 'Weekend installs available! Book your free estimate today and we can have your fence installed by next weekend. Link in bio or call us. #FreeEstimate #PoolSafety',
    },
  ];

  return {
    week: `Week of ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`,
    posts: days,
  };
}

/**
 * Generate Google Business Profile post.
 */
function generateGBPPost(type = 'general') {
  const posts = {
    general: {
      title: 'Free Pool Fence Estimates',
      body: 'Protect your family with a professional removable mesh pool fence. Same-day installation available. Meets all Florida safety codes. Call or book online for a free estimate!',
      cta: 'Book online',
    },
    safety: {
      title: 'Pool Safety Alert',
      body: 'Drowning is the #1 cause of death for children ages 1-4. A pool fence reduces risk by 83%. If you have a pool and children or grandchildren visit, a fence is essential. Free estimates available.',
      cta: 'Learn more',
    },
    rental: {
      title: 'Attention Rental Property Owners',
      body: 'Florida requires pool barriers on ALL residential pools — including rentals. Non-compliance means fines and liability. We offer multi-property discounts. Get compliant today.',
      cta: 'Call now',
    },
    seasonal: {
      title: 'Pool Season is Coming',
      body: "Don't wait until summer to protect your pool. Book your fence installation now and beat the rush. Free estimates, same-week install available.",
      cta: 'Book online',
    },
  };

  return posts[type] || posts.general;
}

/**
 * Generate partner outreach email for pool builders.
 */
function generatePartnerOutreach(builderName, companyName) {
  return AUDIENCES.poolBuilders.outreach.coldEmail(builderName || 'there');
}

/**
 * Generate rental property outreach.
 */
function generateRentalOutreach(managerName) {
  return AUDIENCES.rentalProperties.outreach.coldEmail(managerName || 'there');
}

/**
 * Get full marketing strategy summary.
 */
function getMarketingStrategy() {
  return {
    audiences: Object.keys(AUDIENCES).map((key) => ({
      name: AUDIENCES[key].name,
      painPoints: AUDIENCES[key].painPoints,
    })),
    channels: [
      { name: 'Google Ads', priority: 'HIGH', budget: '$500-$1500/mo', expected_leads: '20-60/mo' },
      { name: 'Facebook/Instagram', priority: 'HIGH', budget: '$300-$800/mo', expected_leads: '10-30/mo' },
      { name: 'Google Business Profile', priority: 'HIGH', budget: 'Free', expected_leads: '5-15/mo' },
      { name: 'Nextdoor', priority: 'MEDIUM', budget: '$100-$300/mo', expected_leads: '5-10/mo' },
      { name: 'Pool Builder Partnerships', priority: 'HIGH', budget: '$100-$200 referral fee', expected_leads: '3-8/mo' },
      { name: 'Rental Property Outreach', priority: 'MEDIUM', budget: 'Time only', expected_leads: '2-5/mo' },
      { name: 'Referral Program', priority: 'HIGH', budget: '$50/referral', expected_leads: '3-8/mo' },
    ],
    monthlyTargets: {
      month1: { leads: 30, jobs: 10, revenue: 25000 },
      month3: { leads: 60, jobs: 20, revenue: 50000 },
      month6: { leads: 100, jobs: 30, revenue: 75000 },
    },
  };
}

/**
 * Format marketing summary for Telegram.
 */
function formatMarketingSummary() {
  const strategy = getMarketingStrategy();
  const channels = strategy.channels
    .map((c) => `  ${c.priority === 'HIGH' ? '[!]' : '[ ]'} ${c.name}: ${c.budget} → ${c.expected_leads}`)
    .join('\n');

  return (
    `Marketing Agent — Strategy Summary\n\n` +
    `Target Audiences:\n` +
    `  1. Homeowners with pools\n` +
    `  2. Pool builders (partnerships)\n` +
    `  3. Rental property owners\n\n` +
    `Channels (by priority):\n${channels}\n\n` +
    `Monthly Targets:\n` +
    `  Month 1: ${strategy.monthlyTargets.month1.leads} leads → ${strategy.monthlyTargets.month1.jobs} jobs → $${strategy.monthlyTargets.month1.revenue.toLocaleString()}\n` +
    `  Month 3: ${strategy.monthlyTargets.month3.leads} leads → ${strategy.monthlyTargets.month3.jobs} jobs → $${strategy.monthlyTargets.month3.revenue.toLocaleString()}\n` +
    `  Month 6: ${strategy.monthlyTargets.month6.leads} leads → ${strategy.monthlyTargets.month6.jobs} jobs → $${strategy.monthlyTargets.month6.revenue.toLocaleString()}\n\n` +
    `Commands:\n` +
    `  "Generate ads for [city]"\n` +
    `  "Social media calendar"\n` +
    `  "Pool builder outreach for [name]"\n` +
    `  "Rental outreach for [name]"`
  );
}

/**
 * Generate retargeting ad copy — reminder, urgency, and social proof variants.
 */
function generateRetargetingAds(city = 'Palm Beach County') {
  return [
    {
      type: 'reminder',
      headline: `Still Thinking About Pool Safety in ${city}?`,
      description: `Your pool fence estimate is waiting. Florida law requires a barrier around all residential pools. Get compliant — schedule your free estimate today.`,
    },
    {
      type: 'urgency',
      headline: `Don't Wait — Pool Season Is Here, ${city}`,
      description: `Every day without a fence is a risk. We install in as little as 1 day. Limited spots this month — book your free estimate now.`,
    },
    {
      type: 'social_proof',
      headline: `Trusted by ${city} Families for Pool Safety`,
      description: `Hundreds of families in ${city} trust Protect A Child pool fencing. See why — 5-star rated, lifetime warranty, same-day estimates. Get yours free today.`,
    },
  ];
}

module.exports = {
  PRODUCT_KNOWLEDGE,
  AUDIENCES,
  generateGoogleAds,
  generateSocialAds,
  generateWeeklyContent,
  generateGBPPost,
  generatePartnerOutreach,
  generateRentalOutreach,
  generateRetargetingAds,
  getMarketingStrategy,
  formatMarketingSummary,
};
