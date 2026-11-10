import { Skeleton } from "@workspace/ui/components/skeleton";

export default function Loading() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-48" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
        <Skeleton className="h-32 rounded-lg" />
      </div>

      <Skeleton className="h-96 w-full rounded-lg" />

      <div className="space-y-4 rounded-lg border p-6">
        <Skeleton className="h-6 w-56" />
        <div className="grid gap-3 md:grid-cols-2">
          {[...Array(4)].map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </div>

      <div className="space-y-4 rounded-lg border p-6">
        <Skeleton className="h-6 w-40" />
        <div className="space-y-3">
          {[...Array(6)].map((_, index) => (
            <Skeleton key={index} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
