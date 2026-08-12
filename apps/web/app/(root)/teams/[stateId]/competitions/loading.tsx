import { Skeleton } from "@workspace/ui/components/skeleton";

function CompetitionColumnSkeleton() {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, index) => (
          <div
            key={index}
            className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start"
          >
            <div className="grow space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-9 w-28 shrink-0" />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Loading() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <CompetitionColumnSkeleton />
      <CompetitionColumnSkeleton />
    </div>
  );
}
