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
          <div className="flex items-center justify-between gap-3">
            <p className="text-lg lg:text-lg font-bold text-foreground !leading-tight">
              {title}
            </p>
            <div className="flex items-center gap-3">
              {headerAction}
              <span className="text-[11px] text-muted-foreground group-open:hidden">Open</span>
              <span className="hidden text-[11px] text-muted-foreground group-open:inline">
                Collapse
              </span>
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
