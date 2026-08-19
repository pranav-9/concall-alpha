import { BrandLogo, Button, Input, ThemeSwitcher } from "concall-alpha";

// A single ghost icon button that opens a light/dark/system radio menu. It only
// ever appears inside the global navbar's control cluster, so it is shown here in
// one — on its own it is a 16px glyph and tells you nothing about how it is used.
//
// The icon reflects next-themes' current setting: Sun for light, Moon for dark,
// Laptop for "system". Outside a ThemeProvider the theme is undefined and it
// falls through to the Laptop glyph, which is the correct render for "following
// the OS" anyway.

const NAV_ITEMS = ["Desk", "Themes", "Leaderboards", "Sectors", "Journal"];

/** Canonical: the right-hand end of the global navbar. */
export const InTheNavbar = () => (
  <div className="w-full rounded-[1.5rem] border border-border/60 bg-background/82 px-4 shadow-[0_20px_45px_-35px_rgba(15,23,42,0.45)]">
    <div className="flex min-h-[4.25rem] items-center justify-between gap-4">
      <BrandLogo size={36} showEyebrow />
      <div className="flex items-center gap-3">
        <div className="hidden w-56 lg:block">
          <Input placeholder="Search covered companies" className="h-9 rounded-full" />
        </div>
        {NAV_ITEMS.map((item, i) => (
          <a
            key={item}
            href="#"
            className={`inline-flex items-center rounded-full px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
              i === 0
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {item}
          </a>
        ))}
        <ThemeSwitcher />
        <Button size="sm" variant="outline">
          Sign in
        </Button>
      </div>
    </div>
  </div>
);

/** The control cluster on its own — the smallest honest context for it. */
export const InAControlCluster = () => (
  <div className="flex flex-col gap-3">
    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border/60 bg-background px-2 py-1.5">
      <Input
        placeholder="Search covered companies"
        className="h-8 w-56 rounded-full border-0 shadow-none focus-visible:ring-0"
      />
      <ThemeSwitcher />
      <Button size="sm" variant="ghost">
        Watchlists
      </Button>
      <Button size="sm">Sign in</Button>
    </div>
    <p className="text-[11px] text-muted-foreground">
      The trigger only. Clicking it opens the light / dark / system radio menu, which is a
      floating overlay and cannot be captured in a static card.
    </p>
  </div>
);

/** The mobile menu footer, where it sits as a labelled row rather than an icon. */
export const InTheMobileMenu = () => (
  <div className="w-full max-w-xs rounded-2xl border border-border/60 bg-background p-2">
    {NAV_ITEMS.map((item) => (
      <a
        key={item}
        href="#"
        className="flex items-center rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        {item}
      </a>
    ))}
    <div className="mt-1 flex items-center justify-between border-t border-border/50 px-3 pt-3">
      <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        Appearance
      </span>
      <ThemeSwitcher />
    </div>
  </div>
);
