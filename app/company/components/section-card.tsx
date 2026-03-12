import { ChevronDown } from "lucide-react";

interface SectionCardProps {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export function SectionCard({
  id,
  title,
  children,
  className = "",
  headerAction,
  collapsible = false,
  defaultOpen = true,
}: SectionCardProps) {
  if (collapsible) {
    return (
      <details
        id={id}
        className={`group bg-card border border-border rounded-lg p-4 ${className}`}
        open={defaultOpen}
      >
        <summary className="list-none cursor-pointer [&::-webkit-details-marker]:hidden">
          <div className="flex items-center justify-between gap-3 rounded-md border border-border/50 bg-muted/15 px-3 py-2.5 transition-colors group-hover:bg-muted/25">
            <p className="min-w-0 flex-1 text-lg lg:text-lg font-bold text-foreground !leading-tight">
              {title}
            </p>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {headerAction ? (
                <div className="text-[11px] text-muted-foreground">
                  {headerAction}
                </div>
              ) : null}
              <div className="hidden items-center sm:flex">
                <span className="text-[12px] font-medium text-muted-foreground group-open:hidden">
                  See more
                </span>
                <span className="hidden text-[12px] font-medium text-muted-foreground group-open:inline">
                  Hide details
                </span>
              </div>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted-foreground">
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
    <div id={id} className={`bg-card border border-border rounded-lg p-4 ${className}`}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-lg lg:text-lg font-bold text-foreground !leading-tight">
            {title}
          </p>
          {headerAction}
        </div>
        <div className="border-b border-border"></div>
        {children}
      </div>
    </div>
  );
}
