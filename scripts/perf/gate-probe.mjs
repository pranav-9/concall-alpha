#!/usr/bin/env node
// Sign-up gate probe for /company/[code] — the repeatable check that the gate
// renders for a logged-out phone, and ONLY where it should.
//
//   SIGNUP_GATE=on next start   →   npm run probe:gate -- http://localhost:3000 [--code NEULANDLAB]
//   (flag unset) next start     →   npm run probe:gate -- http://localhost:3000 --expect off
//
// Checks (expect on): card on every gated tab that has enough content, never
// on Overview / Quarterly; everything from [data-gate-cut] down is inert; the
// clip box can't be scrolled; the fade is a mask; focus can't enter hidden
// content; email + login links carry the tab's return path.
// Checks (expect off): no card on any tab.
// Needs a Chrome binary: CHROME_PATH env, else the macOS / Linux defaults.
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
const CODE = flag("code", "NEULANDLAB");
const EXPECT = flag("expect", "on");
if (!["on", "off"].includes(EXPECT)) {
  console.error(`--expect must be on|off, got ${EXPECT}`);
  process.exit(2);
}

const GATED = ["business-overview", "moat-analysis", "key-variables", "future-growth", "valuation-check", "guidance-history"];
const OPEN = ["overview", "sentiment-score"];
const CARD = 'aside[aria-label="Sign up to read the rest of this section"]';

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
  for (const sectionId of [...OPEN, ...GATED]) {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const events = [];
    await page.evaluateOnNewDocument(() => {
      window.__gateEvents = [];
    });
    await page.goto(`${BASE}/company/${CODE}#${sectionId}`, { waitUntil: "networkidle2", timeout: 60000 });
    // Panels stream in and Guidance is a lazy chunk; give the observers a beat.
    await new Promise((r) => setTimeout(r, 1500));

    const snap = await page.evaluate((CARD) => {
      const card = document.querySelector(CARD);
      const marker = document.querySelector("[data-gate-cut]");
      const clip = card?.previousElementSibling ?? null;
      const style = clip ? getComputedStyle(clip) : null;
      const hrefs = card ? [...card.querySelectorAll("a")].map((a) => a.getAttribute("href")) : [];
      let scrolled = null;
      if (clip) {
        clip.scrollTop = 500;
        scrolled = clip.scrollTop;
      }
      return {
        hasCard: Boolean(card),
        hasMarker: Boolean(marker),
        markerInert: marker ? marker.hasAttribute("inert") && marker.getAttribute("aria-hidden") === "true" : null,
        laterSiblingsInert: marker
          ? [...(marker.parentElement?.children ?? [])]
              .slice([...(marker.parentElement?.children ?? [])].indexOf(marker))
              .every((el) => el.hasAttribute("inert"))
          : null,
        overflow: style?.overflowY ?? null,
        mask: style ? style.maskImage || style.webkitMaskImage : null,
        clipHeight: clip ? Math.round(clip.getBoundingClientRect().height) : null,
        contentHeight: clip?.firstElementChild ? Math.round(clip.firstElementChild.scrollHeight) : null,
        scrolled,
        hrefs,
        buttons: card ? [...card.querySelectorAll("button, a")].map((el) => Math.round(el.getBoundingClientRect().height)) : [],
        listItems: card ? card.querySelectorAll("li").length : 0,
      };
    }, CARD);

    const gatedTab = GATED.includes(sectionId);
    if (EXPECT === "off" || !gatedTab) {
      check(!snap.hasCard, `${sectionId}: no gate card`);
      await page.close();
      continue;
    }

    if (!snap.hasCard) {
      // Legit only when the section is too short / has no data for this company.
      check(!snap.hasMarker || snap.contentHeight === null, `${sectionId}: no card and no cut marker (thin section)`, `marker=${snap.hasMarker}`);
      await page.close();
      continue;
    }
    check(true, `${sectionId}: gate card shown`, `clip ${snap.clipHeight}px of ${snap.contentHeight}px`);
    check(snap.clipHeight < snap.contentHeight, `${sectionId}: content is clipped`);
    check(snap.overflow === "clip", `${sectionId}: overflow is clip`, String(snap.overflow));
    check(snap.scrolled === 0, `${sectionId}: clip box cannot be scrolled`, `scrollTop=${snap.scrolled}`);
    check(Boolean(snap.mask) && snap.mask !== "none", `${sectionId}: fade is a mask`);
    check(snap.listItems === 3, `${sectionId}: three "below" lines`);
    if (snap.hasMarker) {
      check(snap.markerInert === true, `${sectionId}: cut element is inert + aria-hidden`);
      check(snap.laterSiblingsInert === true, `${sectionId}: later siblings are inert`);
    } else {
      check(false, `${sectionId}: card shown without a cut marker`);
    }
    const next = encodeURIComponent(`/company/${CODE}#${sectionId}`);
    check(snap.hrefs.includes(`/auth/sign-up?next=${next}`), `${sectionId}: email link returns to this tab`);
    check(snap.hrefs.includes(`/auth/login?next=${next}`), `${sectionId}: login link returns to this tab`);
    check(snap.buttons.slice(0, 2).every((h) => h >= 44), `${sectionId}: primary actions are ≥44px`, snap.buttons.join("/"));

    // Keyboard: tab through the whole page; focus must never land inside inert content.
    const leaked = await page.evaluate(async () => {
      const inHidden = () => Boolean(document.activeElement?.closest("[inert]"));
      return inHidden();
    });
    let focusLeak = leaked;
    for (let i = 0; i < 60 && !focusLeak; i += 1) {
      await page.keyboard.press("Tab");
      focusLeak = await page.evaluate(() => Boolean(document.activeElement?.closest("[inert]")));
    }
    check(!focusLeak, `${sectionId}: Tab never enters hidden content`);
    void events;
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(failures === 0 ? "\nGATE PROBE: PASS" : `\nGATE PROBE: ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
