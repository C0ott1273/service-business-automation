# Crumb — Local Food Deals

A brutalist / editorial PWA for discovering food deals near you. Pure static — HTML, CSS, vanilla JS. No build step. Deploys to Netlify in one step and installs to your home screen.

## Features

- 18 curated Tampa / St. Petersburg food deals (mock data)
- Browser geolocation + live distance sort via the Haversine formula
- Chip and toggle filters (cuisine, open now, under $10, happy hour)
- Distance slider (0.5 – 25 mi) + sort by distance / % off / price
- Installable PWA — manifest + service worker, works offline after first load
- No accounts, no tracking, no backend

## Run locally

```bash
cd food-deals-app
npx serve .         # or: python3 -m http.server 8080
```

Then open `http://localhost:3000` (or the port `serve` prints). The service worker requires HTTPS or localhost — don't open `index.html` via `file://` or geolocation and the install prompt will misbehave.

## Deploy to Netlify

### Option A — Drag-and-drop (fastest)

1. Zip the contents of this folder (not the folder itself).
2. Open [app.netlify.com/drop](https://app.netlify.com/drop).
3. Drop the zip. You'll get a live URL in ~10 seconds.

### Option B — Git integration

1. Netlify dashboard → **Add new site** → **Import an existing project** → pick this repo.
2. In the site settings:
   - **Base directory:** `food-deals-app`
   - **Publish directory:** `food-deals-app`
   - **Build command:** *(leave blank)*
3. Deploy.

## Install on your phone

1. Open the Netlify URL in Chrome (Android) or Safari (iOS).
2. Tap the browser menu → **Add to Home Screen** (iOS) or **Install app** (Android).
3. The app launches full-screen from your home screen icon, works offline, and prompts for location on first launch.

On desktop Chrome/Edge, an install button appears in the masthead when the browser decides the site is installable.

## Edit the deals

Deals live in `deals.json`. Each record:

```json
{
  "id": "d01",
  "restaurant": "The Library Bar",
  "deal": "$6 smash burgers + $4 house wine on tap",
  "cuisine": "American",
  "originalPrice": 17,
  "dealPrice": 6,
  "tags": ["happy-hour", "under-10"],
  "days": ["mon","tue","wed","thu","fri"],
  "startTime": "16:00",
  "endTime": "19:00",
  "lat": 27.9506,
  "lng": -82.4572,
  "address": "1330 9th Ave, Tampa, FL 33605"
}
```

Bump the `VERSION` string in `service-worker.js` whenever you ship new deals so clients pull the update instead of serving the old cache.

## File layout

```
food-deals-app/
├── index.html            app shell
├── styles.css            brutalist design system
├── app.js                rendering, filters, geolocation, install
├── deals.json            18 mock deals
├── manifest.webmanifest  PWA manifest
├── service-worker.js     offline cache
├── netlify.toml          headers, SPA fallback
└── icons/
    ├── favicon.svg
    ├── icon-192.png
    ├── icon-512.png
    └── generate-icons.js  one-off: regenerates PNGs from the SVG
```

## Regenerating icons

After editing `icons/favicon.svg`:

```bash
cd food-deals-app
NODE_PATH=$(npm root -g) node icons/generate-icons.js
```

Requires `playwright` available via `NODE_PATH` (globally installed). The script renders the SVG headlessly at 192×192 and 512×512.
