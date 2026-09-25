import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import type { MDXComponents } from "mdx/types";

import { PostPoster } from "./post-image";

// Hand-styled component map so build-log prose matches the portal's tokens
// (no @tailwindcss/typography). Same ethos as how-scores-work.
//
// Reading size (2026-09-23, reader review of the first 25 posts): a 1,500-word
// post in 15px mid-grey tired readers out, and 18px headings against 15px body
// read as one flat column. Body is 17px near-black, headings 22px with more
// air above, so a skimmer can see the section breaks.
const BODY = "text-[17px] leading-[1.7] text-foreground/90";

export const mdxComponents: MDXComponents = {
  h2: (props: ComponentPropsWithoutRef<"h2">) => (
    <h2
      className="mt-12 text-[22px] font-semibold leading-snug tracking-tight text-foreground"
      {...props}
    />
  ),
  h3: (props: ComponentPropsWithoutRef<"h3">) => (
    <h3 className="mt-8 text-lg font-semibold text-foreground" {...props} />
  ),
  p: (props: ComponentPropsWithoutRef<"p">) => <p className={BODY} {...props} />,
  ul: (props: ComponentPropsWithoutRef<"ul">) => (
    <ul className={`ml-5 list-disc space-y-2 ${BODY}`} {...props} />
  ),
  ol: (props: ComponentPropsWithoutRef<"ol">) => (
    <ol className={`ml-5 list-decimal space-y-2 ${BODY}`} {...props} />
  ),
  // The poster figure, lifted out of the source by `liftPoster` (app/blog/related.ts).
  PostPoster,
  // Where the sign-up gate clips a post, placed by `gatePost` (app/blog/related.ts).
  GateCut: () => <div data-gate-cut aria-hidden="true" />,
  li: (props: ComponentPropsWithoutRef<"li">) => (
    <li className="pl-1" {...props} />
  ),
  strong: (props: ComponentPropsWithoutRef<"strong">) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  em: (props: ComponentPropsWithoutRef<"em">) => (
    <em className="italic" {...props} />
  ),
  hr: () => <hr className="my-8 border-border" />,
  blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote
      className="border-l-2 border-border pl-4 text-[17px] leading-[1.7] italic text-foreground/80"
      {...props}
    />
  ),
  a: ({ href = "", ...props }: ComponentPropsWithoutRef<"a">) => {
    const linkClass =
      "font-medium text-foreground underline underline-offset-2 transition-colors hover:text-sky-700 dark:hover:text-sky-300";
    if (href.startsWith("/")) {
      return <Link href={href} className={linkClass} {...props} />;
    }
    return (
      <a href={href} target="_blank" rel="noreferrer" className={linkClass} {...props} />
    );
  },
};
