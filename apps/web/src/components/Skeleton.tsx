export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-2xl bg-muted ${className ?? ""}`}
    />
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="block-card space-y-4 p-5">
      <Skeleton className="h-4 w-3/4 rounded-lg" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-4 w-16 rounded-lg" />
      </div>
      <Skeleton className="h-3 w-full rounded-lg" />
      <Skeleton className="h-14 w-full rounded-2xl" />
    </div>
  );
}
