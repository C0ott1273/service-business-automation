/* CRUMB — client logic */

const DEFAULT_LOCATION = { lat: 27.9506, lng: -82.4572, label: "TAMPA, FL (default)" };
const DAYS = ["sun","mon","tue","wed","thu","fri","sat"];

const state = {
  deals: [],
  user: { ...DEFAULT_LOCATION },
  filters: {
    cuisine: "ALL",
    openNow: false,
    under10: false,
    happyHour: false,
    maxDistance: 10
  },
  sort: "distance"
};

/* ---------- utilities ---------- */

function haversine(lat1, lng1, lat2, lng2) {
  const R = 3958.8; // miles
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function isOpenNow(deal, now = new Date()) {
  const today = DAYS[now.getDay()];
  if (!deal.days.includes(today)) return false;
  const [sh, sm] = deal.startTime.split(":").map(Number);
  const [eh, em] = deal.endTime.split(":").map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  return nowMin >= startMin && nowMin <= endMin;
}

function pctOff(d) {
  return Math.round((1 - d.dealPrice / d.originalPrice) * 100);
}

function fmtPrice(n) {
  return Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;
}

function fmtDistance(mi) {
  if (mi < 0.1) return "<0.1";
  if (mi < 10) return mi.toFixed(1);
  return Math.round(mi).toString();
}

function fmtDays(days) {
  const set = new Set(days);
  if (DAYS.every((d) => set.has(d))) return "EVERY DAY";
  const weekdays = ["mon","tue","wed","thu","fri"];
  const weekend = ["sat","sun"];
  if (weekdays.every((d) => set.has(d)) && !set.has("sat") && !set.has("sun")) return "WEEKDAYS";
  if (weekend.every((d) => set.has(d)) && weekdays.every((d) => !set.has(d))) return "WEEKENDS";
  return days.map((d) => d.toUpperCase()).join(" · ");
}

/* ---------- render ---------- */

function render() {
  const grid = document.getElementById("grid");
  const empty = document.getElementById("empty");
  const filtered = applyFilters(state.deals);
  const sorted = applySort(filtered);

  grid.innerHTML = "";
  if (sorted.length === 0) {
    empty.hidden = false;
  } else {
    empty.hidden = true;
    sorted.forEach((deal, i) => grid.appendChild(renderCard(deal, i)));
  }

  updateStats(sorted);
}

function renderCard(deal, i) {
  const card = document.createElement("article");
  card.className = "card" + (i === 0 ? " card--hero" : "");
  card.dataset.id = deal.id;

  const open = isOpenNow(deal);
  const discount = pctOff(deal);

  const front = document.createElement("div");
  front.className = "card__front";
  front.innerHTML = `
    <div class="card__index">NO. ${String(i + 1).padStart(2, "0")} / ${deal.cuisine.toUpperCase()}</div>
    <h2 class="card__restaurant">${deal.restaurant}</h2>
    <p class="card__deal">${deal.deal}</p>

    <div class="card__price-row">
      <span class="card__price">${fmtPrice(deal.dealPrice)}</span>
      <span class="card__price-slash">${fmtPrice(deal.originalPrice)}</span>
      <span class="card__discount">-${discount}%</span>
    </div>

    <div class="card__tags">
      ${deal.tags.map((t) => `<span class="card__tag">${t.replace(/-/g, " ")}</span>`).join("")}
    </div>

    <div class="card__meta">
      <span>${fmtDistance(deal.distance)} mi</span>
      <span>${fmtDays(deal.days)}</span>
      <span>${deal.startTime}–${deal.endTime}</span>
    </div>

    ${open ? `<span class="card__badge">OPEN NOW</span>` : `<span class="card__badge card__badge--closed">CLOSED</span>`}
  `;

  const back = document.createElement("div");
  back.className = "card__back";
  back.innerHTML = `
    <div class="card__index" style="opacity:0.6">NO. ${String(i + 1).padStart(2, "0")} / DETAILS</div>
    <h3 class="card__restaurant" style="font-size:1.4rem">${deal.restaurant}</h3>
    <div class="card__address">${deal.address}</div>
    <div class="card__hours">
      ${fmtDays(deal.days)}<br/>
      ${deal.startTime} – ${deal.endTime}
    </div>
    <div class="card__hours">
      ${fmtDistance(deal.distance)} mi from you
    </div>
    <a class="card__directions"
       href="https://www.google.com/maps/dir/?api=1&destination=${deal.lat},${deal.lng}"
       target="_blank" rel="noopener">→ DIRECTIONS</a>
  `;

  card.appendChild(front);
  card.appendChild(back);
  card.addEventListener("click", (e) => {
    if (e.target.closest("a")) return;
    card.classList.toggle("is-flipped");
  });

  return card;
}

function updateStats(list) {
  const count = list.length;
  const avg = count
    ? Math.round(list.reduce((acc, d) => acc + pctOff(d), 0) / count)
    : 0;
  const nearest = count ? list[0].distance : null;
  const cuisines = new Set(list.map((d) => d.cuisine)).size;

  document.getElementById("stat-count").textContent = String(count).padStart(2, "0");
  document.getElementById("stat-saved").textContent = count ? `${avg}%` : "—";
  document.getElementById("stat-nearest").textContent = nearest != null ? fmtDistance(nearest) : "—";
  document.getElementById("stat-cuisines").textContent = String(cuisines).padStart(2, "0");
}

/* ---------- filter / sort ---------- */

function applyFilters(deals) {
  const f = state.filters;
  return deals.filter((d) => {
    if (f.cuisine !== "ALL" && d.cuisine !== f.cuisine) return false;
    if (f.openNow && !isOpenNow(d)) return false;
    if (f.under10 && d.dealPrice >= 10) return false;
    if (f.happyHour && !d.tags.includes("happy-hour")) return false;
    if (d.distance > f.maxDistance) return false;
    return true;
  });
}

function applySort(deals) {
  const copy = [...deals];
  switch (state.sort) {
    case "discount": return copy.sort((a, b) => pctOff(b) - pctOff(a));
    case "price":    return copy.sort((a, b) => a.dealPrice - b.dealPrice);
    case "distance":
    default:         return copy.sort((a, b) => a.distance - b.distance);
  }
}

function recomputeDistances() {
  state.deals.forEach((d) => {
    d.distance = haversine(state.user.lat, state.user.lng, d.lat, d.lng);
  });
}

/* ---------- chips ---------- */

function buildCuisineChips() {
  const box = document.getElementById("cuisine-chips");
  const cuisines = ["ALL", ...new Set(state.deals.map((d) => d.cuisine))].sort((a, b) => {
    if (a === "ALL") return -1;
    if (b === "ALL") return 1;
    return a.localeCompare(b);
  });
  box.innerHTML = "";
  cuisines.forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "chip" + (c === state.filters.cuisine ? " is-active" : "");
    btn.textContent = c;
    btn.dataset.cuisine = c;
    btn.addEventListener("click", () => {
      state.filters.cuisine = c;
      buildCuisineChips();
      render();
    });
    box.appendChild(btn);
  });
}

