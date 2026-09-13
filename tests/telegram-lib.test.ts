import assert from "node:assert/strict";

import {
  MIN_FEATURE_WEIGHT,
  buildSectionLink,
  buildTexts,
  compareCards,
  esc,
  getArg,
  isCandidate,
  isPostableCard,
  isSiteRelativeHref,
  parseEnvText,
  parseIntArg,
  parseLedgerText,
  stripLtd,
} from "../scripts/lib/telegram-lib.mjs";

const SITE = "https://storyofastock.in";
const card = {
  id: "guidance-PAYTM-2027Q1",
  company_code: "PAYTM",
  company_name: "One 97 Communications Limited",
  sector: "Financial Services",
  section: "guidance",
  tag_label: "Guidance re-read",
  change_kind: "new_coverage",
  headline: "Monetise the installed base: MDR-bearing mix & merchant credit",
  summary: "The bet: hold payment margin >4 bps.",
  section_href: "/company/PAYTM#guidance-history",
  feature_weight: 66,
  published_at: "2026-09-12T10:20:58Z",
  status: "eligible",
};

// ── args ────────────────────────────────────────────────────────────────────
assert.equal(getArg(["--days", "30"], "--days", "14"), "30");
assert.equal(getArg(["--card"], "--card"), null, "flag with no value → default");
assert.equal(getArg(["--card", "--send"], "--card"), null, "a following flag is not a value");
assert.equal(getArg([], "--days", "14"), "14");
assert.equal(parseIntArg("14", "--days"), 14);
assert.equal(parseIntArg(null, "--thread-id"), null);
assert.throws(() => parseIntArg("abc", "--days"), /integer/);
assert.throws(() => parseIntArg("-5", "--days", { min: 1 }), />= 1/);

// ── .env parsing ────────────────────────────────────────────────────────────
{
  const { env, duplicates } = parseEnvText(
    [
      "# comment",
      "PLAIN=abc",
      'QUOTED="123:abc def"',
      "SINGLE='x=y'",
      "INLINE=-100123 # the group",
      "export EXPORTED=ok",
      "EQUALS=a=b=c",
      "PLAIN=second",
      "",
      "NOEQ",
    ].join("\n"),
  );
  assert.equal(env.QUOTED, "123:abc def", "quotes stripped, inner content kept");
  assert.equal(env.SINGLE, "x=y", "single quotes; first = splits");
  assert.equal(env.INLINE, "-100123", "inline comment after value dropped");
  assert.equal(env.EXPORTED, "ok");
  assert.equal(env.EQUALS, "a=b=c");
  assert.equal(env.PLAIN, "second", "last write wins, like dotenv");
  assert.deepEqual(duplicates, ["PLAIN"], "duplicate keys are reported");
  assert.equal("NOEQ" in env, false);
}
{
  const { env } = parseEnvText('CHAT="-100123" # the group\nTHREAD=\'2\' # updates topic\nODD="a # b"');
  assert.equal(env.CHAT, "-100123", "quoted value followed by an inline comment is unquoted");
  assert.equal(env.THREAD, "2");
  assert.equal(env.ODD, "a # b", "a # inside quotes is content");
}

// ── ledger parsing ──────────────────────────────────────────────────────────
{
  const { byCard, rows, malformed } = parseLedgerText(
    [
      JSON.stringify({ card_id: "a", status: "posted", posted_on: "2026-09-13" }),
      JSON.stringify({ card_id: "b", status: "drafted" }),
      JSON.stringify({ card_id: null, status: "posted" }),
      "not json",
      "",
    ].join("\n"),
  );
  assert.equal(rows, 3);
  assert.equal(malformed, 1);
  assert.equal(byCard.has("a"), true, "posted rows dedupe");
  assert.equal(byCard.has("b"), false, "drafted rows do not");
  assert.equal(byCard.size, 1, "null card_id never enters the map");
}
assert.equal(parseLedgerText("").byCard.size, 0, "empty ledger");

// ── formatting ──────────────────────────────────────────────────────────────
assert.equal(esc("a & <b> > c"), "a &amp; &lt;b&gt; &gt; c");
assert.equal(esc(null), "");
assert.equal(stripLtd("Suzlon Energy Limited"), "Suzlon Energy");
assert.equal(stripLtd("Kalyan Jewellers Ltd."), "Kalyan Jewellers");
assert.equal(stripLtd("One 97 Communications"), "One 97 Communications");

