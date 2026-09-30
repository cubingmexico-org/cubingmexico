import { Skeleton } from "@workspace/ui/components/skeleton";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-9 w-80" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
      <DataTableSkeleton
        columnCount={5}
        filterCount={2}
        cellWidths={["4rem", "30rem", "8rem", "8rem", "8rem"]}
        shrinkZero
      />
    </div>
  );
}
