# IronFuel — Full Integration & Plugin Roadmap

Generated: 2026-02-19 | Analyzed by Claude Agent Team

---

## TOP 10 — Implement First (Priority Order)

| # | Integration | Cost | Effort | Impact |
|---|---|---|---|---|
| 1 | **idb / IndexedDB Persistence** | Free | Low | 🔴 Critical |
| 2 | **Live 1RM Calculator (Epley)** | Free | Low | 🔴 Critical — DONE ✅ |
| 3 | **Supabase Auth + Google OAuth** | Free tier | Medium | 🔴 Critical |
| 4 | **Supabase Postgres Cloud Sync** | Free tier | Medium | 🔴 Critical |
| 5 | **USDA FoodData Central API** | Free (API key) | Medium | 🔴 Critical |
| 6 | **QuaggaJS Barcode Scanner** | Free | Low | 🟠 High |
| 7 | **OpenAI GPT-4o + System Prompt** | ~$0.01/msg | High | 🟠 High |
| 8 | **Chart.js Live Charts** | Free | Medium | 🟠 High |
| 9 | **PWA Manifest + Workbox SW** | Free | Low — DONE ✅ | 🟠 High |
| 10 | **Stripe Pro Subscription** | % of revenue | Medium | 🟠 High |

---

## NUTRITION & FOOD DATA

### 1. USDA FoodData Central API
- **What**: Primary food search database — 900k+ items, returns full macro/micro breakdowns
- **URL**: https://fdc.nal.usda.gov/api-guide.html
- **Key**: Free at https://fdc.nal.usda.gov/api-key-signup.html
- **Endpoint**: `GET https://api.nal.usda.gov/fdc/v1/foods/search?query={term}&api_key={KEY}`
- **Priority**: 🔴 Critical
- **Wire-in**: Debounced fetch on food search input → map nutrientId 1003/1004/1005/1008 → append food-entry row

### 2. Nutritionix API (Natural Language)
- **What**: "2 cups brown rice" natural language entry, branded restaurant foods
- **URL**: https://developer.nutritionix.com/docs/v2
- **Key**: Free tier at developer.nutritionix.com — needs `x-app-id` + `x-app-key` headers
- **Endpoint**: `POST https://trackapi.nutritionix.com/v2/natural/nutrients`
- **Priority**: 🟠 High

### 3. Open Food Facts (Barcode Fallback)
- **What**: 3M+ product barcode database, completely free, no key needed
- **URL**: https://wiki.openfoodfacts.org/API
- **Endpoint**: `GET https://world.openfoodfacts.org/api/v0/product/{barcode}.json`
- **Priority**: 🟡 Medium

### 4. QuaggaJS — Barcode Scanner
- **What**: Decodes EAN-13/UPC-A from live camera stream in browser
- **CDN**: `https://cdn.jsdelivr.net/npm/quagga@0.12.1/dist/quagga.min.js`
- **Priority**: 🟠 High
- **Wire-in**: `Quagga.init({ inputStream: { type:'LiveStream', target: videoEl }, decoder: { readers:['ean_reader','upc_reader'] } })` → on detect → Open Food Facts lookup

### 5. Meal Log Persistence — idb (IndexedDB)
- **What**: Full history beyond today, survives localStorage limits
- **CDN**: `https://cdn.jsdelivr.net/npm/idb@8/build/umd.js`
- **Priority**: 🔴 Critical
- **Schema**: Store `nutrition_log` keyed `{ userId, date, mealId }`, store `workout_sessions`

---

## FITNESS & WORKOUT

### 6. ExerciseDB API (RapidAPI)
- **What**: 1300+ exercises, muscle groups, GIF demos — powers "+ Add Exercise"
- **URL**: https://rapidapi.com/justin-WFnsXH_t6/api/exercisedb
- **Key**: RapidAPI key (free tier) — headers: `X-RapidAPI-Key`, `X-RapidAPI-Host`
- **Endpoint**: `GET https://exercisedb.p.rapidapi.com/exercises/name/{name}`
- **Priority**: 🟠 High

### 7. Wger API (Free Alternative to ExerciseDB)
- **URL**: https://wger.de/api/v2/
- **Key**: None needed (public instance)
- **Priority**: 🟢 Low (fallback)

