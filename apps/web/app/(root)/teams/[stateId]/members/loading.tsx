import { Skeleton } from "@workspace/ui/components/skeleton";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-48" />
      </div>
      <DataTableSkeleton
        columnCount={8}
        filterCount={3}
        cellWidths={[
          "10rem",
          "30rem",
          "10rem",
          "10rem",
          "6rem",
          "6rem",
          "6rem",
          "6rem",
        ]}
        shrinkZero
      />
    </div>
  );
}
