import assert from "node:assert/strict";

import { BACKOFF_MS, withBackoff } from "../lib/read-backoff";

// A failed read is held off for BACKOFF_MS on this instance; arguments reach the read.
(async () => {
  let now = 1_000_000;
  const realNow = Date.now;
  Date.now = () => now;
  try {
    let calls = 0;
    let fail = true;
    const read = withBackoff("t", async (q: { fy: number }) => {
      calls += 1;
      if (fail) throw new Error("db down");
      return q.fy;
    });
    await assert.rejects(read({ fy: 2027 }), /db down/);
    await assert.rejects(read({ fy: 2027 }), /backing off/);
    assert.equal(calls, 1, "no re-read inside the window");
    fail = false;
    now += BACKOFF_MS;
    assert.equal(await read({ fy: 2027 }), 2027, "args forwarded after the window");
    assert.equal(calls, 2);
  } finally {
    Date.now = realNow;
  }
  console.log("All read-backoff tests passed.");
})();
