// Fetches each covered company's logo mark from its own website and stores it
// self-hosted as public/logos/<CODE>.png (96×96, transparent, centred). The
// record of where each came from is data/company-logos.json; the portal reads
// only the generated code list lib/company-logo-codes.ts (components/
// company-logo.tsx), so client bundles carry codes, not the record. A company
// without a usable mark keeps its initials tile — never a guessed image.
//
//   node scripts/fetch-company-logos.mjs                 # dry run: what would be fetched
//   node scripts/fetch-company-logos.mjs --write         # fetch every company not on file yet
//   node scripts/fetch-company-logos.mjs --write --force # re-fetch all
//   node scripts/fetch-company-logos.mjs --write --only=SSWL,NETWEB
//   node scripts/fetch-company-logos.mjs --sheet=/path/sheet.png   # contact sheet of what's on file
//
// The site is company.website; when that is empty, the company's own link from
// its Screener page header (beside the BSE / NSE links — the same source the
// pipeline scrapes). Source order per site, sharpest first:
//   1. the site's icons — apple-touch-icon, then its largest <link rel="icon">,
//      /apple-touch-icon.png, /favicon.ico — at 48px or more (or SVG);
//   2. a header logo <img> that is plainly the company's own — a bare "logo.*"
//      file, or one naming the company — no wider than 2.5:1 (a long wordmark is
//      illegible in a small square). Sites carry many logos (clients, partners,
//      certificates, product brands, the white footer variant); those are skipped;
//   3. the same icons, then Google's favicon service for the host, at 32px or
//      more. Under 32px is rejected: a blurry 16px favicon is worse than initials.
//
// Downloaded bytes are untrusted: every image is decoded and re-encoded by
// sharp into a PNG; an SVG is rasterised, never written as SVG (an SVG served
// from our origin could carry script). EXCLUDE holds marks a review rejected
// (a hosting provider's default icon, a stock glyph) — the reason is the record.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

import { loadEnv } from "./themes-lib.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public/logos");
const MANIFEST = path.join(ROOT, "data/company-logos.json");
const CODES_MODULE = path.join(ROOT, "lib/company-logo-codes.ts");
const SIZE = 96;
const SHARP_PX = 48;
const FALLBACK_PX = 32;
const MAX_ASPECT = 2.5;
const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 12_000;
const CONCURRENCY = 6;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

// CODE → why the fetched mark was rejected on review. Rejected codes are
// skipped (initials stay) until removed from this list.
const EXCLUDE = {
  CARTRADE: "the site's header logo is OLX, a brand it owns, not CarTrade's mark",
  AETHER: "site serves the default WordPress icon",
  CCL: "site serves the default WordPress icon",
  TIMETECHNO: "site serves the default WordPress icon",
  SHRIRAMFIN: "the site icon is a mascot illustration, not the mark",
  STOVEKRAFT: "only a long wordmark, illegible at tile size",
  CARBORUNIV: "site serves the default WordPress icon",
  TIMEX: "site serves the default WordPress icon",
  VENUSPIPES: "site serves the default WordPress icon",
  CYIENTDLM: "the site's icon is a plain grey disc, not the mark",
  GANECOS: "the only mark is a long wordmark, illegible at tile size",
  AEGISLOG: "the site's favicon crops the wordmark mid-letter",
  E2E: "only a washed-out 32px favicon",
  SAMBHV: "only a blurred wordmark, illegible at tile size",
  MOLDTKPAC: "only a blurred wordmark, illegible at tile size",
  VINYAS: "the site icon is a signature with fine print, illegible at tile size",
  ETERNAL: "only a blurred wordmark, illegible at tile size",
};

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const FORCE = args.includes("--force");
const ONLY = (args.find((a) => a.startsWith("--only=")) ?? "").slice(7).split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
const SHEET = (args.find((a) => a.startsWith("--sheet=")) ?? "").slice(8);

function readManifest() {
  try {
    return JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  } catch {
    return {};
  }
}

