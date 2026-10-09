import assert from "node:assert/strict";
import test from "node:test";

import { navbarUserFromClaims, resolveReaderWatchlist } from "../lib/reader-identity";

// Regression guard for /leaderboards, /scanners and /quarter-tracker: each page
// used to await the auth check, then (on /leaderboards) the watchlist query, in
// front of its data. They now start resolveReaderWatchlist() inside their
// Promise.all, so its result must match what the inline code produced:
// signed out → { null, null }; signed in → the reader's codes (possibly []).

function deps(opts: {
  userId?: string | null;
  authThrows?: boolean;
  codes?: string[];
  codesThrow?: boolean;
}) {
  const codeCalls: string[] = [];
  return {
    codeCalls,
    getUserId: async () => {
      if (opts.authThrows) throw new Error("auth down");
      return opts.userId ?? null;
    },
    getCodes: async (userId: string) => {
      codeCalls.push(userId);
      if (opts.codesThrow) throw new Error("watchlist query failed");
      return opts.codes ?? [];
    },
  };
}

test("signed out: no reader, no codes, and the watchlist is never queried", async () => {
  const d = deps({ userId: null });
  assert.deepEqual(await resolveReaderWatchlist(d), { userId: null, codes: null });
  assert.deepEqual(d.codeCalls, []);
});

test("signed in with a watchlist: the reader's codes", async () => {
  const d = deps({ userId: "u1", codes: ["NEULANDLAB", "AEROFLEX"] });
  assert.deepEqual(await resolveReaderWatchlist(d), {
    userId: "u1",
    codes: ["NEULANDLAB", "AEROFLEX"],
  });
  assert.deepEqual(d.codeCalls, ["u1"]);
});

test("signed in with an empty watchlist: an empty list, not null", async () => {
  const d = deps({ userId: "u1", codes: [] });
  assert.deepEqual(await resolveReaderWatchlist(d), { userId: "u1", codes: [] });
});

test("auth check throws: reads as signed out", async () => {
  const d = deps({ authThrows: true });
  assert.deepEqual(await resolveReaderWatchlist(d), { userId: null, codes: null });
  assert.deepEqual(d.codeCalls, []);
});

test("watchlist query throws: the reader stays signed in with an empty list", async () => {
  // A signed-in reader must never fall behind the leaderboard's sign-up gate
  // because the watchlist read blipped.
  const d = deps({ userId: "u1", codesThrow: true });
  assert.deepEqual(await resolveReaderWatchlist(d), { userId: "u1", codes: [] });
});

test("navbar user: null claims read as signed out", () => {
  assert.equal(navbarUserFromClaims(null), null);
  assert.equal(navbarUserFromClaims(undefined), null);
  assert.equal(navbarUserFromClaims({ sub: "" }), null);
});

test("navbar user: an email-only account has no name or avatar", () => {
  assert.deepEqual(navbarUserFromClaims({ sub: "u1", email: "reader@example.com" }), {
    email: "reader@example.com",
    name: null,
    avatar: null,
  });
});

test("navbar user: name and avatar come from user_metadata", () => {
  assert.deepEqual(
    navbarUserFromClaims({
      sub: "u1",
      email: "reader@example.com",
      user_metadata: { full_name: "A Reader", avatar_url: "https://example.com/a.png" },
    }),
    { email: "reader@example.com", name: "A Reader", avatar: "https://example.com/a.png" },
  );
});

test("navbar user: non-string metadata is ignored, not rendered", () => {
  assert.deepEqual(
    navbarUserFromClaims({ sub: "u1", user_metadata: { full_name: 42, avatar_url: null } }),
    { email: null, name: null, avatar: null },
  );
});
