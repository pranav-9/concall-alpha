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
              rows.map((row, idx) => (
                <TableRow key={`${row.company_code}-${idx}`}>
                  <TableCell>{idx + 1}</TableCell>
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