function siteUrl(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u : null;
  } catch {
    return null;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The company's own site from its Screener page header: the first outbound link
// in the block that also holds the BSE / NSE links. Paced, with one slow retry:
// Screener throttles a burst of page reads.
async function screenerWebsite(code) {
  const url = `https://www.screener.in/company/${encodeURIComponent(code)}/`;
  await sleep(1500);
  const page = (await get(url, "text/html")) ?? (await sleep(15_000), await get(url, "text/html"));
  if (!page) return null;
  const html = page.buf.toString("utf8");
  const at = html.indexOf("show-from-tablet-landscape flex-row");
  if (at < 0) return null;
  for (const m of html.slice(at, at + 2500).matchAll(/<a href="(https?:\/\/[^"]+)"/g)) {
    const url = siteUrl(m[1]);
    if (url && !/(^|\.)(bseindia|nseindia|screener)\.(com|in)$/i.test(url.hostname)) return url;
  }
  return null;
}

async function get(url, accept) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { "user-agent": UA, accept }, redirect: "follow", signal: ctrl.signal });
    if (!res.ok) return null;
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > MAX_BYTES) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 0 && buf.length <= MAX_BYTES ? { buf, finalUrl: res.url, type: res.headers.get("content-type") ?? "" } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// <link rel="…icon…" href sizes type> from the page head, best first.
function iconLinks(html, base) {
  const out = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const attr = (name) => (tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i")) ?? [])[1] ?? "";
    const rel = attr("rel").toLowerCase();
    if (!rel.includes("icon")) continue;
    const href = attr("href");
    if (!href || href.startsWith("data:")) continue;
    let url;
    try {
      url = new URL(href, base).toString();
    } catch {
      continue;
    }
    const sizes = attr("sizes").toLowerCase();
    const px = Math.max(0, ...[...sizes.matchAll(/(\d+)x(\d+)/g)].map((m) => Number(m[1])));
    const svg = /\.svg(\?|$)/i.test(url) || attr("type").includes("svg");
    const touch = rel.includes("apple-touch-icon");
    // Rank: SVG, then apple-touch, then by declared size.
    out.push({ url, rank: (svg ? 2000 : 0) + (touch ? 1000 : 0) + px });
  }
  return out.sort((a, b) => b.rank - a.rank).map((l) => l.url);
}

// The largest PNG frame inside an .ico (sharp cannot read ICO; BMP frames are skipped).
function pngFromIco(buf) {
  if (buf.length < 6 || buf.readUInt16LE(0) !== 0 || buf.readUInt16LE(2) !== 1) return null;
  const count = buf.readUInt16LE(4);
  let best = null;
  for (let i = 0; i < count; i++) {
    const o = 6 + i * 16;
    if (o + 16 > buf.length) break;
    const w = buf[o] || 256;
    const size = buf.readUInt32LE(o + 8);
    const at = buf.readUInt32LE(o + 12);
    const frame = buf.subarray(at, at + size);
    if (frame.length >= 8 && frame.readUInt32BE(0) === 0x89504e47 && (!best || w > best.w)) best = { w, frame };
  }
  return best?.frame ?? null;
}

const NOT_OURS = /client|partner|cert|award|badge|accredit|iso\d|gmp|pci|footer|white|light|product|brand(?!ing)|sponsor|member/i;
const BARE_LOGO = /^(?:site|main|header|brand|company|nav)?[-_ ]?logo(?:[-_ ]?(?:icon|main|header|colou?r|dark|new|final|\d{1,4}x\d{1,4}))?$/i;
// Group names that sit in front of many companies' names, so they don't identify one.
const GROUP_WORDS = new Set(["tata", "aditya", "birla", "adani", "india", "indian", "national", "reliance", "jindal", "bajaj", "kirloskar"]);

