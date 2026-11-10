import { Skeleton } from "@workspace/ui/components/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48 mx-auto" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
