"use client";

import Link from "next/link";
import * as React from "react";
import { flushSync } from "react-dom";

import { GoogleMark, useGoogleSignIn } from "@/components/google-sign-in-button";
import { analytics } from "@/lib/analytics";
import { recordAuthAttempt } from "@/lib/auth-intent";
import { TOUCH_TARGET } from "@/lib/design/shell";
import { isInAppBrowser } from "@/lib/in-app-browser";
import {
  GATE_CUT_ATTRIBUTE,
  GATE_PEEK_PX,
  resolveClipHeight,
} from "@/lib/signup-gate";
import { cn } from "@/lib/utils";

import { elevatedBlockClass } from "./surface-tokens";

/**
 * Client half of the sign-up gate (logged-out readers only — see GatedPanel).
 *
 *   ┌ panel ───────────────────────────┐
 *   │ verdict + first card layer       │  readable, interactive
 *   │ ─ ─ ─ [data-gate-cut] ─ ─ ─ ─ ─ ─│  ← clip = marker top + GATE_PEEK_PX
 *   │ first hidden block, masked out   │  inert + aria-hidden from here down
 *   └──────────────────────────────────┘
 *   [ gate card ]                          in flow, pulled up over the fade
 *
 * The section marks ONE element with `data-gate-cut`. That element, its later
 * siblings, and the later siblings of each ancestor up to the clip box are made
 * `inert` — a boundary the browser enforces for Tab, Shift+Tab, clicks, find
 * and screen readers, not just a visual one. `overflow: clip` (not `hidden`)
 * so nothing can scroll the box. The fade is a mask on the content, so it needs
 * no colour and works on tinted section shells and in dark mode.
 *
 * The marker may arrive late (Guidance is an ssr:false chunk), so the panel is
 * re-measured on every DOM and size change. Until a marker exists nothing is
 * clipped and no card shows — a guessed clip moved the card when the real cut
 * arrived. Observer-driven updates commit with flushSync: the callbacks run
 * before paint, so the full section is never flashed. No `useId` here — this
 * renders inside lazily-loaded panels.
 *
 * Journal posts reuse it (`scope="post"`, `postSlug`, no company code — see
 * app/blog/[slug]/page.tsx), with the same server-side auth check.
 */
type GateState = { kind: "gated"; height: number } | { kind: "open" };
type GateScope = "section" | "post";

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

const primaryPill =
  "inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-sm transition-colors hover:bg-foreground/90 disabled:opacity-60";
const outlinePill =
  "inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent disabled:opacity-60";

function hasBox(el: Element): boolean {
  return el.getClientRects().length > 0;
}

/** The marker, its later siblings, and each ancestor's later siblings, up to `root`. */
function elementsAfterCut(marker: Element, root: Element): Element[] {
  const hidden: Element[] = [];
  let node: Element | null = marker;
  while (node && node !== root) {
    let sibling: Element | null = node === marker ? node : node.nextElementSibling;
    while (sibling) {
      hidden.push(sibling);
      sibling = sibling.nextElementSibling;
    }
    node = node.parentElement;
  }
  return hidden;
}

export function SectionDepthGate({
  companyCode,
  sectionId,
  below,
  nextPath,
  scope = "section",
  postSlug,
  children,
}: {
  companyCode: string | undefined;
  sectionId: string;
  below: readonly string[];
  nextPath: string;
  scope?: GateScope;
  postSlug?: string;
  children: React.ReactNode;
}) {
  const clipRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [state, setState] = React.useState<GateState>({ kind: "open" });

  useIsomorphicLayoutEffect(() => {
    const clip = clipRef.current;
    const content = contentRef.current;
    if (!clip || !content) return;

    let inerted: Element[] = [];
    const release = () => {
      inerted.forEach((el) => {
        el.removeAttribute("inert");
        el.removeAttribute("aria-hidden");
      });
      inerted = [];
    };

    const measure = () => {
      const marker = content.querySelector(`[${GATE_CUT_ATTRIBUTE}]`);
      // An empty wrapper has no box; measure from the next thing that does.
      let anchor: Element | null = marker;
      while (anchor && !hasBox(anchor)) anchor = anchor.nextElementSibling;

      const markerTop = anchor
        ? anchor.getBoundingClientRect().top - content.getBoundingClientRect().top
        : null;
      const height = resolveClipHeight({ markerTop, contentHeight: content.scrollHeight });

      release();
      if (!marker || height === null) {
        apply({ kind: "open" });
        return;
      }
      inerted = elementsAfterCut(marker, content);
      inerted.forEach((el) => {
        el.setAttribute("inert", "");
        el.setAttribute("aria-hidden", "true");
      });
      apply({ kind: "gated", height });
    };

    let sync = false;
    const apply = (next: GateState) => {
      const update = () =>
        setState((prev) =>
          prev.kind === next.kind &&
          (prev.kind === "open" || (next.kind === "gated" && prev.height === next.height))
            ? prev
            : next,
        );
      if (sync) flushSync(update);
      else update();
    };

    measure();
    sync = true;
    const mutation = new MutationObserver(measure);
    mutation.observe(content, { childList: true, subtree: true });
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    resize?.observe(content);

    return () => {
      mutation.disconnect();
      resize?.disconnect();
      release();
    };
  }, []);

  const isOpen = state.kind === "open";
  const height = state.kind === "gated" ? state.height : undefined;
  const fade = `linear-gradient(to bottom, black calc(100% - ${GATE_PEEK_PX}px), transparent)`;

  return (
    <div>
      <div
        ref={clipRef}
        style={
          isOpen
            ? undefined
            : { maxHeight: height, overflow: "clip", maskImage: fade, WebkitMaskImage: fade }
        }
      >
        <div ref={contentRef}>{children}</div>
      </div>
      {isOpen ? null : (
        <GateCard
          companyCode={companyCode}
          sectionId={sectionId}
          below={below}
          nextPath={nextPath}
          scope={scope}
          postSlug={postSlug}
        />
      )}
    </div>
  );
}