### 8. Live 1RM Calculator — Epley Formula ✅ IMPLEMENTED
- **Formula**: `e1RM = weight × (1 + reps / 30)`
- **Status**: Already live in the app — updates e1RM chip on every set-input change, stores PRs in localStorage
- **Priority**: 🔴 Critical — DONE

### 9. Workout History (idb)
- **Schema**: `{ id, date, name, exercises: [{ name, sets: [{weight, reps, rpe, e1rm}] }] }`
- **Status**: Basic localStorage version implemented ✅
- **Next**: Upgrade to IndexedDB for 30+ days of history + feed Volume Trend chart

---

## AI / COACHING

### 10. OpenAI GPT-4o API
- **What**: Real AI responses in the Coach chat (currently uses canned responses)
- **URL**: https://platform.openai.com/docs/api-reference/chat
- **Key**: OpenAI API key — **must be server-side only** (use a proxy function)
- **Cost**: ~$0.005 per message (GPT-4o mini) or ~$0.01 (GPT-4o)
- **Priority**: 🔴 Critical
- **Architecture**: Client → POST `/api/coach` (your serverless proxy) → OpenAI API

### 11. Coaching System Prompt Template
```
You are IronFuel Coach, an elite performance assistant specializing in body recomposition.
User context:
- Name: {user.name}, Week {user.week} of cut
- Current weight: {user.weight}lb ({user.weeklyLossRate}%/wk rate of loss)
- Calories: {user.calories}kcal/day, Protein target: {user.protein}g
- Strength Retention Score: {user.strengthScore}%
- Deadlift e1RM: {user.deadlift}lb | Bench e1RM: {user.bench}lb
- Streak: {user.streak} days
Be specific, data-driven, and concise. Never give generic advice.
```

### 12. Streaming Response (SSE)
- `stream: true` in OpenAI request → `response.body.getReader()` → typewriter effect
- **Priority**: 🟠 High (UX — avoids 3s blank wait)

---

## AUTHENTICATION

### 13. Supabase Auth
- **CDN**: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js`
- **Cost**: Free tier (50k MAU)
- **Init**: `createClient(SUPABASE_URL, SUPABASE_ANON_KEY)`
- **Priority**: 🔴 Critical

### 14. Google OAuth (via Supabase)
- `supabase.auth.signInWithOAuth({ provider: 'google' })`
- Configure in Supabase Dashboard → Auth → Providers → Google
- **Priority**: 🟠 High

### 15. Apple Sign-In
- Required for iOS App Store distribution
- `supabase.auth.signInWithOAuth({ provider: 'apple' })`
- **Priority**: 🟡 Medium

---

## DATA STORAGE & SYNC

### 16. Supabase Postgres
- **Tables needed**: `nutrition_logs`, `workout_sessions`, `body_weight_entries`, `user_profiles`, `push_subscriptions`
- **RLS**: `auth.uid() = user_id` on all tables
- **Priority**: 🔴 Critical

### 17. Supabase Realtime
- Live feed updates when server detects macro threshold exceeded
- `supabase.channel('agent_feed').on('postgres_changes', ...)`
- **Priority**: 🟡 Medium

### 18. PWA Service Worker (Workbox) ✅ Manifest added
- **CDN**: https://developer.chrome.com/docs/workbox/
- Strategies: `StaleWhileRevalidate` for fonts, `CacheFirst` for app shell
- `BackgroundSync` for offline queue replay
- **Priority**: 🟠 High

### 19. PWA Web App Manifest ✅ IMPLEMENTED
- Already added as inline manifest in `<head>`
- `"display": "standalone"`, `"theme_color": "#d4ff3f"`
- **Priority**: 🟠 High — DONE

---

## HEALTH DEVICE INTEGRATION

### 20. Apple HealthKit (via Capacitor)
- **Plugin**: `@capacitor-community/health` — https://github.com/capacitor-community/health
- Read: steps, calories, weight, heart rate, sleep | Write: weight, nutrition, workout
- Requires Capacitor project wrap: `npx cap init IronFuel com.ironfuel.app`
- **Priority**: 🟡 Medium

### 21. Google Health Connect (Android)
- Same `@capacitor-community/health` plugin — auto-detects platform
- **Priority**: 🟡 Medium

### 22. Withings Smart Scale API
- OAuth 2.0 | https://developer.withings.com/api-reference
- Auto-imports weigh-ins → eliminates manual logging
- **Priority**: 🟢 Low

### 23. Garmin Connect API
- OAuth 1.0a | Webhook-based push (not polling)
- https://developer.garmin.com/health-api/overview/
- **Priority**: 🟢 Low

### 24. Fitbit Web API
- OAuth 2.0 | `GET https://api.fitbit.com/1/user/-/activities/date/{date}.json`
- https://dev.fitbit.com
- **Priority**: 🟢 Low

