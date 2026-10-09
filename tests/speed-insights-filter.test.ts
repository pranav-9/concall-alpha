import assert from "node:assert/strict";
import test from "node:test";

import { isInternalPath } from "../lib/speed-insights-filter";

const SITE = "https://concall-alpha.vercel.app";

test("admin and dev pages are internal", () => {
  for (const path of ["/admin", "/admin/", "/admin/ops", "/admin/accounts?range=30d", "/dev/quality"]) {
    assert.equal(isInternalPath(`${SITE}${path}`), true, path);
  }
});

test("reader pages are not internal", () => {
  for (const path of ["/", "/desk", "/company/NEULANDLAB", "/leaderboards?tab=growth", "/blog/pocl-lead-press-ran-slow"]) {
    assert.equal(isInternalPath(`${SITE}${path}`), false, path);
  }
});

test("matches the first path segment only, not a prefix or a later segment", () => {
  assert.equal(isInternalPath(`${SITE}/administrator`), false);
  assert.equal(isInternalPath(`${SITE}/developers`), false);
  assert.equal(isInternalPath(`${SITE}/company/admin`), false);
  assert.equal(isInternalPath(`${SITE}/blog/dev`), false);
});

test("query string and hash are ignored", () => {
  assert.equal(isInternalPath(`${SITE}/desk?ref=admin#dev`), false);
  assert.equal(isInternalPath(`${SITE}/admin?tab=x#y`), true);
});

test("a bare path works as well as a full URL", () => {
  assert.equal(isInternalPath("/admin/ops"), true);
  assert.equal(isInternalPath("/desk"), false);
});

test("an unreadable URL is kept, never dropped", () => {
  assert.equal(isInternalPath("http://[::1"), false);
  assert.equal(isInternalPath(""), false);
});
