import { BelowSm, FromSm } from "@/components/viewport-gate";

import { POSTER_SRC } from "./related";

/**
 * The company post's one-page poster, lifted out of the MDX by `liftPoster`.
 * From `sm` it renders full width as the posts always did. Below `sm` it
 * collapses to a tappable strip — the 1080px poster shrinks to ~360px on a
 * phone, where its labels cannot be read, and it pushed the first sentence a
 * screen and a half down (reader review, 2026-09-23). The strip opens the PNG
 * itself, which the phone can pinch-zoom. Same `src` in both paints, so the
 * phone still downloads the poster once (the win is layout, not bytes); no
 * `priority`/preload — the hidden paint must never cost the other viewport a
 * fetch (see viewport-gate.tsx).
 */
export function PostPoster({ src, alt }: { src: string; alt: string }) {
  if (!POSTER_SRC.test(src)) {
    throw new Error(`PostPoster: ${src} is not a /blog/<code>-story-<date>.png poster`);
  }
  return (
    <figure className="my-6">
      <FromSm>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-auto w-full rounded-xl border border-border" />
      </FromSm>
      <BelowSm>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3 transition-colors hover:bg-muted/50"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            aria-hidden="true"
            className="h-16 w-[52px] shrink-0 rounded-md border border-border object-cover object-top"
          />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-foreground">The one-page view</span>
            <span className="block text-xs leading-snug text-muted-foreground">
              Tap to open the poster full size. The same story is written out below.
            </span>
          </span>
          <span className="sr-only">(opens the poster image in a new tab)</span>
        </a>
      </BelowSm>
    </figure>
  );
}