---

## CHARTS & VISUALIZATION

### 25. Chart.js v4 ← REPLACE STATIC SVG CHARTS
- **CDN**: `https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js`
- Replace SVG polylines on Progress screen with `<canvas>` + `new Chart()`
- Config: `type:'line'`, `borderColor:'#d4ff3f'`, `fill:true`, `tension:0.4`
- **Priority**: 🟠 High

### 26. ApexCharts (Supplement)
- **CDN**: `https://cdn.jsdelivr.net/npm/apexcharts`
- Multi-series line (raw daily + 7-day rolling avg overlay)
- **Priority**: 🟡 Medium

### 27. D3.js v7 (Advanced)
- **CDN**: `https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js`
- Muscle group heatmaps, live macro donut ring
- **Priority**: 🟢 Low

---

## NOTIFICATIONS

### 28. Web Push API + web-push npm
- Rest timer zero → `self.registration.showNotification('Rest Complete', { vibrate: [200,100,200] })`
- Server: `npm install web-push` + VAPID keys
- **Priority**: 🟠 High

### 29. Macro Reminder Notifications
- Schedule via Supabase `pg_cron` at 3pm if protein < 50% target
- **Priority**: 🟡 Medium

---

## PAYMENTS / MONETIZATION

### 30. Stripe — Pro Subscription
- **CDN**: `https://js.stripe.com/v3/`
- Flow: Client → Edge Function `/api/create-checkout-session` → Stripe Checkout → webhook → update `user_subscriptions`
- **Priority**: 🟠 High

### 31. RevenueCat (Multi-Platform)
- Wraps Stripe (web) + Apple IAP (iOS) + Google Play (Android) in one SDK
- `npm install @revenuecat/purchases-js`
- Use when shipping to app stores
- **Priority**: 🟡 Medium

---

## SOCIAL / SHARING

### 32. Canvas API — Progress Card Generator
- Offscreen `<canvas>` 1080×1080 → draw stats → `canvas.toBlob()` → share
- `ctx.font = 'bold 80px Bebas Neue'` (load via FontFace API)
- **Priority**: 🟡 Medium

### 33. Web Share API (Native Share Sheet)
- `navigator.share({ files: [imageFile], title: 'IronFuel Progress' })`
- Feature detect: `navigator.canShare({ files: [file] })`
- **Priority**: 🟡 Medium

---

## CAMERA / MEDIA

### 34. getUserMedia — Camera for Barcode
- `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`
- Requires HTTPS
- **Priority**: 🟠 High

### 35. Logmeal AI — Food Photo Recognition
- `POST https://api.logmeal.com/v2/image/segmentation/complete` (multipart)
- Key: https://api.logmeal.com
- **Priority**: 🟢 Low

### 36. Clarifai Food Model (Alternative)
- `POST https://api.clarifai.com/v2/models/food-item-recognition/outputs`
- **Priority**: 🟢 Low

---

## IMPLEMENTATION SEQUENCE (Recommended)

```
Week 1:  IndexedDB (idb) + USDA FoodData API + Chart.js
Week 2:  Supabase Auth + Google OAuth + Postgres sync
Week 3:  OpenAI GPT-4o proxy + streaming + Stripe checkout
Week 4:  PWA Service Worker + Web Push + Barcode (QuaggaJS)
Week 5+: HealthKit/Health Connect + Device integrations + Canvas share card
```

---

## CDN Scripts to Add (in order of priority)

```html
<!-- Supabase -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>

<!-- Chart.js -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>

<!-- idb (IndexedDB wrapper) -->
<script src="https://cdn.jsdelivr.net/npm/idb@8/build/umd.js"></script>

<!-- QuaggaJS (barcode) -->
<script src="https://cdn.jsdelivr.net/npm/quagga@0.12.1/dist/quagga.min.js"></script>

<!-- Stripe.js -->
<script src="https://js.stripe.com/v3/"></script>

<!-- ApexCharts (optional, supplement Chart.js) -->
<script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
```

---

*Document generated by IronFuel Claude Agent Team — update as integrations are implemented.*
