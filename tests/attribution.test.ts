import assert from "node:assert/strict";

import {
  MAX_REFERRER_LENGTH,
  MAX_UTM_LENGTH,
  extractReferrerHost,
  getOwnHosts,
  isInternalHost,
  normalizeExternalReferrer,
  parseUtmParams,
  sanitizeUtmValue,
} from "../lib/attribution";

const OWN = ["storyofastock.in", "localhost"];

// sanitizeUtmValue: trim, strip control chars, cap, null when empty.
assert.equal(sanitizeUtmValue("twitter"), "twitter");
assert.equal(sanitizeUtmValue("  twitter  "), "twitter");
assert.equal(sanitizeUtmValue("summer-sale_2026"), "summer-sale_2026", "hyphens/underscores survive");
assert.equal(sanitizeUtmValue("bad\nvalue\x00"), "badvalue", "control chars stripped");
assert.equal(sanitizeUtmValue(""), null);
assert.equal(sanitizeUtmValue("   "), null);
assert.equal(sanitizeUtmValue(42), null);
assert.equal(sanitizeUtmValue(null), null);
assert.equal(sanitizeUtmValue("x".repeat(500))?.length, MAX_UTM_LENGTH, "capped at MAX_UTM_LENGTH");

// parseUtmParams: leading "?" optional, missing keys null, first value wins.
const utm = parseUtmParams("?utm_source=twitter&utm_medium=social&utm_campaign=neuland");
assert.equal(utm.utmSource, "twitter");
assert.equal(utm.utmMedium, "social");
assert.equal(utm.utmCampaign, "neuland");
assert.equal(utm.utmContent, null);
assert.equal(utm.utmTerm, null);
assert.equal(parseUtmParams("utm_source=reddit").utmSource, "reddit", "no leading ? works");
assert.equal(parseUtmParams("utm_source=a&utm_source=b").utmSource, "a", "first value wins");
assert.equal(parseUtmParams("").utmSource, null);
assert.equal(parseUtmParams("foo=bar").utmSource, null);

// extractReferrerHost: http(s) only, lowercased host, null on junk.
assert.equal(extractReferrerHost("https://T.CO/abc123"), "t.co");
assert.equal(extractReferrerHost("http://www.google.com/search?q=x"), "www.google.com");
assert.equal(extractReferrerHost("javascript:alert(1)"), null);
assert.equal(extractReferrerHost("data:text/html,x"), null);
assert.equal(extractReferrerHost("not a url"), null);
assert.equal(extractReferrerHost(""), null);
assert.equal(extractReferrerHost(null), null);

// isInternalHost: own host, www variants, any *.vercel.app, null host.
assert.equal(isInternalHost("storyofastock.in", OWN), true);
assert.equal(isInternalHost("www.storyofastock.in", OWN), true);
assert.equal(isInternalHost("concall-alpha.vercel.app", OWN), true, "*.vercel.app is internal");
assert.equal(isInternalHost("concall-alpha-abc123.vercel.app", OWN), true, "preview deploys internal");
assert.equal(isInternalHost("localhost", OWN), true);
assert.equal(isInternalHost(null, OWN), true, "no host counts as internal");
assert.equal(isInternalHost("t.co", OWN), false);
assert.equal(isInternalHost("valuepickr.com", OWN), false);

// normalizeExternalReferrer: verbatim external URL or null.
assert.equal(
  normalizeExternalReferrer("https://t.co/abc123", OWN),
  "https://t.co/abc123",
  "external referrer stored verbatim",
);
assert.equal(normalizeExternalReferrer("https://storyofastock.in/company/NH", OWN), null);
assert.equal(normalizeExternalReferrer("https://concall-alpha.vercel.app/", OWN), null);
assert.equal(normalizeExternalReferrer("http://localhost:3000/company", OWN), null);
assert.equal(normalizeExternalReferrer("javascript:alert(1)", OWN), null);
assert.equal(normalizeExternalReferrer("", OWN), null);
assert.equal(normalizeExternalReferrer(undefined, OWN), null);
assert.equal(normalizeExternalReferrer(123, OWN), null);
assert.equal(
  normalizeExternalReferrer(`https://x.com/${"a".repeat(MAX_REFERRER_LENGTH)}`, OWN),
  null,
  "oversize referrer dropped",
);

// getOwnHosts: fallback chain, protocol optional, deduped, localhost always present.
const hosts = getOwnHosts({
  NEXT_PUBLIC_SITE_URL: "https://storyofastock.in",
  VERCEL_URL: "concall-alpha-abc.vercel.app",
});
assert.ok(hosts.includes("storyofastock.in"));
assert.ok(hosts.includes("concall-alpha-abc.vercel.app"), "bare host env accepted");
assert.ok(hosts.includes("localhost"));
assert.deepEqual(
  getOwnHosts({ NEXT_PUBLIC_SITE_URL: "https://a.in", VERCEL_URL: "https://a.in" }).filter(
    (h) => h === "a.in",
  ),
  ["a.in"],
  "deduped",
);
assert.ok(getOwnHosts({}).includes("localhost"), "empty env still yields localhost");

console.log("attribution.test.ts ok");
