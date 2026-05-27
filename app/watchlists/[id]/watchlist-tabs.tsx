import Link from "next/link";
import { WatchlistCreateButton } from "@/components/watchlist-create-button";

type WatchlistTab = {
  id: number;
  name: string;
};

export function WatchlistTabs({
  watchlists,
  activeId,
}: {
  watchlists: WatchlistTab[];
  activeId: number;
}) {
  return (
    <nav
      aria-label="Watchlists"
      className="flex items-center gap-2 border-b border-border/45 bg-background/70 px-2 backdrop-blur-sm"
    >
      <div className="flex-1 overflow-x-auto">
        <ul className="flex min-w-max items-stretch">
          {watchlists.map((list) => {
            const isActive = list.id === activeId;
            return (
              <li key={list.id}>
                <Link
                  href={`/watchlists/${list.id}`}
                  prefetch={false}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "inline-flex h-11 items-center whitespace-nowrap px-4 text-sm transition-colors",
                    "border-b-2",
                    isActive
                      ? "border-sky-500 font-semibold text-sky-600 dark:text-sky-300"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {list.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <WatchlistCreateButton
        label="+ Add New Watchlist"
        variant="link"
        className="shrink-0 px-3 text-sm font-medium text-sky-600 hover:text-sky-700 hover:no-underline dark:text-sky-300 dark:hover:text-sky-200"
      />
    </nav>
  );
}
