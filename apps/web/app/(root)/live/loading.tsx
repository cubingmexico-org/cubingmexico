import { Skeleton } from "@workspace/ui/components/skeleton";

export default function LiveLoading() {
  return (
    <main className="grow container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </main>
  );
}
