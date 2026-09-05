#!/usr/bin/env node
// Mobile CLS regression probe for /company/[code].
//
// Field CLS on the company page comes from what happens AFTER load — tab taps
// that mount lazily-loaded sections — so Lighthouse (load window only) never
// sees it. This script drives a throttled mobile Chrome through the real
// interactions with real touch input and reads `layout-shift` entries with
// web-vitals semantics: hadRecentInput excluded, session windows (1s gap,
// 5s cap), score = largest window.
//
//   npm run perf:cls -- http://localhost:3000 [--code NEULANDLAB] [--thin-code X]
//                        [--cases sweep,stalled,early,deeplink,rapid] [--budget 0.02]
//                        [--headless false] [--require-cold]
//
// Needs a Chrome binary: CHROME_PATH env, else the macOS / Linux defaults.
// The `stalled` and `rapid` cases hold the lazy chunk requests to force the cold
// path; they read the chunk filenames from .next/react-loadable-manifest.json,
// so run them against a local `next build` + `next start`. Without a manifest
// they report SKIP (or FAIL with --require-cold), never PASS.
//
// Exit codes: 0 all run cases within budget · 1 a case over budget or
// inconclusive · 2 usage error (unknown case, no Chrome, bad budget, no results).
// LCP and transferred bytes are printed per case as guardrails; note that
// request interception (cold cases only) disables the HTTP cache for that case.

import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import puppeteer from "puppeteer-core";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);
const positional = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
const BASE = (positional[0] ?? "http://localhost:3000").replace(/\/$/, "");
const CODE = flag("code", "NEULANDLAB");
const THIN_CODE = flag("thin-code", null);
const ALL_CASES = ["sweep", "stalled", "early", "deeplink", "rapid"];
const CASES = flag("cases", ALL_CASES.join(",")).split(",").map((s) => s.trim()).filter(Boolean);
const BUDGET = Number(flag("budget", "0.02"));
const HEADLESS = flag("headless", "true") !== "false";
const REQUIRE_COLD = has("require-cold");

const usageError = (message) => {
  console.error(message);
  process.exit(2);
};
if (!Number.isFinite(BUDGET) || BUDGET < 0) usageError(`--budget must be a non-negative number, got ${flag("budget", "")}`);
for (const name of CASES) if (!ALL_CASES.includes(name)) usageError(`unknown case "${name}"; known: ${ALL_CASES.join(", ")}`);
if (CASES.length === 0) usageError("no cases selected");

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter(Boolean);
const CHROME = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!CHROME) usageError("No Chrome binary found. Set CHROME_PATH.");

// The lazy section chunks, by filename, from the local build manifest. Used by
// the cold cases to hold exactly those requests (idle preload included) so a
// tap is guaranteed cold. `null` when no local build exists (probing prod from
// a clean checkout); an empty set when the manifest exists but the loader keys
// no longer match — that is a probe bug, not a skip.
const MANIFEST_PATH = ".next/react-loadable-manifest.json";
const lazyChunkFiles = (() => {
  if (!existsSync(MANIFEST_PATH)) return null;
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  const files = new Set();
  for (const [key, entry] of Object.entries(manifest)) {
    if (!/deferred-company-sections|kpi-sparkline-lazy/.test(key)) continue;
    for (const f of entry.files ?? []) files.add(basename(f));
  }
  return files;
})();

const SKIP = Symbol("skip");
const INCONCLUSIVE = Infinity;

const coldPathAvailable = () => {
  if (lazyChunkFiles === null) {
    console.log(`\n   no ${MANIFEST_PATH} — cannot hold lazy chunks (run against a local build)`);
    return REQUIRE_COLD ? INCONCLUSIVE : SKIP;
  }
  if (lazyChunkFiles.size === 0) {
    console.log(`\n   ${MANIFEST_PATH} present but no lazy chunk files matched — the probe's loader-key filter is stale`);
    return INCONCLUSIVE;
  }
  return true;
};

