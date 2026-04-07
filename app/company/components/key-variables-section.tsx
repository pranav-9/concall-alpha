import type {
  NormalizedKeyVariableKpiHistory,
  NormalizedKeyVariablesSnapshot,
} from "@/lib/key-variables-snapshot/types";

const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

const formatCellValue = (value: string | number | null | undefined) => {
  if (typeof value === "number") return numberFormatter.format(value);
  if (typeof value === "string") return value;
  return "—";
};

function KpiHistoryTable({ history }: { history: NormalizedKeyVariableKpiHistory }) {
  const periodsFromRows = history.rows.flatMap((row) => Object.keys(row.valuesByPeriod));
  const periods = history.periods.length > 0 ? history.periods : Array.from(new Set(periodsFromRows));

  if (periods.length === 0 || history.rows.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/30 bg-muted/20">
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border/30">
              <th className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Metric
              </th>
              {periods.map((period) => (
                <th
                  key={period}
                  className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                >
                  {period}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.rows.map((row) => (
              <tr key={row.metric} className="border-b border-border/20 last:border-b-0">
                <td className="px-3 py-2.5 text-[12px] font-medium text-foreground">
                  {row.metric}
                </td>
                {periods.map((period) => (
                  <td key={period} className="px-3 py-2.5 text-[12px] text-muted-foreground">
                    {formatCellValue(row.valuesByPeriod[period])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function KeyVariablesSection({
  snapshot,
}: {
  snapshot: NormalizedKeyVariablesSnapshot;
}) {
  return (
    <div className="space-y-4">
      {snapshot.deepTreatment.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {snapshot.deepTreatment.map((item, index) => (
              <div
                key={`${item.variable}-${index}`}
                className="rounded-2xl border border-border/35 bg-background/75 p-4 shadow-md shadow-black/10"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[15px] font-semibold leading-snug text-foreground">
                    {item.variable}
                  </p>
                  <span className="rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                    Variable {index + 1}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {item.kpiHistory ? <KpiHistoryTable history={item.kpiHistory} /> : null}

                  {item.currentRead ? (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Current Read
                      </p>
                      <p className="text-[12px] leading-relaxed text-foreground">
                        {item.currentRead}
                      </p>
                    </div>
                  ) : null}

                  {item.whatItTracks ? (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        What It Tracks
                      </p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        {item.whatItTracks}
                      </p>
                    </div>
                  ) : null}

                  {item.whyItMattersNow ? (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Why It Matters Now
                      </p>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        {item.whyItMattersNow}
                      </p>
                    </div>
                  ) : null}

                  {item.trendInterpretation ? (
                    <div className="rounded-xl border border-sky-200/35 bg-sky-50/45 px-3 py-3 dark:border-sky-700/30 dark:bg-sky-950/10">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">
                        Trend Interpretation
                      </p>
                      <p className="mt-1.5 text-[12px] leading-relaxed text-foreground">
                        {item.trendInterpretation}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
