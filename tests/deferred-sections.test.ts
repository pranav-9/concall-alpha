import {
  DEFAULT_SWAP_HOLD_MS,
  HELD_SECTION_IDS,
  PRELOADED_SECTION_IDS,
  createChunkRegistry,
  createSwapController,
  holdUntilReady,
  schedulePreload,
  shouldSkipPreload,
  type PreloadWindow,
  type Timers,
} from "../lib/lazy-sections";
import { SECTIONS } from "../app/company/constants";

const assert = (cond: boolean, msg: string) => {
  if (!cond) { console.error("FAIL", msg); process.exit(1); }
  console.log("ok  ", msg);
};

type FakeWindow = PreloadWindow & {
  idleCalls: number;
  timerCalls: number;
  lastTimerMs: number;
  cleared: number[];
  cancelledIdle: number[];
  loadListeners: Array<() => void>;
};

const fakeWindow = (overrides: Partial<PreloadWindow> = {}): FakeWindow => {
  const win = {
    idleCalls: 0,
    timerCalls: 0,
    lastTimerMs: -1,
    cleared: [] as number[],
    cancelledIdle: [] as number[],
    loadListeners: [] as Array<() => void>,
    setTimeout(cb: () => void, ms: number) {
      win.timerCalls += 1;
      win.lastTimerMs = ms;
      cb();
      return 7;
    },
    clearTimeout(handle: number) {
      win.cleared.push(handle);
    },
    document: { readyState: "complete" },
    ...overrides,
  } as FakeWindow;
  return win;
};

// --- section ids stay in sync with the real section map ---------------------
{
  const known = new Set(SECTIONS.map((section) => section.id));
  for (const id of PRELOADED_SECTION_IDS) {
    assert(known.has(id), `preloaded id '${id}' is a real section id`);
  }
  for (const id of HELD_SECTION_IDS) {
    assert(PRELOADED_SECTION_IDS.includes(id), `held id '${id}' is also preloaded`);
  }
  assert(DEFAULT_SWAP_HOLD_MS === 1000, "default hold is 1000ms");
}

// --- shouldSkipPreload -------------------------------------------------------
assert(shouldSkipPreload(undefined) === false, "no navigator → preload");
assert(shouldSkipPreload({}) === false, "no connection API (Safari) → preload");
assert(shouldSkipPreload({ connection: {} }) === false, "connection without fields → preload");
assert(shouldSkipPreload({ connection: { saveData: false } }) === false, "saveData false → preload");
assert(shouldSkipPreload({ connection: { saveData: true } }) === true, "saveData → skip");
assert(shouldSkipPreload({ connection: { effectiveType: "2g" } }) === true, "2g → skip");
assert(shouldSkipPreload({ connection: { effectiveType: "2G" } }) === true, "2G (upper) → skip");
assert(shouldSkipPreload({ connection: { effectiveType: "slow-2g" } }) === true, "slow-2g → skip");
assert(shouldSkipPreload({ connection: { effectiveType: "3g" } }) === false, "3g → preload");
assert(shouldSkipPreload({ connection: { effectiveType: "4g", saveData: false } }) === false, "4g → preload");

