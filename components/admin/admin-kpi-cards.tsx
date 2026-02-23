type Props = {
  uniqueUsers: number;
  companyViews: number;
  feedbackCount: number;
};

function KpiCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
    </div>
  );
}

export function AdminKpiCards({ uniqueUsers, companyViews, feedbackCount }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <KpiCard label="Unique Users" value={uniqueUsers} />
      <KpiCard label="Company Views" value={companyViews} />
      <KpiCard label="Feedback Requests" value={feedbackCount} />
    </div>
  );
}
