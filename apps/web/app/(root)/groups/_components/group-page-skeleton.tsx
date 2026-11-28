import { Skeleton } from "@workspace/ui/components/skeleton";

/** Full group shell skeleton — used while GroupFrame loads the first time. */
export function GroupPageSkeleton() {
  return (
    <>
      <div className="relative h-100 overflow-hidden bg-muted">
        <Skeleton className="h-full w-full rounded-none" />
        <div className="absolute right-0 bottom-0 left-0 bg-linear-to-t from-black/60 to-transparent p-4 sm:p-6">
          <div className="container mx-auto flex min-w-0 flex-col items-stretch gap-4 sm:flex-row sm:items-end sm:gap-6">
            <div className="flex min-w-0 w-full gap-4 sm:gap-6">
              <Skeleton className="h-20 w-20 shrink-0 rounded-full border-4 border-white sm:h-24 sm:w-24" />
              <div className="mb-2 min-w-0 space-y-2">
                <Skeleton className="h-8 w-48 max-w-full" />
                <div className="flex flex-col items-start gap-2 sm:flex-row sm:gap-4">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </div>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-28" />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto min-w-0 space-y-8 px-4 py-8">
        <Skeleton className="h-11 w-full max-w-2xl rounded-lg" />
        <GroupContentSkeleton />
      </div>
    </>
  );
}

/** Tab body only — used by [groupId]/loading while the shell/tabs stay mounted. */
export function GroupContentSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <Skeleton className="h-10 w-full max-w-md rounded-lg" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}