// --- schedulePreload -----------------------------------------------------------
{
  let ran = 0;
  const handle = schedulePreload(() => { ran += 1; }, undefined);
  assert(handle.outcome === "no-window", "SSR: no window → no-window");
  handle.cancel();
  assert(ran === 0, "SSR: warm not called, cancel is a no-op");
}
{
  let ran = 0;
  const win = fakeWindow({
    requestIdleCallback(cb, opts) {
      win.idleCalls += 1;
      assert(opts?.timeout === 4000, "rIC gets the 4000ms ceiling by default");
      cb();
      return 1;
    },
  });
  assert(schedulePreload(() => { ran += 1; }, win).outcome === "idle", "rIC present → idle branch");
  assert(ran === 1 && win.idleCalls === 1 && win.timerCalls === 0, "rIC branch ran warm once, no timer");
}
{
  let ran = 0;
  const win = fakeWindow();
  assert(schedulePreload(() => { ran += 1; }, win).outcome === "timer", "rIC absent → timer branch");
  assert(ran === 1 && win.timerCalls === 1, "timer branch ran warm once");
  assert(win.lastTimerMs === 1500, "timer branch uses the 1500ms default");
  schedulePreload(() => undefined, win, { fallbackDelayMs: 200 });
  assert(win.lastTimerMs === 200, "timer branch honours fallbackDelayMs override");
}
{
  let seenTimeout = -1;
  const win = fakeWindow({
    requestIdleCallback(cb, opts) { seenTimeout = opts?.timeout ?? -1; cb(); return 1; },
  });
  schedulePreload(() => undefined, win, { idleTimeoutMs: 123 });
  assert(seenTimeout === 123, "rIC branch honours idleTimeoutMs override");
}
{
  let ran = 0;
  const win = fakeWindow({
    navigator: { connection: { saveData: true } },
    requestIdleCallback(cb) { win.idleCalls += 1; cb(); return 1; },
  });
  assert(schedulePreload(() => { ran += 1; }, win).outcome === "skipped-network", "saveData → skipped");
  assert(ran === 0 && win.idleCalls === 0, "skipped: nothing scheduled");
}
{
  // Document still streaming: nothing is scheduled until `load`.
  let ran = 0;
  const win = fakeWindow({
    document: { readyState: "loading" },
    addEventListener(_type, listener) { win.loadListeners.push(listener); },
    removeEventListener(_type, listener) { win.loadListeners = win.loadListeners.filter((l) => l !== listener); },
    requestIdleCallback(cb) { win.idleCalls += 1; cb(); return 1; },
  });
  const handle = schedulePreload(() => { ran += 1; }, win);
  assert(handle.outcome === "after-load", "streaming document → after-load branch");
  assert(ran === 0 && win.loadListeners.length === 1, "after-load: warm deferred, one load listener");
  win.loadListeners[0]();
  assert(ran === 1 && win.idleCalls === 1, "after-load: load event schedules idle, warm runs once");
}
{
  // Cancel before load fires: listener removed, warm never runs.
  let ran = 0;
  const win = fakeWindow({
    document: { readyState: "interactive" },
    addEventListener(_type, listener) { win.loadListeners.push(listener); },
    removeEventListener(_type, listener) { win.loadListeners = win.loadListeners.filter((l) => l !== listener); },
  });
  const handle = schedulePreload(() => { ran += 1; }, win);
  handle.cancel();
  assert(win.loadListeners.length === 0 && ran === 0, "cancel before load removes the listener");
}
{
  // Cancel after rIC scheduled (rIC that does not fire synchronously).
  const win = fakeWindow({
    requestIdleCallback() { win.idleCalls += 1; return 42; },
    cancelIdleCallback(handle) { win.cancelledIdle.push(handle); },
  });
  const handle = schedulePreload(() => undefined, win);
  handle.cancel();
  assert(win.cancelledIdle.join() === "42", "cancel cancels the idle callback handle");
}
{
  // Cancel after timer scheduled (timer that does not fire synchronously).
  const win = fakeWindow({ setTimeout() { win.timerCalls += 1; return 9; } });
  const handle = schedulePreload(() => undefined, win);
  handle.cancel();
  assert(win.cleared.join() === "9", "cancel clears the fallback timer");
}

