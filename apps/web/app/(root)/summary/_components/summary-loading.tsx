import { Skeleton } from "@workspace/ui/components/skeleton";

export function SummaryLoading() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <Skeleton className="mx-auto h-8 w-2/3" />
      <Skeleton className="mx-auto h-4 w-1/2" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
