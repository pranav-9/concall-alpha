import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type TopSavedCompanyRow = {
  companyCode: string;
  companyName: string | null;
  savedCount: number;
};

export function TopSavedCompaniesTable({
  rows,
}: {
  rows: TopSavedCompanyRow[];
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Top Saved Companies</h2>
      </div>
      <div className="p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">#</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Code</TableHead>
              <TableHead className="text-right">Saves</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground">
                  No saved companies found for this range.
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
                    {row.savedCount.toLocaleString()}
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
