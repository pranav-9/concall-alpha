import Link from "next/link";

const footerLinks = [
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/sectors", label: "Sectors" },
  { href: "/how-scores-work", label: "How Scores Work" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/20">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 sm:px-5 sm:py-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">Story of a Stock</p>
            <p className="text-xs text-muted-foreground">
              Context-first business tracking for long-term investors.
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs sm:justify-end">
            {footerLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
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
          <p>Experimental research tool. Not investment advice.</p>
        </div>
      </div>
    </footer>
  );
}
