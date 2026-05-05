import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type LatestWatchlistActivityRow = {
  id: string;
  action: "watchlist_created" | "company_added";
  occurredAt: string;
  watchlistName: string | null;
  companyCode: string | null;
  companyName: string | null;
  userId: string | null;
  userDisplayName: string | null;
  userEmail: string | null;
};

function formatDateTime(value: string) {
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

function formatAction(action: LatestWatchlistActivityRow["action"]) {
  return action === "watchlist_created" ? "Watchlist created" : "Company added";
}

export function LatestWatchlistActivityTable({
  rows,
}: {
  rows: LatestWatchlistActivityRow[];
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Latest Watchlist Activity</h2>
      </div>
      <div className="p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Watchlist</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>User</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground">
                  No watchlist activity found for this range.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(row.occurredAt)}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {formatAction(row.action)}
                  </TableCell>
                  <TableCell>{row.watchlistName ?? "Unknown"}</TableCell>
                  <TableCell>
                    {row.companyCode ? (
                      <span className="flex flex-col">
                        <span className="font-medium text-foreground">
                          {row.companyName ?? row.companyCode}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {row.companyCode}
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[280px]">
                    {row.userId || row.userDisplayName || row.userEmail ? (
                      <span className="flex flex-col">
                        <span className="truncate text-sm text-foreground">
                          {row.userDisplayName ?? row.userEmail ?? row.userId}
                        </span>
                        {row.userDisplayName && row.userEmail ? (
                          <span className="truncate text-xs text-muted-foreground">
                            {row.userEmail}
                          </span>
                        ) : null}
                        {!row.userEmail && row.userId ? (
                          <span className="truncate font-mono text-xs text-muted-foreground">
                            {row.userId}
                          </span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
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
