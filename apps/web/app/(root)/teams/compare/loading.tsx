import { Skeleton } from "@workspace/ui/components/skeleton";

export default function Loading() {
  return (
    <>
      <Skeleton className="h-8 w-72 mx-auto mb-6" />
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-8">
        <Skeleton className="h-10 rounded-md" />
        <Skeleton className="size-9 rounded-md" />
        <Skeleton className="h-10 rounded-md" />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-8">
        <Skeleton className="size-32 mx-auto rounded" />
        <Skeleton className="h-8 w-10" />
        <Skeleton className="size-32 mx-auto rounded" />
      </div>
      <Skeleton className="w-full h-64 rounded-lg mb-6" />
      <Skeleton className="w-full h-96 rounded-lg" />
    </>
  );
}
