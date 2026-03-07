/**
 * landing-page-generator — SEO-optimized landing pages per service area
 *
 * Generates static HTML landing pages targeting "[service] + [city]" keywords.
 * Each page includes: hero, trust signals, CTA, FAQ, schema markup.
 * Output: ready-to-deploy HTML files.
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.resolve(__dirname, 'pages');

const COMPANY = {
  name: process.env.COMPANY_NAME || 'Protect A Child Pool Fence',
  phone: process.env.COMPANY_PHONE || '(555) 000-0000',
  email: process.env.COMPANY_EMAIL || 'info@protectachild.com',
  website: process.env.COMPANY_WEBSITE || 'https://protectachild.com',
  bookingUrl: process.env.BOOKING_URL || '#contact',
  reviewLink: process.env.REVIEW_LINK || '#reviews',
  territory: process.env.SERVICE_TERRITORY || 'Central Florida',
};

/**
 * Generate a landing page for a specific city/area.
 */
function generateLandingPage(params) {
  const {
    city,
    state = 'FL',
    areaDescription = '',
    targetKeywords = [],
    testimonials = [],
  } = params;

  const slug = city.toLowerCase().replace(/\s+/g, '-');
  const title = `Pool Fence Installation in ${city}, ${state} | ${COMPANY.name}`;
  const primaryKeyword = `pool fence installation ${city} ${state}`.toLowerCase();
  const keywords = [
    primaryKeyword,
    `pool safety fence ${city}`,
    `child pool fence ${city}`,
    `removable pool fence ${city}`,
    `pool barrier ${city}`,
    `pool fence cost ${city}`,
    ...targetKeywords,
  ];

  const faqItems = [
    {
      q: `How much does a pool fence cost in ${city}?`,
      a: `Pool fence pricing in ${city} typically ranges from $15-$25 per linear foot installed. The total cost depends on your pool's perimeter, number of gates needed, and surface type (concrete, pavers, or wood deck). We offer free on-site estimates — call us or book online!`,
    },
    {
      q: `Is a pool fence required by law in ${city}, ${state}?`,
      a: `Yes. Florida law requires a barrier around all residential swimming pools. A mesh pool safety fence is one of the most affordable and effective ways to comply. Our fences meet all ${state} building codes and safety standards.`,
    },
    {
      q: `How long does pool fence installation take?`,
      a: `Most installations are completed in 2-4 hours. We drill anchors into your deck, install the mesh panels, and add self-closing gates. The fence is removable — you can take it down for pool parties and put it back up in minutes.`,
    },
    {
      q: `Can I remove the pool fence when I want?`,
      a: `Absolutely! Our mesh pool fences are designed to be easily removable. Each section lifts out of the deck anchors in seconds. When it's down, all you see are small flush-mount caps on your deck.`,
    },
    {
      q: `Do you serve ${city} and surrounding areas?`,
      a: `Yes! We serve ${city} and all of ${COMPANY.territory}. We provide free estimates and can usually schedule your installation within 1-2 weeks.`,
    },
  ];

  const schemaMarkup = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: COMPANY.name,
    description: `Professional pool fence installation in ${city}, ${state}. Removable mesh pool safety fences to protect children and pets.`,
    telephone: COMPANY.phone,
    email: COMPANY.email,
    url: COMPANY.website,
    areaServed: { '@type': 'City', name: city },
    priceRange: '$$',
    serviceType: 'Pool Fence Installation',
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  };

  const testimonialsHtml = testimonials.length > 0
    ? testimonials.map((t) => `
      <div class="testimonial">
        <p>"${t.text}"</p>
        <cite>— ${t.name}, ${city}</cite>
      </div>`).join('\n')
    : `<div class="testimonial">
        <p>"Best decision we made for our family's safety. Professional installation, great price, and our kids are protected."</p>
        <cite>— Satisfied Customer, ${city}</cite>
      </div>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="Professional pool fence installation in ${city}, ${state}. Protect your children with a removable mesh pool safety fence. Free estimates. Same-week installation.">
  <meta name="keywords" content="${keywords.join(', ')}">
  <link rel="canonical" href="${COMPANY.website}/pool-fence-${slug}">
  <script type="application/ld+json">${JSON.stringify(schemaMarkup)}</script>
  <script type="application/ld+json">${JSON.stringify(faqSchema)}</script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; line-height: 1.6; }
    .hero { background: linear-gradient(135deg, #0066cc 0%, #004499 100%); color: white; padding: 80px 20px; text-align: center; }
    .hero h1 { font-size: 2.5rem; margin-bottom: 16px; }
    .hero p { font-size: 1.25rem; opacity: 0.9; max-width: 600px; margin: 0 auto 32px; }
    .cta-btn { display: inline-block; background: #ff6600; color: white; padding: 16px 40px; font-size: 1.1rem; font-weight: 700; border-radius: 8px; text-decoration: none; margin: 8px; }
    .cta-btn:hover { background: #e55b00; }
    .cta-btn.secondary { background: transparent; border: 2px solid white; }
    .section { padding: 60px 20px; max-width: 900px; margin: 0 auto; }
    .section h2 { font-size: 1.8rem; margin-bottom: 24px; color: #0066cc; }
    .trust-bar { background: #f5f5f5; padding: 24px 20px; text-align: center; font-size: 1.1rem; }
    .trust-bar span { margin: 0 24px; font-weight: 600; }
    .benefits { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; margin: 32px 0; }
    .benefit { background: #f8f9fa; padding: 24px; border-radius: 8px; border-left: 4px solid #0066cc; }
    .benefit h3 { margin-bottom: 8px; }
    .faq-item { border-bottom: 1px solid #eee; padding: 20px 0; }
    .faq-item h3 { font-size: 1.1rem; cursor: pointer; }
    .faq-item p { margin-top: 8px; color: #555; }
    .testimonial { background: #f8f9fa; padding: 24px; border-radius: 8px; margin: 16px 0; font-style: italic; }
    .testimonial cite { display: block; margin-top: 12px; font-style: normal; font-weight: 600; color: #0066cc; }
    .cta-section { background: #0066cc; color: white; padding: 60px 20px; text-align: center; }
    .cta-section h2 { color: white; }
    footer { background: #1a1a1a; color: #ccc; padding: 40px 20px; text-align: center; }
    footer a { color: #ff6600; }
    .targets { background: #fff3e6; padding: 40px 20px; }
    .target-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; max-width: 900px; margin: 0 auto; }
    .target-card { background: white; padding: 24px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .target-card h3 { color: #0066cc; margin-bottom: 8px; }
  </style>
</head>
<body>

  <div class="hero">
    <h1>Pool Fence Installation in ${city}, ${state}</h1>
    <p>Protect your children and pets with a professional removable mesh pool safety fence. Free estimates. Most installs completed the same day.</p>
    <a href="${COMPANY.bookingUrl}" class="cta-btn">Get a Free Estimate</a>
    <a href="tel:${COMPANY.phone.replace(/[^\d+]/g, '')}" class="cta-btn secondary">Call ${COMPANY.phone}</a>
  </div>

  <div class="trust-bar">
    <span>Licensed & Insured</span>
    <span>5-Star Rated</span>
    <span>Same-Day Install Available</span>
    <span>Free Estimates</span>
  </div>

  <div class="section">
    <h2>Why ${city} Homeowners Choose Us</h2>
    ${areaDescription ? `<p>${areaDescription}</p>` : `<p>${city} families trust us to keep their pools safe. As an authorized Protect A Child dealer, we install the highest-quality removable mesh pool fences available — built to meet Florida safety codes and designed to blend seamlessly with your outdoor space.</p>`}

    <div class="benefits">
      <div class="benefit">
        <h3>Same-Day Installation</h3>
        <p>Most pool fences are installed in 2-4 hours. We come to you, measure, drill, and install — all in one visit.</p>
      </div>
      <div class="benefit">
        <h3>Removable Design</h3>
        <p>Easily remove sections for pool parties. Flush-mount deck anchors are nearly invisible when the fence is down.</p>
      </div>
      <div class="benefit">
        <h3>Meets Florida Code</h3>
        <p>Every installation meets or exceeds Florida's pool barrier safety requirements. Protect your family and stay compliant.</p>
      </div>
      <div class="benefit">
        <h3>Self-Closing Gates</h3>
        <p>Our gates close and latch automatically — the #1 safety feature recommended by the CDC for pool drowning prevention.</p>
      </div>
    </div>
  </div>

  <div class="targets">
    <div class="target-cards">
      <div class="target-card">
        <h3>For Homeowners</h3>
        <p>New pool? New baby? Moving into a home with a pool? A mesh safety fence is the most affordable way to protect your family. We offer free on-site estimates and flexible scheduling.</p>
      </div>
      <div class="target-card">
        <h3>For Pool Builders</h3>
        <p>Partner with us to offer pool fencing as part of your build packages. We provide dealer-direct pricing, white-label installs, and same-week turnaround. Your clients get safety, you get a revenue add-on.</p>
      </div>
      <div class="target-card">
        <h3>For Rental Properties</h3>
        <p>Landlords and property managers: Florida law requires pool barriers on rental properties. We offer multi-property discounts and can fence multiple properties in one visit. Protect your tenants and your liability.</p>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>What Customers Say</h2>
    ${testimonialsHtml}
  </div>

  <div class="section">
    <h2>Frequently Asked Questions</h2>
    ${faqItems.map((faq) => `
    <div class="faq-item">
      <h3>${faq.q}</h3>
      <p>${faq.a}</p>
    </div>`).join('')}
  </div>

  <div class="cta-section">
    <h2>Ready to Protect Your Pool?</h2>
    <p style="margin: 16px auto 32px; max-width: 500px; opacity: 0.9;">Get a free, no-obligation estimate. Most installations are completed the same day you book.</p>
    <a href="${COMPANY.bookingUrl}" class="cta-btn">Schedule Free Estimate</a>
    <a href="tel:${COMPANY.phone.replace(/[^\d+]/g, '')}" class="cta-btn secondary">Call ${COMPANY.phone}</a>
  </div>

  <footer>
    <p>${COMPANY.name} — Serving ${city}, ${state} and ${COMPANY.territory}</p>
    <p style="margin-top: 8px;"><a href="tel:${COMPANY.phone.replace(/[^\d+]/g, '')}">${COMPANY.phone}</a> | <a href="mailto:${COMPANY.email}">${COMPANY.email}</a></p>
    <p style="margin-top: 16px; font-size: 0.85rem; opacity: 0.6;">&copy; ${new Date().getFullYear()} ${COMPANY.name}. All rights reserved.</p>
  </footer>

</body>
</html>`;

  return { slug, title, html, keywords, city, state };
}

/**
 * Generate and save a landing page to disk.
 */
function saveLandingPage(params) {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const page = generateLandingPage(params);
  const filePath = path.join(OUTPUT_DIR, `pool-fence-${page.slug}.html`);
  fs.writeFileSync(filePath, page.html);

  return {
    success: true,
    file: filePath,
    slug: page.slug,
    title: page.title,
    keywords: page.keywords,
    message: `Landing page created: pool-fence-${page.slug}.html`,
  };
}

/**
 * Batch generate pages for multiple cities.
 */
function generateBatch(cities, state = 'FL') {
  const results = [];
  for (const city of cities) {
    const result = saveLandingPage({ city, state });
    results.push(result);
  }
  return {
    success: true,
    count: results.length,
    pages: results.map((r) => r.slug),
    message: `Generated ${results.length} landing pages.`,
  };
}

module.exports = { generateLandingPage, saveLandingPage, generateBatch, COMPANY };