// --- createChunkRegistry ---------------------------------------------------------
const main = async () => {
  let loadsA = 0;
  let loadsB = 0;
  let failOnce = true;
  const registry = createChunkRegistry({
    a: [async () => { loadsA += 1; }],
    b: [
      async () => { loadsB += 1; },
      async () => {
        if (failOnce) { failOnce = false; throw new Error("chunk 404"); }
      },
    ],
    empty: [],
  });

  assert(registry.has("a") && registry.has("b"), "has(): sections with loaders (no hold list → all held)");
  assert(!registry.has("empty") && !registry.has("nope"), "has(): empty/unknown → false");

  await registry.ensure("nope");
  await registry.ensure("empty");
  assert(true, "ensure(): unknown and empty ids resolve immediately");

  await Promise.all([registry.ensure("a"), registry.ensure("a")]);
  await registry.ensure("a");
  assert(loadsA === 1, "ensure(): concurrent + repeat calls share one load");

  let rejected = false;
  await registry.ensure("b").catch(() => { rejected = true; });
  assert(rejected && loadsB === 1, "ensure(): a failing loader rejects the section promise");
  await registry.ensure("b");
  assert(loadsB === 2, "ensure(): a rejected load is evicted so the next call retries");

  {
    // Waits for every loader of a section, not just the first.
    let releaseSlow!: () => void;
    const slow = new Promise<void>((r) => { releaseSlow = r; });
    const multi = createChunkRegistry({ m: [async () => undefined, () => slow] });
    let settled = false;
    void multi.ensure("m").then(() => { settled = true; });
    await new Promise((r) => setTimeout(r, 0));
    assert(!settled, "ensure(): pending while a second loader is still loading");
    releaseSlow();
    await new Promise((r) => setTimeout(r, 0));
    assert(settled, "ensure(): settles once every loader has loaded");
  }

  {
    // Hold list: warmed but not held.
    let loads = 0;
    const scoped = createChunkRegistry(
      { held: [async () => { loads += 1; }], warmOnly: [async () => { loads += 1; }] },
      { hold: ["held"] },
    );
    assert(scoped.has("held") && !scoped.has("warmOnly"), "has(): only ids in the hold list are held");
    scoped.warmAll();
    await new Promise((r) => setTimeout(r, 0));
    assert(loads === 2, "warmAll(): warms held and warm-only ids alike");
    await scoped.ensure("warmOnly");
    assert(loads === 2, "ensure() after warmAll(): cache hit, no second load");
  }

  let warmLoads = 0;
  const warmRegistry = createChunkRegistry({
    x: [async () => { warmLoads += 1; }],
    y: [async () => { throw new Error("boom"); }],
  });
  warmRegistry.warmAll();
  await new Promise((r) => setTimeout(r, 0));
  assert(warmLoads === 1, "warmAll(): kicks every loader and swallows failures");

  // --- holdUntilReady ----------------------------------------------------------
  const immediateTimers: Timers = { setTimeout: (cb) => { cb(); return 1; }, clearTimeout: () => undefined };
  const cleared: number[] = [];
  const neverTimers: Timers = { setTimeout: () => 5, clearTimeout: (h) => { cleared.push(h); } };
  assert(
    (await holdUntilReady(Promise.resolve(), 1000, neverTimers)) === "ready",
    "holdUntilReady: resolved chunk → ready",
  );
  assert(cleared.join() === "5", "holdUntilReady: timer cleared once ready wins");
  assert(
    (await holdUntilReady(Promise.reject(new Error("x")), 1000, neverTimers)) === "ready",
    "holdUntilReady: rejected chunk still releases the swap (mount surfaces the error)",
  );
  assert(
    (await holdUntilReady(new Promise(() => undefined), 1000, immediateTimers)) === "timeout",
    "holdUntilReady: never-resolving chunk → timeout releases the swap",
  );
  {
    let fire!: () => void;
    const timers: Timers = { setTimeout: (cb) => { fire = cb; return 1; }, clearTimeout: () => undefined };
    let resolveReady!: () => void;
    const p = holdUntilReady(new Promise<void>((r) => { resolveReady = r; }), 1000, timers);
    resolveReady();
    assert((await p) === "ready", "holdUntilReady: ready wins when it settles first");
    fire();
    assert((await p) === "ready", "holdUntilReady: a late timer does not flip the outcome");
  }
  {
    let fire!: () => void;
    const timers: Timers = { setTimeout: (cb) => { fire = cb; return 1; }, clearTimeout: () => undefined };
    let resolveReady!: () => void;
    const p = holdUntilReady(new Promise<void>((r) => { resolveReady = r; }), 1000, timers);
    fire();
    assert((await p) === "timeout", "holdUntilReady: timeout wins when it fires first");
    resolveReady();
    assert((await p) === "timeout", "holdUntilReady: a late chunk does not flip the outcome");
  }
  assert(
    (await holdUntilReady(new Promise(() => undefined), 5)) === "timeout",
    "holdUntilReady: default timers → real timeout",
  );

  // --- createSwapController ------------------------------------------------------
  {
    const released: string[] = [];
    const pending = new Map<string, () => void>();
    const ensure = (id: string) =>
      id === "overview"
        ? Promise.resolve()
        : new Promise<void>((r) => { pending.set(id, r); });
    const controller = createSwapController({
      shouldHold: (id) => id !== "overview",
      ensure,
      onRelease: (id) => released.push(id),
      timers: neverTimers,
    });

    const first = controller.commit("overview");
    assert(released.join() === "overview", "swap: non-held id releases synchronously");
    assert((await first) === "immediate", "swap: non-held outcome is immediate");

    const a = controller.commit("a");
    assert(released.join() === "overview", "swap: held id does not release before its chunk");
    const b = controller.commit("b");
    pending.get("a")!();
    assert((await a) === "stale", "swap: an older hold resolving after a newer tap is dropped");
    assert(released.join() === "overview", "swap: stale hold did not swap the panel back");
    pending.get("b")!();
    assert((await b) === "ready", "swap: the latest tap releases when its chunk lands");
    assert(released.join() === "overview,b", "swap: latest tap wins");

    const cached = controller.commit("b");
    pending.get("b")!();
    assert((await cached) === "ready" && released.at(-1) === "b", "swap: repeat tap releases again");

    const timedOut = createSwapController({
      shouldHold: () => true,
      ensure: () => new Promise(() => undefined),
      onRelease: (id) => released.push(`t:${id}`),
      timers: immediateTimers,
    });
    assert((await timedOut.commit("z")) === "timeout" && released.at(-1) === "t:z", "swap: timeout still releases (skeleton path)");

    const disposedReleases: string[] = [];
    const disposable = createSwapController({
      shouldHold: () => true,
      ensure: (id) => new Promise<void>((r) => { pending.set(id, r); }),
      onRelease: (id) => disposedReleases.push(id),
      timers: neverTimers,
    });
    const d = disposable.commit("d");
    disposable.dispose();
    pending.get("d")!();
    assert((await d) === "disposed" && disposedReleases.length === 0, "swap: no release after dispose (unmount)");
  }

  console.log("all deferred-sections checks passed");
};

main().catch((error) => {
  console.error("FAIL", error);
  process.exit(1);
});
