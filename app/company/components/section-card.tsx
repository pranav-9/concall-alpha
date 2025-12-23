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
    <div id={id} className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      <div className="flex flex-col gap-3">
        <p className="text-lg lg:text-lg font-bold !leading-tight">
          {title}
        </p>
        <div className="border-b border-gray-800"></div>
        {children}
      </div>
    </div>
  );
}
