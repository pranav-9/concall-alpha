interface SectionCardProps {
  id: string;
  title: string;
  children: React.ReactNode;
}

export function SectionCard({ id, title, children }: SectionCardProps) {
  return (
    <div id={id} className="bg-gray-900 rounded-xl p-8">
      <div className="flex flex-col gap-4">
        <p className="text-xl lg:text-xl font-extrabold !leading-tight">
          {title}
        </p>
        {children}
      </div>
    </div>
  );
}
