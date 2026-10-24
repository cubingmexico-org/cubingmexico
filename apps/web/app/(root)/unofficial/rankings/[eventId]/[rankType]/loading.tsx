import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { Skeleton } from "@workspace/ui/components/skeleton";

export default function Loading() {
  return (
    <>
      <div className="mb-6 flex flex-col gap-4">
        <Skeleton className="h-9 w-96" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-10 w-10" />
          ))}
        </div>
        <Skeleton className="h-10 w-full sm:max-w-md" />
      </div>
      <DataTableSkeleton
        columnCount={5}
        filterCount={2}
        cellWidths={["4rem", "20rem", "8rem", "16rem", "6rem"]}
        shrinkZero
      />
    </>
  );
}
