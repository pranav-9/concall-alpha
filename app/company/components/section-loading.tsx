import { SectionCard } from "./section-card";

export function SectionLoading({ id, title }: { id: string; title: string }) {
  return (
    <SectionCard id={id} title={title}>
      <div className="space-y-3">
        <div className="h-24 w-full animate-pulse rounded-xl bg-muted/40" />
        <div className="h-32 w-full animate-pulse rounded-xl bg-muted/30" />
      </div>
    </SectionCard>
  );
}
