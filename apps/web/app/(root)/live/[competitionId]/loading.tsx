import { Skeleton } from "@workspace/ui/components/skeleton";

export default function LiveCompetitionLoading() {
  return (
    <main className="grow container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-10 w-2/3 max-w-lg" />
      <Skeleton className="h-4 w-48" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </main>
  );
}
