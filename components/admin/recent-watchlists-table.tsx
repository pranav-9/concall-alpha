import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type RecentWatchlistRow = {
  id: number;
  user_id: string;
  name: string;
  created_at: string;
  user_display_name?: string | null;
  user_email?: string | null;
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

export function RecentWatchlistsTable({
  rows,
}: {
  rows: RecentWatchlistRow[];
}) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Recent Watchlists</h2>
      </div>
      <div className="p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Created</TableHead>
              <TableHead>Watchlist Name</TableHead>
              <TableHead>User</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  No watchlists created for this range.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(row.created_at)}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {row.name}
                  </TableCell>
                  <TableCell className="max-w-[280px]">
                    <span className="flex flex-col">
                      <span className="truncate text-sm text-foreground">
                        {row.user_display_name ?? row.user_email ?? row.user_id}
                      </span>
                      {row.user_display_name && row.user_email ? (
                        <span className="truncate text-xs text-muted-foreground">
                          {row.user_email}
                        </span>
                      ) : null}
                      {!row.user_email ? (
                        <span className="truncate font-mono text-xs text-muted-foreground">
                          {row.user_id}
                        </span>
                      ) : null}
                    </span>
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
