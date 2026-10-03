import { TableRow, TableCell } from "@workspace/ui/components/table";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { AlmostBronzeCard } from "./_components/almost-bronze-card";
import { MembersTableCard } from "./_components/members-table-card";

export default function Loading() {
  return (
    <>
      <MembersTableCard>
        {Array.from({ length: 10 }).map((_, index) => (
          <TableRow key={index}>
            <TableCell className="whitespace-nowrap">
              <Skeleton className="h-5 w-32" />
            </TableCell>
            <TableCell className="whitespace-nowrap">
              <Skeleton className="h-5 w-24" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-6 w-20 rounded-full" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-4" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-16" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-12" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-4" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-4" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-16" />
            </TableCell>
          </TableRow>
        ))}
      </MembersTableCard>
      <AlmostBronzeCard>
        {Array.from({ length: 5 }).map((_, index) => (
          <TableRow key={index}>
            <TableCell className="whitespace-nowrap">
              <Skeleton className="h-5 w-32" />
            </TableCell>
            <TableCell className="whitespace-nowrap">
              <Skeleton className="h-5 w-24" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-12" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-5 w-28" />
            </TableCell>
          </TableRow>
        ))}
      </AlmostBronzeCard>
    </>
  );
}
