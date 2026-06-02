import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";
import type { MDXComponents } from "mdx/types";

// Hand-styled component map so build-log prose matches the portal's tokens
// (no @tailwindcss/typography). Same ethos as how-scores-work.
export const mdxComponents: MDXComponents = {
  h2: (props: ComponentPropsWithoutRef<"h2">) => (
    <h2
      className="mt-8 text-lg font-semibold tracking-tight text-foreground"
      {...props}
    />
  ),
  h3: (props: ComponentPropsWithoutRef<"h3">) => (
    <h3 className="mt-6 text-base font-semibold text-foreground" {...props} />
  ),
  p: (props: ComponentPropsWithoutRef<"p">) => (
    <p className="text-[15px] leading-relaxed text-muted-foreground" {...props} />
  ),
  ul: (props: ComponentPropsWithoutRef<"ul">) => (
    <ul
      className="ml-5 list-disc space-y-1.5 text-[15px] leading-relaxed text-muted-foreground"
      {...props}
    />
  ),
  ol: (props: ComponentPropsWithoutRef<"ol">) => (
    <ol
      className="ml-5 list-decimal space-y-1.5 text-[15px] leading-relaxed text-muted-foreground"
      {...props}
    />
  ),
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
      className="border-l-2 border-border pl-4 text-[15px] italic text-muted-foreground"
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
