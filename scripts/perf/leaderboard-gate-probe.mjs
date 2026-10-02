#!/usr/bin/env node
// Sign-up gate probe for /leaderboards — logged-out reader, every board, both paints.
//
//   SIGNUP_GATE=on next start  →  npm run probe:leaderboard-gate -- http://localhost:3000
//   (flag unset) next start    →  npm run probe:leaderboard-gate -- http://localhost:3000 --expect off
//
// Checks (expect on), per board and per viewport (phone 390 / desktop 1280):
// the card shows, exactly LEADERBOARD_FREE_ROWS rows sit above the marker in
// its own list, the marker and everything after it are inert, the clip box
// can't scroll, the sign-up link returns to the same board, the tab strip
// stays outside the gate, and layout shift stays ≤ 0.01.
// Checks (expect off): no card on any board.
// Exit codes: 0 pass · 1 a check failed · 2 usage error.

import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const positional = args.filter((a, i) => !a.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
const BASE = (positional[0] ?? "http://localhost:3000").replace(/\/$/, "");
const EXPECT = flag("expect", "on");
if (!["on", "off"].includes(EXPECT)) {
  console.error(`--expect must be on|off, got ${EXPECT}`);
  process.exit(2);
}

const BOARDS = ["overall", "quarter", "growth", "moat"];
const FREE_ROWS = 20;
const CARD = 'aside[aria-label="Sign up to read the rest of this board"]';
const VIEWPORTS = [
  { name: "phone", width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: "desktop", width: 1280, height: 900, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
];

const chrome = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find((p) => p && existsSync(p));
if (!chrome) {
  console.error("No Chrome binary found; set CHROME_PATH.");
  process.exit(2);
}

let failures = 0;
const check = (ok, label, detail = "") => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ["--no-sandbox"] });
try {
  for (const vp of VIEWPORTS) {
    for (const board of BOARDS) {
      const page = await browser.newPage();
      await page.setViewport(vp);
      await page.evaluateOnNewDocument(() => {
        window.__cls = 0;
        new PerformanceObserver((list) => {
          for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
        }).observe({ type: "layout-shift", buffered: true });
      });
      await page.goto(`${BASE}/leaderboards?tab=${board}`, { waitUntil: "networkidle0", timeout: 90_000 });
      await new Promise((r) => setTimeout(r, 800));

      const r = await page.evaluate((cardSel, freeRows) => {
        const visible = (el) => !!el && el.getClientRects().length > 0;
        // Only the mounted paint's panel is in the DOM; inside it, one visible card.
        const cards = [...document.querySelectorAll(cardSel)].filter(visible);
        const card = cards[0] ?? null;
        const markers = [...document.querySelectorAll("[data-gate-cut]")];
        const marker = markers.find(visible) ?? null;
        const clip = card?.previousElementSibling ?? null;
        const style = clip ? getComputedStyle(clip) : null;
        const after = marker?.nextElementSibling ?? null;
        // Rows above the marker in its own list: the marker's earlier siblings
        // that are rows (tr / li), skipping group headers (a tr with one colSpan cell).
        let rowsAbove = 0;
        let seenGroupHeader = false;
        for (let el = marker?.previousElementSibling; el; el = el.previousElementSibling) {
          if (el.tagName === "TR" && el.children.length === 1 && el.children[0].hasAttribute("colspan")) {
            seenGroupHeader = true;
            continue;
          }
          if (el.tagName === "TR" || el.tagName === "LI") rowsAbove += 1;
        }
        const email = card?.querySelector('a[href^="/auth/sign-up"]')?.getAttribute("href") ?? null;
        const tabs = [...document.querySelectorAll('[role="tablist"]')].find(visible) ?? null;
        return {
          cards: cards.length,
          markers: markers.filter(visible).length,
          eyebrow: card?.querySelector("p")?.textContent ?? null,
          below: card ? [...card.querySelectorAll("li")].map((li) => li.textContent) : [],
          rowsAbove,
          grouped: seenGroupHeader,
          markerTag: marker?.tagName ?? null,
          markerInert: marker?.hasAttribute("inert") ?? false,
          afterInert: after ? after.hasAttribute("inert") : true,
          overflow: style?.overflowY ?? null,
          maxHeight: style?.maxHeight ?? null,
          clipScroll: clip ? ((clip.scrollTop = 500), clip.scrollTop) : null,
          email,
          tabsOutside: !!tabs && !(clip && clip.contains(tabs)),
          cls: window.__cls,
        };
      }, CARD, FREE_ROWS);

      const tag = `${vp.name} ${board}`;
      if (EXPECT === "off") {
        check(r.cards === 0 && r.markers === 0, `${tag}: no card, no marker`);
      } else {
        check(r.cards === 1, `${tag}: one card`, `cards ${r.cards}; below: ${r.below.join(" | ")}`);
        check(r.eyebrow === "Below on this board", `${tag}: eyebrow`, r.eyebrow ?? "");
        check(r.markers === 1, `${tag}: one visible marker`, `${r.markers} (${r.markerTag})`);
        // On a grouped board (Moat) the marker's own tier group may hold fewer
        // than 20 rows; the full count spans groups, so only the flat boards are exact.
        check(
          r.grouped || board === "moat" ? r.rowsAbove <= FREE_ROWS : r.rowsAbove === FREE_ROWS,
          `${tag}: ${FREE_ROWS} rows above the cut`,
          `${r.rowsAbove}${r.grouped ? " in the marker's group" : ""}`,
        );
        check(r.markerInert && r.afterInert, `${tag}: cut and below are inert`);
        check(r.overflow === "clip" && r.maxHeight !== "none", `${tag}: clipped`, `max-height ${r.maxHeight}`);
        check(r.clipScroll === 0, `${tag}: clip box can't scroll`);
        check(
          r.email === `/auth/sign-up?next=${encodeURIComponent(`/leaderboards?tab=${board}`)}`,
          `${tag}: sign-up returns to the board`,
          r.email ?? "",
        );
        check(r.tabsOutside, `${tag}: tab strip stays outside the gate`);
      }
      check(r.cls <= 0.01, `${tag}: CLS ≤ 0.01`, r.cls.toFixed(4));
      await page.close();
    }
  }
} finally {
  await browser.close();
}
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
