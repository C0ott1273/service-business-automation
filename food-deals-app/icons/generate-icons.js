/**
 * One-off icon generator. Requires `playwright` in scope.
 * Run from the food-deals-app/ directory:
 *     NODE_PATH=$(npm root -g) node icons/generate-icons.js
 */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const svg = fs.readFileSync(path.join(__dirname, "favicon.svg"), "utf8");

async function run() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1024, height: 1024 } });
  for (const size of [192, 512]) {
    const page = await context.newPage();
    await page.setContent(`<!doctype html><html><body style="margin:0">
      <div style="width:${size}px;height:${size}px">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</div>
    </body></html>`);
    const el = await page.$("div");
    const out = path.join(__dirname, `icon-${size}.png`);
    await el.screenshot({ path: out, omitBackground: false });
    console.log("wrote", out);
    await page.close();
  }
  await browser.close();
}

run().catch((e) => { console.error(e); process.exit(1); });
