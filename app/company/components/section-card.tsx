import { ChevronDown } from "lucide-react";

interface SectionCardProps {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  headerDescription?: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export function SectionCard({
  id,
  title,
  children,
  className = "",
  headerAction,
  headerDescription,
  collapsible = false,
  defaultOpen = true,
}: SectionCardProps) {
  if (collapsible) {
    return (
      <details
        id={id}
        className={`group scroll-mt-40 bg-card border border-border rounded-lg p-4 ${className}`}
        style={{
          scrollMarginTop:
            "calc(var(--global-navbar-height, 84px) + var(--company-tabs-height, 56px) + 1rem)",
        }}
        open={defaultOpen ? true : undefined}
      >
        <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 transition-colors group-hover:text-foreground">
            <p className="min-w-0 flex-1 text-lg lg:text-lg font-bold text-foreground !leading-tight">
              {title}
            </p>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {headerAction ? (
                <div className="hidden text-[11px] text-muted-foreground group-open:block">
                  {headerAction}
                </div>
              ) : null}
              <div className="flex items-center">
                <span className="text-[12px] font-medium text-muted-foreground transition-colors group-hover:text-foreground/80 group-open:hidden">
                  Open analysis
                </span>
                <span className="hidden text-[12px] font-medium text-muted-foreground transition-colors group-hover:text-foreground/80 group-open:inline">
                  Hide details
                </span>
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/35 text-muted-foreground transition-colors group-hover:bg-muted/50 group-hover:text-foreground/80">
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </div>
            </div>
          </div>
        </summary>
        <div className="mt-3 border-b border-border group-open:block"></div>
        <div className="pt-3">{children}</div>
      </details>
    );
  }

  return (
    <div
      id={id}
      className={`scroll-mt-40 bg-card border border-border rounded-lg p-4 ${className}`}
      style={{
        scrollMarginTop:
          "calc(var(--global-navbar-height, 84px) + var(--company-tabs-height, 56px) + 1rem)",
      }}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-lg lg:text-lg font-bold text-foreground !leading-tight">
              {title}
            </p>
            {headerDescription ? (
              <p className="text-[13px] leading-snug text-foreground/82">
                {headerDescription}
              </p>
            ) : null}
          </div>
          {headerAction}
        </div>
        <div className="border-b border-border"></div>
        {children}
      </div>
    </div>
  );
}
