// Pure helpers behind the company page's lazily-loaded section chunks.
//
// The workspace mounts ONE panel at a time. Two panels (ConcallScore, Guidance
// History) are client-only chunks that are not in the initial bundle, and one
// embedded block (Business Momentum, inside the Business panel) plus the KPI
// sparklines share the recharts chunk. Two things have to be true for a tab
// tap to be shift-free:
//
//   1. The chunk should usually be warm before the tap  → schedulePreload
//   2. If it is not, the old panel stays on screen until the chunk arrives
//      (bounded), instead of swapping to a placeholder that changes height
//      when the real section lands                        → createSwapController
//
//   tap ──► shouldHold(id)? ──no──► release now
//              │yes
//              ▼
//         ensure(id) ──┬─ cached ──────────────────────────► release now
//                      └─ fetching ─► race(DEFAULT_SWAP_HOLD_MS) ─► release on resolve
//                                            └─ timeout ────────► release (skeleton shows)
//
// Field mobile CLS on /company was 0.45–0.64 p75 (2026-09-05) purely from the
// placeholder → real-section swap ~0.9s after the tap (outside the 500ms
// hadRecentInput exclusion). No DOM here so every branch runs in `tests/`.

export type ChunkLoader = () => Promise<unknown>;

/** Section ids whose panel swap is held until their chunk is in. */
export const HELD_SECTION_IDS = ["sentiment-score", "guidance-history"] as const;
export type HeldSectionId = (typeof HELD_SECTION_IDS)[number];

/**
 * Section ids whose chunks are warmed on idle. The Business and Variables tabs
 * are warmed (their sparklines share the recharts chunk) but NOT held: nothing
 * on those tabs shifts without the chunk, so a hold would only delay the tap.
 */
export const PRELOADED_SECTION_IDS = [
  ...HELD_SECTION_IDS,
  "business-overview",
  "key-variables",
] as const;
export type PreloadedSectionId = (typeof PRELOADED_SECTION_IDS)[number];

/** Longest the previous panel stays on screen waiting for a held section's chunk. */
export const DEFAULT_SWAP_HOLD_MS = 1000;

export type NetworkInformationLike = {
  saveData?: boolean;
  effectiveType?: string;
};

export type PreloadWindow = {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
  setTimeout: (callback: () => void, ms: number) => number;
  clearTimeout: (handle: number) => void;
  addEventListener?: (type: "load", listener: () => void, options?: { once: boolean }) => void;
  removeEventListener?: (type: "load", listener: () => void) => void;
  document?: { readyState: string };
  navigator?: { connection?: NetworkInformationLike };
};

export type PreloadOutcome = "idle" | "timer" | "after-load" | "skipped-network" | "no-window";

export type PreloadHandle = {
  outcome: PreloadOutcome;
  /** Undo whatever was scheduled (unmount before the preload fired). */
  cancel: () => void;
};

const SLOW_EFFECTIVE_TYPES = new Set(["slow-2g", "2g"]);

/**
 * Save-Data or a 2G-class connection means the visitor is paying for every
 * byte; do not spend ~120KB gz on chunks they may never open. A missing API
 * (Safari) is NOT a reason to skip — most iOS visitors are on fast networks.
 */
export function shouldSkipPreload(navigator: PreloadWindow["navigator"]): boolean {
  const connection = navigator?.connection;
  if (!connection) return false;
  if (connection.saveData === true) return true;
  return SLOW_EFFECTIVE_TYPES.has((connection.effectiveType ?? "").toLowerCase());
}

/**
 * Run `warm` once the page is idle — and never before the document stream has
 * closed. On this route the HTML streams for seconds after hydration (every
 * panel's Suspense payload rides the same response), so "CPU idle" arrives
 * while the network is still busy with the panel the reader is looking at.
 * Waiting for `load` (which fires after the last boundary flushes) keeps the
 * preload off that critical path. requestIdleCallback where it exists (with a
 * ceiling so a busy main thread cannot defer it forever), a plain timer where
 * it does not (Safari).
 */
export function schedulePreload(
  warm: () => void,
  win: PreloadWindow | undefined = typeof window === "undefined"
    ? undefined
    : (window as unknown as PreloadWindow),
  options: { idleTimeoutMs?: number; fallbackDelayMs?: number } = {},
): PreloadHandle {
  const noop = () => undefined;
  if (!win) return { outcome: "no-window", cancel: noop };
  if (shouldSkipPreload(win.navigator)) return { outcome: "skipped-network", cancel: noop };
  const { idleTimeoutMs = 4000, fallbackDelayMs = 1500 } = options;

  let cancelled = false;
  let cancelScheduled: () => void = noop;

  const scheduleIdle = () => {
    if (cancelled) return;
    if (typeof win.requestIdleCallback === "function") {
      const handle = win.requestIdleCallback(warm, { timeout: idleTimeoutMs });
      cancelScheduled = () => win.cancelIdleCallback?.(handle);
      return;
    }
    const handle = win.setTimeout(warm, fallbackDelayMs);
    cancelScheduled = () => win.clearTimeout(handle);
  };

  const documentStillStreaming =
    win.document !== undefined &&
    win.document.readyState !== "complete" &&
    typeof win.addEventListener === "function";

  if (documentStillStreaming) {
    const onLoad = () => scheduleIdle();
    win.addEventListener?.("load", onLoad, { once: true });
    cancelScheduled = () => win.removeEventListener?.("load", onLoad);
    return {
      outcome: "after-load",
      cancel: () => {
        cancelled = true;
        cancelScheduled();
      },
    };
  }

  scheduleIdle();
  return {
    outcome: typeof win.requestIdleCallback === "function" ? "idle" : "timer",
    cancel: () => {
      cancelled = true;
      cancelScheduled();
    },
  };
}