const TABS = ["Business", "Moat", "Quarterly", "Variables", "Growth", "Valuation", "Guidance", "Overview"];
const NORMAL_NET = { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const INSTRUMENT = () => {
  window.__shifts = [];
  window.__lcp = 0;
  const describe = (node) => {
    if (!node || !node.tagName) return String(node);
    const parts = [];
    let el = node;
    for (let i = 0; i < 4 && el && el.tagName; i++) {
      let s = el.tagName.toLowerCase();
      if (el.id) s += `#${el.id}`;
      const ds = el.getAttribute && el.getAttribute("data-section-id");
      if (ds) s += `[ds=${ds}]`;
      const cls = typeof el.className === "string" ? el.className.split(/\s+/).filter(Boolean).slice(0, 2).join(".") : "";
      if (cls) s += `.${cls}`;
      parts.unshift(s);
      el = el.parentElement;
    }
    return parts.join(" > ");
  };
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      const rect = (r) => (r ? `${Math.round(r.y)}+${Math.round(r.height)}` : "?");
      window.__shifts.push({
        t: Math.round(e.startTime),
        v: +e.value.toFixed(4),
        input: e.hadRecentInput,
        scrollY: Math.round(window.scrollY),
        src: (e.sources || [])
          .slice(0, 2)
          .map((s) => `${describe(s.node)} ${rect(s.previousRect)}→${rect(s.currentRect)}`),
      });
    }
  }).observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) window.__lcp = Math.round(e.startTime);
  }).observe({ type: "largest-contentful-paint", buffered: true });
};

// web-vitals CLS: max over session windows of non-input shifts (1s gap, 5s cap).
const windowedCls = (shifts) => {
  const counted = shifts.filter((s) => !s.input).sort((a, b) => a.t - b.t);
  let best = 0;
  let cur = 0;
  let start = 0;
  let prev = -Infinity;
  for (const s of counted) {
    if (s.t - prev > 1000 || s.t - start > 5000) {
      cur = 0;
      start = s.t;
    }
    cur += s.v;
    prev = s.t;
    if (cur > best) best = cur;
  }
  return best;
};

async function newSession(browser, { holdChunksMs = 0 } = {}) {
  const page = await browser.newPage();
  await page.emulate({
    viewport: { width: 412, height: 915, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true },
    userAgent:
      "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
  });
  const cdp = await page.createCDPSession();
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", NORMAL_NET);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.evaluateOnNewDocument(INSTRUMENT);

  // Cold-chunk simulation (cold cases only — interception disables the HTTP
  // cache, so warm cases must not enable it): requests for the lazy section
  // chunks are held for `holdChunksMs` before being released.
  let heldRequests = 0;
  if (holdChunksMs > 0) {
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("/_next/static/chunks/") && lazyChunkFiles?.has(basename(url.split("?")[0]))) {
        heldRequests += 1;
        setTimeout(() => req.continue().catch(() => undefined), holdChunksMs);
        return;
      }
      req.continue().catch(() => undefined);
    });
  }

  // Hydration gate: the SSR'd tab buttons exist long before React attaches
  // handlers on a throttled phone; a tap before that is silently dropped and
  // would make a cold case pass by measuring nothing.
  const waitForTabs = () =>
    page.waitForFunction(
      () => {
        const b = document.querySelector('nav[aria-label="Company sections"] button');
        return Boolean(b) && Object.keys(b).some((k) => k.startsWith("__reactProps"));
      },
      { timeout: 60000, polling: 100 },
    );
  const tap = async (label) => {
    const handles = await page.$$('nav[aria-label="Company sections"] button');
    for (const h of handles) {
      const text = await h.evaluate((b) => b.textContent.trim());
      if (text.startsWith(label)) {
        await h.evaluate((b) => b.scrollIntoView({ inline: "center", block: "nearest" }));
        await h.tap();
        return true;
      }
    }
    throw new Error(`tab "${label}" not found`);
  };
  const renderedSection = () =>
    page.evaluate(() => {
      const panel = document.querySelector("[data-section-id]");
      return panel ? panel.getAttribute("data-section-id") : null;
    });
  const placeholderState = () =>
    page.evaluate(() => {
      const el = document.querySelector('[role="status"]:not(.sr-only)');
      const footer = document.querySelector("footer");
      return {
        skeletonPx: el ? Math.round(el.getBoundingClientRect().height) : null,
        footerTop: footer ? Math.round(footer.getBoundingClientRect().top) : null,
        vh: innerHeight,
      };
    });
  const bytes = () =>
    page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .concat(performance.getEntriesByType("navigation"))
        .reduce((a, e) => a + (e.transferSize || 0), 0),
    );
  const shifts = () => page.evaluate(() => window.__shifts);
  const lcp = () => page.evaluate(() => window.__lcp);
  return { page, tap, renderedSection, placeholderState, bytes, shifts, lcp, waitForTabs, heldCount: () => heldRequests };
}