function GateCard({
  companyCode,
  sectionId,
  below,
  nextPath,
  scope,
  postSlug,
}: {
  companyCode: string | undefined;
  sectionId: string;
  below: readonly string[];
  nextPath: string;
  scope: GateScope;
  postSlug?: string;
}) {
  const cardRef = React.useRef<HTMLElement>(null);
  const intent = React.useMemo(
    () => ({ source: "gate" as const, companyCode, sectionId, postSlug }),
    [companyCode, sectionId, postSlug],
  );
  const google = useGoogleSignIn({ nextPath, intent });
  const [inApp, setInApp] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    setInApp(isInAppBrowser(window.navigator.userAgent));
  }, []);

  // Viewed = at least half the card on screen, once per company + tab (or post) per session.
  React.useEffect(() => {
    const card = cardRef.current;
    if (!card || typeof IntersectionObserver === "undefined") return;
    const key = `signup-gate:viewed:${postSlug ?? companyCode}:${sectionId}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
    } catch {
      /* storage blocked — still count the view, once per mount */
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        try {
          window.sessionStorage.setItem(key, "1");
        } catch {
          /* noop */
        }
        analytics.signupGateViewed(companyCode, sectionId, postSlug);
      },
      { threshold: 0.5 },
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, [companyCode, sectionId, postSlug]);

  const encodedNext = encodeURIComponent(nextPath);
  const emailClass = cn(inApp ? primaryPill : outlinePill, TOUCH_TARGET, "min-h-11");

  const copyLink = async () => {
    analytics.signupGateClick(companyCode, sectionId, "open_in_browser", postSlug);
    try {
      await window.navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <aside
      ref={cardRef}
      aria-label={`Sign up to read the rest of this ${scope}`}
      className={cn(elevatedBlockClass, "relative mx-3 -mt-6 max-w-md bg-background p-4 sm:mx-5 sm:p-5")}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Below in this {scope}
      </p>
      <h3 className="mt-1 text-base font-bold leading-tight text-foreground">
        Sign up free to read the rest
      </h3>
      <ul className="mt-3 divide-y divide-border/50 text-[13px] leading-snug text-foreground/80">
        {below.map((line) => (
          <li key={line} className="py-1.5">
            {line}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        {inApp ? (
          <button
            type="button"
            onClick={copyLink}
            className={cn(outlinePill, TOUCH_TARGET, "min-h-11")}
          >
            {copied ? "Link copied" : "Open in your browser"}
          </button>
        ) : (
          <button
            type="button"
            disabled={google.isLoading}
            onClick={() => {
              analytics.signupGateClick(companyCode, sectionId, "google", postSlug);
              void google.start();
            }}
            className={cn(primaryPill, TOUCH_TARGET, "min-h-11")}
          >
            <GoogleMark className="size-4 shrink-0 rounded-full bg-white p-px" />
            {google.isLoading ? "Redirecting…" : "Continue with Google"}
          </button>
        )}
        <Link
          href={`/auth/sign-up?next=${encodedNext}`}
          aria-disabled={google.isLoading || undefined}
          onClick={() => {
            recordAuthAttempt("email", intent);
            analytics.signupGateClick(companyCode, sectionId, "email", postSlug);
          }}
          className={cn(emailClass, google.isLoading && "pointer-events-none opacity-60")}
        >
          Sign up with email
        </Link>
      </div>
      {inApp ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Google sign-in is blocked inside in-app browsers. Open this page in Chrome or Safari to
          use it, or sign up with email here.
        </p>
      ) : null}
      {google.error ? <p className="mt-2 text-sm text-red-500">{google.error}</p> : null}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        Free to read. No card, no trial.{" "}
        <span aria-hidden="true">·</span>{" "}
        <Link
          href={`/auth/login?next=${encodedNext}`}
          onClick={() => {
            recordAuthAttempt("email", intent);
            analytics.signupGateClick(companyCode, sectionId, "login", postSlug);
          }}
          className="font-medium text-foreground underline underline-offset-4"
        >
          Log in
        </Link>
      </p>
    </aside>
  );
}
