import { Skeleton } from "@workspace/ui/components/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-9 w-96" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-10" />
        ))}
      </div>
      <Skeleton className="h-10 w-full sm:max-w-md" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