// Header logo <img> sources that are plainly the company's own: a bare
// "logo.png"-style file, or a file/alt naming the code or the company's
// distinctive first word. Anything that reads as someone else's logo is skipped.
function headerLogos(html, base, company) {
  const first = company.name.toLowerCase().split(/[^a-z0-9]+/).find(Boolean) ?? "";
  const names = [company.code.toLowerCase(), ...(first.length >= 5 && !GROUP_WORDS.has(first) ? [first] : [])];
  const out = [];
  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    if (!/logo/i.test(tag)) continue;
    const src = (tag.match(/\b(?:data-src|src)\s*=\s*["']([^"']+)["']/i) ?? [])[1];
    if (!src || src.startsWith("data:")) continue;
    let url;
    try {
      url = new URL(src, base);
    } catch {
      continue;
    }
    const file = decodeURIComponent(url.pathname.split("/").pop() ?? "").replace(/\.[a-z0-9]+$/i, "");
    const alt = (tag.match(/\balt\s*=\s*["']([^"']*)["']/i) ?? [])[1] ?? "";
    if (NOT_OURS.test(file) || NOT_OURS.test(alt)) continue;
    const label = `${file} ${alt}`.toLowerCase();
    if (BARE_LOGO.test(file) || names.some((n) => label.includes(n))) out.push(url.toString());
    if (out.length >= 3) break;
  }
  return out;
}

