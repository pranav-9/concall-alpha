interface SectionCardProps {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}

export function SectionCard({
  id,
  title,
  children,
  className = "",
  headerAction,
}: SectionCardProps) {
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
