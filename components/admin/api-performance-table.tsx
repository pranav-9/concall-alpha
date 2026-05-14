import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type ApiPerformanceRow = {
  id: string;
  route: string;
  method: string;
  statusCode: number;
  durationMs: number;
  resultCount: number | null;
  queryLength: number | null;
  errorCode: string | null;
  createdAt: string | null;
};

function formatTimestamp(value: string | null) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}

export function ApiPerformanceTable({
  rows,
}: {
  rows: ApiPerformanceRow[];
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Recent Slow API Calls</h2>
      </div>
      <div className="p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Route</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead className="text-right">Results</TableHead>
              <TableHead className="text-right">Query Len</TableHead>
              <TableHead>Error</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground">
                  No API metrics found for this range.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium text-foreground">
                    {row.route}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.method}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${
                        row.statusCode >= 500
                          ? "border-red-300 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
                          : row.statusCode >= 400
                            ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
                            : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
                      }`}
                    >
                      {row.statusCode}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {row.durationMs.toLocaleString()}ms
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {row.resultCount == null ? "-" : row.resultCount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {row.queryLength == null ? "-" : row.queryLength.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.errorCode ?? "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatTimestamp(row.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