// Decode → reject if too small or too wide → trim flat borders → 96px contain
// on transparent. An SVG has no pixel size, so only its shape is checked.
async function normalise(buf, { minPx, maxAspect = Infinity }) {
  const ico = pngFromIco(buf);
  const input = ico ?? buf;
  const isSvg = !ico && /<svg[\s>]/i.test(input.subarray(0, 2048).toString("utf8"));
  const img = sharp(input, isSvg ? { density: 384 } : {});
  const meta = await img.metadata();
  if (!meta.width || !meta.height) return null;
  if (!isSvg && Math.min(meta.width, meta.height) < minPx) return null;
  let trimmed = await img.png().toBuffer();
  try {
    trimmed = await sharp(trimmed).trim({ threshold: 12 }).png().toBuffer();
  } catch {
    // A flat image trims to nothing; keep the untrimmed one.
  }
  const t = await sharp(trimmed).metadata();
  if (!t.width || !t.height || Math.max(t.width, t.height) / Math.min(t.width, t.height) > maxAspect) return null;
  // A white mark on transparency (made for a dark header) is blank on our tile.
  const { channels } = await sharp(trimmed).flatten({ background: "#ffffff" }).stats();
  if (channels.slice(0, 3).every((c) => c.stdev < 6)) return null;
  return sharp(trimmed)
    .resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function fetchLogo(site, company) {
  const page = await get(site.toString(), "text/html");
  const base = page?.finalUrl ?? site.toString();
  const html = page ? page.buf.toString("utf8") : "";
  const icons = [
    ...iconLinks(html, base),
    new URL("/apple-touch-icon.png", base).toString(),
    new URL("/favicon.ico", base).toString(),
  ];
  const google = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(base).hostname)}&sz=128`;

  // Each URL is downloaded once, then tried against every tier it appears in.
  const cache = new Map();
  const load = async (url) => {
    if (!cache.has(url)) cache.set(url, await get(url, "image/*"));
    return cache.get(url);
  };
  const tiers = [
    { tier: "icon", urls: icons, opts: { minPx: SHARP_PX } },
    { tier: "header-logo", urls: headerLogos(html, base, company), opts: { minPx: SHARP_PX, maxAspect: MAX_ASPECT } },
    { tier: "favicon-32", urls: [...icons, google], opts: { minPx: FALLBACK_PX } },
  ];
  for (const { tier, urls, opts } of tiers) {
    for (const url of [...new Set(urls)]) {
      const res = await load(url);
      if (!res) continue;
      const png = await normalise(res.buf, opts).catch(() => null);
      if (png) return { png, tier, source: url === google ? "google-favicon" : url };
    }
  }
  return null;
}

async function pool(items, n, fn) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (queue.length) await fn(queue.shift());
    }),
  );
}

async function contactSheet(manifest, file) {
  const codes = Object.keys(manifest).sort();
  const cols = 12;
  const cell = 120;
  const rows = Math.ceil(codes.length / cols);
  const tiles = await Promise.all(
    codes.map(async (code, i) => {
      const label = Buffer.from(
        `<svg width="${cell}" height="20"><text x="${cell / 2}" y="14" font-size="12" font-family="monospace" text-anchor="middle" fill="#333">${code.replace(/&/g, "&amp;")}</text></svg>`,
      );
      const tile = await sharp({ create: { width: cell, height: cell, channels: 4, background: "#ffffff" } })
        .composite([
          { input: fs.readFileSync(path.join(OUT_DIR, `${code}.png`)), top: 6, left: 12 },
          { input: label, top: cell - 20, left: 0 },
        ])
        .png()
        .toBuffer();
      return { input: tile, top: Math.floor(i / cols) * cell, left: (i % cols) * cell };
    }),
  );
  await sharp({ create: { width: cols * cell, height: rows * cell, channels: 4, background: "#e5e5e5" } })
    .composite(tiles)
    .png()
    .toFile(file);
  console.log(`contact sheet: ${file} (${codes.length} logos)`);
}

async function main() {
  const manifest = readManifest();
  if (SHEET) return contactSheet(manifest, SHEET);

  const env = loadEnv(ROOT);
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY);
  const { data, error } = await supabase.from("company").select("code, name, website").order("code");
  if (error) throw error;

  const wanted = (data ?? []).filter((c) => {
    const code = String(c.code ?? "").toUpperCase();
    if (!code) return false;
    if (ONLY.length && !ONLY.includes(code)) return false;
    if (EXCLUDE[code]) return false;
    return FORCE || ONLY.length > 0 || !manifest[code];
  });
  // No website on file: look it up on Screener, one page at a time.
  const todo = [];
  const noSite = [];
  for (const c of wanted) {
    const site = siteUrl(c.website) ?? (await screenerWebsite(c.code.toUpperCase()));
    if (site) todo.push({ ...c, site, fromScreener: !siteUrl(c.website) });
    else noSite.push(c.code);
  }
  if (noSite.length) console.log(`no website found (on file or on Screener): ${noSite.join(", ")}`);
  console.log(`${data.length} companies · ${todo.length} to fetch${WRITE ? "" : " (dry run — pass --write)"}`);
  if (!WRITE) {
    for (const c of todo) console.log(`  ${c.code}  ${c.site}${c.fromScreener ? "  (via Screener)" : ""}`);
    return;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const misses = [];
  await pool(todo, CONCURRENCY, async (c) => {
    const code = c.code.toUpperCase();
    const got = await fetchLogo(c.site, { code, name: c.name ?? code });
    if (!got) {
      misses.push(code);
      return;
    }
    fs.writeFileSync(path.join(OUT_DIR, `${code}.png`), got.png);
    manifest[code] = {
      site: c.site.toString(),
      siteFrom: c.fromScreener ? "screener" : "company.website",
      tier: got.tier,
      source: got.source,
      fetchedAt: new Date().toISOString().slice(0, 10),
    };
    console.log(`  ok    ${code}  ${got.source}`);
  });
  for (const code of Object.keys(EXCLUDE)) {
    if (manifest[code]) {
      delete manifest[code];
      fs.rmSync(path.join(OUT_DIR, `${code}.png`), { force: true });
    }
  }

  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(MANIFEST, `${JSON.stringify(sorted, null, 2)}\n`);
  fs.writeFileSync(
    CODES_MODULE,
    [
      "// Generated by scripts/fetch-company-logos.mjs — do not edit by hand.",
      "// Companies with a logo at public/logos/<CODE>.png (record: data/company-logos.json).",
      "export const COMPANY_LOGO_CODES: ReadonlySet<string> = new Set([",
      ...Object.keys(sorted).map((code) => `  ${JSON.stringify(code)},`),
      "]);",
      "",
    ].join("\n"),
  );
  console.log(`\n${Object.keys(sorted).length} logos on file · ${misses.length} without a usable mark: ${misses.sort().join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
