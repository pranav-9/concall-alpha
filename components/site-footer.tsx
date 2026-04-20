import Link from "next/link";

type FooterLinkItem = {
  href: string;
  label: string;
  external?: boolean;
  highlight?: boolean;
};

const exploreLinks: FooterLinkItem[] = [
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/sectors", label: "Sectors" },
  { href: "/how-scores-work", label: "How Scores Work" },
  { href: "/changelog", label: "Changelog" },
];

const learnLinks: FooterLinkItem[] = [
  {
    href: "https://www.youtube.com/@pranavyadav6958",
    label: "YouTube",
    external: true,
    highlight: true,
  },
  {
    href: "https://x.com/pranav_handle",
    label: "X",
    external: true,
  },
  { href: "/requests", label: "Submit Request" },
];

function FooterLink({ item }: { item: FooterLinkItem }) {
  const className = item.highlight
    ? "inline-flex w-fit items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/35 dark:text-red-200 dark:hover:bg-red-950/55"
    : "text-xs text-muted-foreground transition-colors hover:text-foreground";

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noreferrer"
        className={className}
      >
        {item.label}
      </a>
    );
  }

  return (
    <Link
      href={item.href}
      prefetch={false}
      className={className}
    >
      {item.label}
    </Link>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/20">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1.4fr)_minmax(10rem,0.45fr)_minmax(10rem,0.45fr)] md:items-start">
          <div className="max-w-xl space-y-2">
            <p className="text-base font-semibold text-foreground">
              Story of a Stock
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              A fundamental screener that adds business story, management
              commentary, and qualitative context to the numbers.
            </p>
          </div>

          <nav className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Explore
            </p>
            <div className="flex flex-col items-start gap-2.5">
              {exploreLinks.map((item) => (
                <FooterLink key={item.href} item={item} />
              ))}
            </div>
          </nav>

          <nav className="space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Learn
            </p>
            <div className="flex flex-col items-start gap-2.5">
              {learnLinks.map((item) => (
                <FooterLink key={item.href} item={item} />
              ))}
            </div>
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-border/70 pt-3 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            Built by{" "}
            <a
              href="https://pranavyadav.dev/"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground transition-colors hover:underline"
            >
              Pranav Yadav
            </a>
          </p>
          <p>Experimental research workflow for Indian equity scuttlebutt. Not investment advice.</p>
        </div>
      </div>
    </footer>
  );
}
