import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type CompanyInterestRow = {
  companyCode: string;
  companyName: string | null;
  sector: string | null;
  subSector: string | null;
  views: number;
  watchlistAdds: number;
  comments: number;
  requests: number;
  interestScore: number;
};

export function CompanyInterestTable({ rows }: { rows: CompanyInterestRow[] }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">
          Company Interest Board
        </h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Blended demand signal from views, watchlists, comments, and requests.
        </p>
      </div>
      <div className="p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">#</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Sector</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="text-right">Watchlists</TableHead>
              <TableHead className="text-right">Comments</TableHead>
              <TableHead className="text-right">Requests</TableHead>
              <TableHead className="text-right">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground">
                  No company interest found for this range.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow key={row.companyCode}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">
                      {row.companyName ?? row.companyCode}
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {row.companyCode}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.sector ?? "—"}
                    {row.subSector ? (
                      <span className="block text-xs">{row.subSector}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right">{row.views.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {row.watchlistAdds.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">{row.comments.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{row.requests.toLocaleString()}</TableCell>
                  <TableCell className="text-right font-semibold text-foreground">
                    {row.interestScore.toLocaleString()}
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

export type TopSectorInterestRow = {
  sector: string;
  views: number;
  companies: number;
};

export function TopSectorsTable({ rows }: { rows: TopSectorInterestRow[] }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Top Sectors Viewed</h3>
      </div>
      <div className="p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sector</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="text-right">Companies</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  No sector interest found for this range.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.sector}>
                  <TableCell className="font-medium text-foreground">
                    {row.sector}
                  </TableCell>
                  <TableCell className="text-right">{row.views.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {row.companies.toLocaleString()}
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