export type ChunkRegistry = {
  /** Resolves when every chunk for `sectionId` is loaded; unknown ids resolve at once. */
  ensure: (sectionId: string) => Promise<void>;
  /** True when a swap to `sectionId` should wait on `ensure` (held ids with loaders). */
  has: (sectionId: string) => boolean;
  /** Kick every loader; failures are swallowed — the real import on mount retries. */
  warmAll: () => void;
};

/**
 * One in-flight/settled promise per section. A rejected load is evicted so the
 * next `ensure` retries instead of replaying the failure forever. `hold` limits
 * which ids `has()` reports; every id is still warmed by `warmAll`.
 */
export function createChunkRegistry(
  loaders: Record<string, readonly ChunkLoader[]>,
  options: { hold?: readonly string[] } = {},
): ChunkRegistry {
  const inFlight = new Map<string, Promise<void>>();
  const held = new Set(options.hold ?? Object.keys(loaders));

  const ensure = (sectionId: string): Promise<void> => {
    const sectionLoaders = loaders[sectionId];
    if (!sectionLoaders || sectionLoaders.length === 0) return Promise.resolve();
    const existing = inFlight.get(sectionId);
    if (existing) return existing;
    const pending = Promise.all(sectionLoaders.map((load) => load())).then(() => undefined);
    pending.catch(() => {
      inFlight.delete(sectionId);
    });
    inFlight.set(sectionId, pending);
    return pending;
  };

  return {
    ensure,
    has: (sectionId) => held.has(sectionId) && Boolean(loaders[sectionId]?.length),
    warmAll: () => {
      for (const sectionId of Object.keys(loaders)) {
        void ensure(sectionId).catch(() => undefined);
      }
    },
  };
}

export type Timers = {
  setTimeout: (callback: () => void, ms: number) => number;
  clearTimeout: (handle: number) => void;
};

const defaultTimers: Timers = {
  setTimeout: (cb, ms) => setTimeout(cb, ms) as unknown as number,
  clearTimeout: (handle) => clearTimeout(handle as unknown as ReturnType<typeof setTimeout>),
};

/**
 * Wait for `ready`, but never longer than `maxMs`. Rejections count as "ready"
 * (the swap proceeds and the mount surfaces the real error). Always resolves;
 * the timer is cleared once `ready` wins so nothing outlives the race.
 */
export function holdUntilReady(
  ready: Promise<unknown>,
  maxMs: number,
  timers: Timers = defaultTimers,
): Promise<"ready" | "timeout"> {
  let handle: number | null = null;
  const settled = ready.then(
    () => "ready" as const,
    () => "ready" as const,
  );
  const timer = new Promise<"timeout">((resolve) => {
    handle = timers.setTimeout(() => resolve("timeout"), maxMs);
  });
  return Promise.race([settled, timer]).then((result) => {
    if (result === "ready" && handle !== null) timers.clearTimeout(handle);
    return result;
  });
}

export type SwapOutcome = "immediate" | "ready" | "timeout" | "stale" | "disposed";

export type SwapController = {
  /** Highlight can move at once; `onRelease` fires when the panel may swap. */
  commit: (sectionId: string) => Promise<SwapOutcome>;
  /** Unmount: no release fires after this, whatever is still in flight. */
  dispose: () => void;
};

/**
 * Serialises panel swaps. A tap that lands while an earlier hold is still
 * waiting wins: the earlier resolution is dropped instead of swapping back.
 */
export function createSwapController(config: {
  shouldHold: (sectionId: string) => boolean;
  ensure: (sectionId: string) => Promise<unknown>;
  onRelease: (sectionId: string) => void;
  holdMs?: number;
  timers?: Timers;
}): SwapController {
  const { shouldHold, ensure, onRelease, holdMs = DEFAULT_SWAP_HOLD_MS, timers } = config;
  let token = 0;
  let disposed = false;

  return {
    commit: (sectionId) => {
      const mine = ++token;
      if (!shouldHold(sectionId)) {
        onRelease(sectionId);
        return Promise.resolve("immediate");
      }
      return holdUntilReady(ensure(sectionId), holdMs, timers).then((result) => {
        if (disposed) return "disposed";
        if (mine !== token) return "stale";
        onRelease(sectionId);
        return result;
      });
    },
    dispose: () => {
      disposed = true;
    },
  };
}
