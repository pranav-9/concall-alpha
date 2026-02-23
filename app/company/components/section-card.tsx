interface SectionCardProps {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function SectionCard({
  id,
  title,
  children,
  className = "",
}: SectionCardProps) {
  return (
    <div id={id} className={`bg-card border border-border rounded-lg p-4 ${className}`}>
      <div className="flex flex-col gap-3">
        <p className="text-lg lg:text-lg font-bold text-foreground !leading-tight">
          {title}
        </p>
        <div className="border-b border-border"></div>
        {children}
      </div>
    </div>
  );
}