/* ---------- geolocation ---------- */

function updateLocationLabel(text) {
  document.getElementById("location-label").textContent = text.toUpperCase();
}

function requestLocation() {
  if (!("geolocation" in navigator)) {
    updateLocationLabel(DEFAULT_LOCATION.label);
    return;
  }
  updateLocationLabel("LOCATING…");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.user = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        label: "YOUR LOCATION"
      };
      updateLocationLabel("YOUR LOCATION");
      recomputeDistances();
      render();
    },
    (err) => {
      console.warn("Geolocation denied/unavailable:", err?.message);
      updateLocationLabel(DEFAULT_LOCATION.label);
      recomputeDistances();
      render();
    },
    { timeout: 8000, maximumAge: 60_000 }
  );
}

/* ---------- install prompt ---------- */

let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const btn = document.getElementById("install-btn");
  btn.hidden = false;
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === "accepted") btn.hidden = true;
    deferredInstallPrompt = null;
    btn.disabled = false;
  }, { once: true });
});

window.addEventListener("appinstalled", () => {
  document.getElementById("install-btn").hidden = true;
});

/* ---------- controls wiring ---------- */

function wireControls() {
  document.getElementById("filter-open-now").addEventListener("change", (e) => {
    state.filters.openNow = e.target.checked;
    render();
  });
  document.getElementById("filter-under-10").addEventListener("change", (e) => {
    state.filters.under10 = e.target.checked;
    render();
  });
  document.getElementById("filter-happy-hour").addEventListener("change", (e) => {
    state.filters.happyHour = e.target.checked;
    render();
  });
  const slider = document.getElementById("distance-slider");
  const sliderLbl = document.getElementById("distance-value");
  slider.addEventListener("input", (e) => {
    state.filters.maxDistance = parseFloat(e.target.value);
    sliderLbl.textContent = state.filters.maxDistance;
    render();
  });
  document.getElementById("sort-select").addEventListener("change", (e) => {
    state.sort = e.target.value;
    render();
  });
}

/* ---------- date header ---------- */

function setDateHeader() {
  const d = new Date();
  const s = d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric"
  }).toUpperCase();
  document.getElementById("today-date").textContent = s;
}

/* ---------- boot ---------- */

async function boot() {
  setDateHeader();
  wireControls();
  try {
    const res = await fetch("deals.json", { cache: "no-cache" });
    state.deals = await res.json();
  } catch (err) {
    console.error("Failed to load deals.json:", err);
    state.deals = [];
  }
  recomputeDistances();
  buildCuisineChips();
  render();
  requestLocation();

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("service-worker.js")
        .catch((err) => console.warn("SW registration failed:", err));
    });
  }
}

boot();
