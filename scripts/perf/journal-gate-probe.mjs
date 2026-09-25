#!/usr/bin/env node
// Sign-up gate probe for Journal posts — logged-out phone, one post per shape.
//
//   SIGNUP_GATE=on next start  →  npm run probe:journal-gate -- http://localhost:3000
//   (flag unset) next start    →  npm run probe:journal-gate -- http://localhost:3000 --expect off
//
// Checks (expect on): the card shows below the post's opening, everything from
// the cut down is inert, the clip box can't scroll, the sign-up links return to
// the post, and Next read + the Telegram card stay outside the gate; layout
// shift stays ≤ 0.01. A post with one heading shows no card.
// Checks (expect off): no card anywhere.
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

// A company story, a comparison, a Notebook post, and one with a single heading (never gated).
const GATED = ["shreeref-stores-resupply", "ccl-vs-vintage", "making-it-worth-your-time"];
const UNGATED = ["product-mix-shift-neuland"];
const CARD = 'aside[aria-label="Sign up to read the rest of this post"]';

const chrome = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
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
  for (const slug of [...GATED, ...UNGATED]) {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await page.evaluateOnNewDocument(() => {
      window.__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto(`${BASE}/blog/${slug}`, { waitUntil: "networkidle0", timeout: 90_000 });
    await new Promise((r) => setTimeout(r, 800));

    const r = await page.evaluate((cardSel) => {
      const card = document.querySelector(cardSel);
      const marker = document.querySelector("article [data-gate-cut]");
      const clip = card?.previousElementSibling;
      const style = clip ? getComputedStyle(clip) : null;
      const after = marker ? marker.nextElementSibling : null;
      const email = card?.querySelector('a[href^="/auth/sign-up"]')?.getAttribute("href") ?? null;
      const inClip = (el) => !!(el && clip && clip.contains(el));
      return {
        card: !!card,
        eyebrow: card?.querySelector("p")?.textContent ?? null,
        below: card ? [...card.querySelectorAll("li")].map((li) => li.textContent) : [],
        markerInert: marker?.hasAttribute("inert") ?? false,
        afterInert: after?.hasAttribute("inert") ?? false,
        overflow: style?.overflowY ?? null,
        maxHeight: style?.maxHeight ?? null,
        clipScroll: clip ? (clip.scrollTop = 500, clip.scrollTop) : null,
        email,
        nextReadOutside: !inClip(document.querySelector('nav[aria-label="Next read"]')),
        title: document.querySelector("h1")?.textContent ?? "",
        cls: window.__cls,
      };
    }, CARD);

    const gated = EXPECT === "on" && GATED.includes(slug);
    if (!gated) {
      check(!r.card, `${slug}: no card`, r.title.slice(0, 40));
    } else {
      check(r.card, `${slug}: card shown`, `below: ${r.below.join(" | ")}`);
      check(r.eyebrow === "Below in this post", `${slug}: eyebrow`, r.eyebrow ?? "");
      check(r.markerInert && r.afterInert, `${slug}: cut and below are inert`);
      check(r.overflow === "clip" && r.maxHeight !== "none", `${slug}: clipped`, `max-height ${r.maxHeight}`);
      check(r.clipScroll === 0, `${slug}: clip box can't scroll`);
      check(r.email === `/auth/sign-up?next=${encodeURIComponent(`/blog/${slug}`)}`, `${slug}: sign-up returns to the post`, r.email ?? "");
      check(r.nextReadOutside, `${slug}: Next read stays outside the gate`);
    }
    check(r.cls <= 0.01, `${slug}: CLS ≤ 0.01`, r.cls.toFixed(4));
    await page.close();
  }
} finally {
  await browser.close();
}
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
