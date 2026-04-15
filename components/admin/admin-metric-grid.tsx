export type AdminMetric = {
  label: string;
  value: number | string;
  helper?: string;
};

export function AdminMetricGrid({ metrics }: { metrics: AdminMetric[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {metric.label}
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {typeof metric.value === "number"
              ? metric.value.toLocaleString()
              : metric.value}
          </p>
          {metric.helper ? (
            <p className="mt-1 text-xs text-muted-foreground">{metric.helper}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