async function report(name, session, extra = "") {
  const shifts = await session.shifts();
  const cls = windowedCls(shifts);
  const total = shifts.filter((s) => !s.input).reduce((a, s) => a + s.v, 0);
  const worst = shifts.filter((s) => !s.input && s.v >= 0.01);
  console.log(
    `\n=== ${name}: CLS ${cls.toFixed(3)} (windowed) · sum ${total.toFixed(3)} · LCP ${await session.lcp()}ms · ${Math.round((await session.bytes()) / 1024)}KB ${extra}`,
  );
  for (const s of worst.slice(0, 6)) console.log(`   t=${s.t} v=${s.v} scrollY=${s.scrollY} :: ${s.src.join(" || ")}`);
  return cls;
}

const cases = {
  // Warm path: land, read, scroll, then every tab in order.
  async sweep(browser, code) {
    const s = await newSession(browser);
    await s.page.goto(`${BASE}/company/${code}`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await s.waitForTabs();
    await sleep(6000);
    for (let y = 500; y <= 3000; y += 500) {
      await s.page.evaluate((yy) => window.scrollTo(0, yy), y);
      await sleep(300);
    }
    await s.page.evaluate(() => window.scrollTo(0, 0));
    await sleep(800);
    for (const label of TABS) {
      await s.tap(label);
      await sleep(2500);
    }
    const cls = await report(`sweep ${code}`, s);
    await s.page.close();
    return cls;
  },
  // Cold path, one fresh session per tab (a second tap in the same session
  // would be warm once the held preload lands): every lazy chunk request is
  // held for 6s from before navigation. Expected: old panel still rendered
  // 600ms after the tap (held), viewport-tall skeleton by 1.6s, real section
  // by 8.6s, no counted shift. Anything else is inconclusive → FAIL.
  async stalled(browser, code) {
    const available = coldPathAvailable();
    if (available !== true) return available;
    let worst = 0;
    for (const label of ["Quarterly", "Guidance"]) {
      const s = await newSession(browser, { holdChunksMs: 6000 });
      await s.page.goto(`${BASE}/company/${code}`, { waitUntil: "domcontentloaded", timeout: 120000 });
      await s.waitForTabs();
      await sleep(200);
      const before = await s.renderedSection();
      await s.tap(label);
      await sleep(600);
      const held = await s.renderedSection();
      await sleep(1000);
      const afterHold = await s.renderedSection();
      const placeholder = await s.placeholderState();
      await sleep(7000);
      const landed = await s.renderedSection();
      const cls = await report(`stalled ${label} ${code}`, s, `held-requests=${s.heldCount()}`);
      console.log(`   ${before} → +600ms ${held} → +1.6s ${afterHold} skeleton ${JSON.stringify(placeholder)} → +8.6s ${landed}`);
      const heldOk = held === before;
      const skeletonOk = placeholder.skeletonPx !== null && placeholder.footerTop !== null && placeholder.footerTop >= placeholder.vh;
      if (!heldOk || !skeletonOk || s.heldCount() === 0) {
        console.log(`   INCONCLUSIVE: expected the old panel held at +600ms, then an off-fold skeleton (heldOk=${heldOk} skeletonOk=${skeletonOk} held-requests=${s.heldCount()})`);
        await s.page.close();
        return INCONCLUSIVE;
      }
      worst = Math.max(worst, cls);
      await s.page.close();
    }
    return worst;
  },
  // Tap as soon as the tabs are interactive, before the idle preload fires.
  async early(browser, code) {
    const s = await newSession(browser);
    await s.page.goto(`${BASE}/company/${code}`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await s.waitForTabs();
    await s.tap("Quarterly");
    await sleep(4000);
    await s.tap("Guidance");
    await sleep(4000);
    const cls = await report(`early ${code}`, s);
    await s.page.close();
    return cls;
  },
  // Deep links: the hash swaps overview → target after hydration with no input,
  // so every shift there counts. The rendered panel must be the target.
  async deeplink(browser, code) {
    let worst = 0;
    for (const hash of ["sentiment-score", "guidance-history"]) {
      const s = await newSession(browser);
      await s.page.goto(`${BASE}/company/${code}#${hash}`, { waitUntil: "domcontentloaded", timeout: 120000 });
      await sleep(9000);
      const rendered = await s.renderedSection();
      const cls = await report(`deeplink #${hash} ${code}`, s, `rendered=${rendered}`);
      if (rendered !== hash) {
        console.log(`   FAIL deeplink: expected ${hash} rendered, got ${rendered}`);
        await s.page.close();
        return INCONCLUSIVE;
      }
      worst = Math.max(worst, cls);
      await s.page.close();
    }
    return worst;
  },
  // Rapid taps on the cold path: the previous panel must still be up after the
  // burst (holds pending), and the LAST tap must win once chunks land.
  async rapid(browser, code) {
    const available = coldPathAvailable();
    if (available !== true) return available;
    const s = await newSession(browser, { holdChunksMs: 3000 });
    await s.page.goto(`${BASE}/company/${code}`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await s.waitForTabs();
    await sleep(200);
    const before = await s.renderedSection();
    await s.tap("Quarterly");
    await sleep(120);
    await s.tap("Guidance");
    await sleep(120);
    await s.tap("Quarterly");
    await sleep(300);
    const duringHold = await s.renderedSection();
    await sleep(6000);
    const rendered = await s.renderedSection();
    const cls = await report(`rapid ${code}`, s, `during-hold=${duringHold} rendered=${rendered} held-requests=${s.heldCount()}`);
    if (duringHold !== before) {
      console.log(`   INCONCLUSIVE rapid: expected ${before} still rendered during the hold, got ${duringHold}`);
      await s.page.close();
      return INCONCLUSIVE;
    }
    if (rendered !== "sentiment-score") {
      console.log("   FAIL rapid: expected the last tap (Quarterly) to win");
      await s.page.close();
      return INCONCLUSIVE;
    }
    await s.page.close();
    return cls;
  },
};

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: HEADLESS,
  args: ["--disable-gpu", "--no-first-run"],
});
const results = [];
try {
  for (const name of CASES) {
    const run = cases[name];
    results.push({ name, code: CODE, cls: await run(browser, CODE) });
    if (THIN_CODE && (name === "stalled" || name === "sweep" || name === "deeplink")) {
      results.push({ name, code: THIN_CODE, cls: await run(browser, THIN_CODE) });
    }
  }
} finally {
  await browser.close();
}

if (results.length === 0) usageError("no cases ran");
console.log(`\nSUMMARY (budget ${BUDGET})`);
let failed = false;
let ran = 0;
for (const r of results) {
  if (r.cls === SKIP) {
    console.log(`  SKIP  ${r.name.padEnd(9)} ${r.code.padEnd(12)} (no local build manifest)`);
    continue;
  }
  ran += 1;
  const ok = Number.isFinite(r.cls) && r.cls <= BUDGET;
  if (!ok) failed = true;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${r.name.padEnd(9)} ${r.code.padEnd(12)} CLS ${Number.isFinite(r.cls) ? r.cls.toFixed(3) : "inconclusive"}`);
}
if (ran === 0) usageError("every case was skipped — nothing was measured");
process.exit(failed ? 1 : 0);
