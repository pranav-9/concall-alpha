import { Skeleton } from "concall-alpha";

// Skeleton stands in for a block the portal is still fetching. It is only
// legible at the shape of the thing it replaces — a section card, a board row,
// a company tile — so every cell below mirrors a real portal surface.

export const SectionCardLoading = () => (
  <div className="w-full max-w-xl rounded-xl border bg-card p-5">
    <div className="flex items-center justify-between">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-5 w-20 rounded-full" />
    </div>
    <Skeleton className="mt-2 h-3.5 w-72" />
    <div className="mt-5 space-y-3">
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  </div>
);

export const BoardRows = () => (
  <div className="w-full max-w-xl rounded-xl border bg-card p-4">
    <div className="mb-3 flex items-center gap-4">
      <Skeleton className="h-3 w-6" />
      <Skeleton className="h-3 w-32" />
      <Skeleton className="ml-auto h-3 w-16" />
      <Skeleton className="h-3 w-14" />
    </div>
    <div className="space-y-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-6" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="ml-auto h-6 w-12 rounded-full" />
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  </div>
);

export const CompanyTile = () => (
  <div className="flex gap-4">
    {[0, 1].map((i) => (
      <div key={i} className="w-[15rem] rounded-xl border bg-card p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="mt-4 h-16 w-full rounded-lg" />
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

export const Shapes = () => (
  <div className="w-full max-w-lg space-y-6">
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Text lines
      </p>
      <Skeleton className="h-3.5 w-full" />
      <Skeleton className="h-3.5 w-3/4" />
      <Skeleton className="h-3.5 w-48" />
    </div>
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Pills, avatar, block
      </p>
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-10 flex-1 rounded-lg" />
      </div>
    </div>
  </div>
);
