import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  CompanyViewRow,
  RecentCompanyOpenRow,
} from "@/lib/admin-company-views";

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CompanyViewsTable({ rows }: { rows: CompanyViewRow[] }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Top Companies Opened</h2>
      </div>
      <div className="p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">#</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Code</TableHead>
              <TableHead className="text-right">Opens</TableHead>
              <TableHead className="text-right">Last Opened</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No company pages opened in this range.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow key={row.companyCode}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium text-foreground">
                    {row.companyName ?? row.companyCode}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.companyCode}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {row.opens.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatDateTime(row.lastViewed)}
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

export function RecentCompanyOpensTable({
  rows,
}: {
  rows: RecentCompanyOpenRow[];
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Recent Company Opens</h2>
      </div>
      <div className="p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Opened</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  No recent company opens in this range.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(row.occurredAt)}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {row.companyName ?? row.companyCode}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.companyCode}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{row.source}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
