import { Skeleton } from "@workspace/ui/components/skeleton";

export default function Loading() {
  return (
    <>
      <Skeleton className="h-8 w-64 mx-auto mb-2" />
      <Skeleton className="h-5 w-96 max-w-full mx-auto mb-6" />
      <Skeleton className="h-10 w-full max-w-md mx-auto mb-8 rounded-md" />
      <Skeleton className="w-full h-96 rounded-lg" />
    </>
  );
}
