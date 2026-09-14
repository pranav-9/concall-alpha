import assert from "node:assert/strict";
import test from "node:test";

import { createRetryingFetch } from "../lib/supabase/fetch-with-retry";

const URL_ = "https://example.supabase.co/rest/v1/company?select=code";
const DELAYS = [1, 2, 3];

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// A scripted fetch: each call returns (or throws) the next step.
function scripted(steps: Array<Response | Error>) {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    const step = steps[Math.min(calls.length - 1, steps.length - 1)];
    if (step instanceof Error) throw step;
    return step.clone();
  }) as typeof fetch;
  return { fetchImpl, calls };
}

function setup(steps: Array<Response | Error>) {
  const { fetchImpl, calls } = scripted(steps);
  const slept: number[] = [];
  const retryingFetch = createRetryingFetch({
    fetchImpl,
    delaysMs: DELAYS,
    sleep: async (ms) => {
      slept.push(ms);
    },
    onRetry: () => {},
  });
  return { retryingFetch, calls, slept };
}

test("a gateway timeout on a read is retried and the recovery returned", async () => {
  const { retryingFetch, calls, slept } = setup([
    json(504, { message: "Gateway Timeout" }),
    json(200, [{ code: "ASTRAMICRO" }]),
  ]);
  const res = await retryingFetch(URL_);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), [{ code: "ASTRAMICRO" }]);
  assert.equal(calls.length, 2);
  assert.deepEqual(slept, [1]);
});

test("a persistent 5xx gives up after the last delay and returns that response", async () => {
  const { retryingFetch, calls, slept } = setup([json(502, { message: "Bad Gateway" })]);
  const res = await retryingFetch(URL_, { method: "GET" });
  assert.equal(res.status, 502);
  assert.equal(calls.length, DELAYS.length + 1);
  assert.deepEqual(slept, DELAYS);
});

test("the gateway's project-config failure is retried whatever its status", async () => {
  const { retryingFetch, calls } = setup([
    json(401, { message: "Failed to get project config" }),
    json(200, []),
  ]);
  const res = await retryingFetch(URL_);
  assert.equal(res.status, 200);
  assert.equal(calls.length, 2);
});

test("a real PostgREST client error is returned at once, not retried", async () => {
  const { retryingFetch, calls, slept } = setup([
    json(400, { code: "42703", message: "column company.nope does not exist" }),
  ]);
  const res = await retryingFetch(URL_);
  assert.equal(res.status, 400);
  assert.equal(calls.length, 1);
  assert.deepEqual(slept, []);
});

test("writes and RPC posts are never retried", async () => {
  for (const method of ["POST", "PATCH", "DELETE"]) {
    const { retryingFetch, calls } = setup([json(504, { message: "Gateway Timeout" })]);
    const res = await retryingFetch(URL_, { method, body: "{}" });
    assert.equal(res.status, 504, method);
    assert.equal(calls.length, 1, method);
  }
});

test("a network error on a read is retried, and rethrown once retries run out", async () => {
  const recovered = setup([new TypeError("fetch failed"), json(200, [])]);
  assert.equal((await recovered.retryingFetch(URL_)).status, 200);
  assert.equal(recovered.calls.length, 2);

  const dead = setup([new TypeError("fetch failed")]);
  await assert.rejects(dead.retryingFetch(URL_), /fetch failed/);
  assert.equal(dead.calls.length, DELAYS.length + 1);
});

test("an aborted read is not retried", async () => {
  const controller = new AbortController();
  controller.abort();
  const { retryingFetch, calls } = setup([new DOMException("aborted", "AbortError")]);
  await assert.rejects(retryingFetch(URL_, { signal: controller.signal }));
  assert.equal(calls.length, 1);
});

test("a GET Request object is treated as a read", async () => {
  const { retryingFetch, calls } = setup([json(503, {}), json(200, [])]);
  const res = await retryingFetch(new Request(URL_));
  assert.equal(res.status, 200);
  assert.equal(calls.length, 2);
});