{
  const { url, campaign } = buildSectionLink(card, SITE);
  assert.equal(campaign, "guidance-paytm-2027q1");
  assert.equal(
    url,
    "https://storyofastock.in/company/PAYTM?utm_source=telegram&utm_medium=community&utm_campaign=guidance-paytm-2027q1#guidance-history",
    "UTM params sit before the #fragment",
  );
}
{
  // A section_href that already carries a query keeps it and appends UTM.
  const { url } = buildSectionLink({ ...card, section_href: "/company/PAYTM?tab=guidance#x" }, SITE + "/");
  const u = new URL(url);
  assert.equal(u.searchParams.get("tab"), "guidance");
  assert.equal(u.searchParams.get("utm_source"), "telegram");
  assert.equal(u.hash, "#x");
}
{
  // Odd characters in the id are encoded, not spliced raw into the query.
  const { url } = buildSectionLink({ ...card, id: "weird id&x", section_href: "/company/X" }, SITE);
  assert.equal(new URL(url).searchParams.get("utm_campaign"), "weird id&x");
  assert.equal(url.includes("&x"), false);
}
assert.equal(
  buildSectionLink({ ...card, section_href: null }, SITE).url.startsWith(SITE + "/company/PAYTM?"),
  true,
  "missing href falls back to the company page",
);
assert.throws(() => buildSectionLink({ ...card, section_href: "https://evil.example/x" }, SITE), /site-relative/);
// Protocol-relative and backslash forms resolve to a foreign host under WHATWG URL — never ship them.
for (const href of ["//evil.example/x", "/\\evil.example/x", "//evil.example"]) {
  assert.throws(() => buildSectionLink({ ...card, section_href: href }, SITE), /site-relative/, href);
  assert.equal(isPostableCard({ ...card, section_href: href }), false, `${href} is not postable`);
  assert.equal(isSiteRelativeHref(href), false);
}
assert.equal(isSiteRelativeHref("/company/X#y"), true);
assert.equal(new URL(buildSectionLink(card, SITE).url).origin, SITE, "link always stays on our origin");

{
  const { html, plain, url } = buildTexts(card, SITE);
  assert.equal(html.split("\n")[0], "<b>One 97 Communications</b> (PAYTM) · Guidance · new coverage");
  assert.equal(html.includes("&amp; merchant credit"), true, "headline & is escaped in HTML");
  assert.equal(html.includes("&gt;4 bps"), true, "summary > is escaped");
  assert.equal(html.includes(`Full read: ${esc(url)}`), true, "URL & are escaped in HTML mode");
  assert.equal(plain.includes(`Full read: ${url}`), true, "plain keeps the raw URL");
  assert.equal(plain.startsWith("One 97 Communications (PAYTM) · Guidance · new coverage\n"), true);
  assert.equal(html.endsWith("/how-scores-work</i>"), true, "disclaimer closes every message");
  assert.equal(plain.includes("&amp;"), false, "plain text is never HTML-escaped");
}
{
  const { html } = buildTexts({ ...card, section: "mystery", change_kind: "odd" }, SITE);
  assert.equal(html.includes("· mystery · odd"), true, "unknown labels fall back to the raw value");
}

// ── postable gate ───────────────────────────────────────────────────────────
assert.equal(isPostableCard(card), true);
assert.equal(isPostableCard({ ...card, feature_weight: MIN_FEATURE_WEIGHT - 1 }), false, "below the desk floor");
assert.equal(isPostableCard({ ...card, feature_weight: MIN_FEATURE_WEIGHT }), true, "floor is inclusive");
assert.equal(isPostableCard({ ...card, status: "retired" }), false);
assert.equal(isPostableCard({ ...card, headline: "  " }), false, "blank headline");
assert.equal(isPostableCard({ ...card, summary: null }), false);
assert.equal(isPostableCard({ ...card, section_href: "company/X" }), false, "href must be site-relative");
assert.equal(isPostableCard({ ...card, section: "mystery" }), false, "unknown section is not postable");
assert.equal(isPostableCard({ ...card, change_kind: "odd" }), false, "unknown change_kind is not postable");

// ── candidate shape (what the sender trusts from the drafter's JSON) ─────────
assert.equal(isCandidate({ card_id: "a", text_html: "<b>x</b>", company_code: "A" }), true);
assert.equal(isCandidate({ card_id: "a", text_html: "" }), false, "empty text");
assert.equal(isCandidate({ card_id: { id: 1 }, text_html: "x" }), false, "card_id must be a string");
assert.equal(isCandidate({ card_id: "a", text_html: "x", section: 3 }), false, "section must be a string when present");
assert.equal(isCandidate(null), false);
assert.equal(isPostableCard(null), false);

// ── ordering ────────────────────────────────────────────────────────────────
{
  const a = { id: "a", feature_weight: 60, published_at: "2026-09-10T00:00:00Z" };
  const b = { id: "b", feature_weight: 66, published_at: "2026-09-01T00:00:00Z" };
  const c = { id: "c", feature_weight: 60, published_at: "2026-09-12T00:00:00Z" };
  const d = { id: "d", feature_weight: 60, published_at: "2026-09-12T00:00:00Z" };
  const sorted = [a, b, c, d].sort(compareCards).map((x) => x.id);
  assert.deepEqual(sorted, ["b", "c", "d", "a"], "weight desc, then newest, then id on a full tie");
  assert.equal(compareCards(c, d) + compareCards(d, c), 0, "comparator is antisymmetric");
}

console.log("telegram-lib: ok");
