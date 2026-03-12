import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type TopCompanyView = {
  company_code: string | null;
  company_name: string | null;
  views: number | string;
  last_viewed: string | null;
};

const DEFAULT_VISIBLE_ROWS = 10;

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function TopCompaniesTable({ rows }: { rows: TopCompanyView[] }) {
  const visibleRows = rows.slice(0, DEFAULT_VISIBLE_ROWS);
  const hiddenRows = rows.slice(DEFAULT_VISIBLE_ROWS);

  function renderRows(items: TopCompanyView[], startIndex = 0) {
    return items.map((row, idx) => (
      <TableRow key={`${row.company_code}-${startIndex + idx}`}>
        <TableCell>{startIndex + idx + 1}</TableCell>
        <TableCell className="font-medium text-foreground">
          {row.company_name ?? row.company_code ?? "Unknown"}
        </TableCell>
        <TableCell className="text-muted-foreground">
          {row.company_code ?? "—"}
        </TableCell>
        <TableCell className="text-right font-medium">
          {Number(row.views).toLocaleString()}
        </TableCell>
        <TableCell className="text-muted-foreground">
          {formatDate(row.last_viewed)}
        </TableCell>
      </TableRow>
    ));
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Top Companies Viewed</h2>
      </div>
      <div className="p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">#</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Code</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead>Last Viewed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No company views found for this range.
                </TableCell>
              </TableRow>
            ) : (
              renderRows(visibleRows)
            )}
          </TableBody>
        </Table>
      </div>
      {hiddenRows.length > 0 ? (
        <div className="border-t border-border px-4 py-3">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/50">
              <span className="font-medium text-foreground">
                Show remaining {hiddenRows.length} companies
              </span>
              <span className="text-xs uppercase tracking-wide group-open:hidden">
                Expand
              </span>
              <span className="hidden text-xs uppercase tracking-wide group-open:inline">
                Collapse
              </span>
            </summary>
            <div className="pt-3">
              <Table>
                <TableBody>{renderRows(hiddenRows, visibleRows.length)}</TableBody>
              </Table>
            </div>
          </details>
        </div>
      ) : null}
    </div>
  );
}
