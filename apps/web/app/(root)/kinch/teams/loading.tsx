import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@workspace/ui/components/table";

export default function Loading() {
  return (
    <Table>
      <TableBody>
        {Array.from({ length: 20 }).map((_, index) => (
          <TableRow key={index}>
            <TableCell>
              <Skeleton className="h-4 w-6" />
            </TableCell>
            <TableCell className="whitespace-nowrap">
              <Skeleton className="h-4 w-32" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-12" />
            </TableCell>
            {Array.from({ length: 17 }).map((_, eventIndex) => (
              <TableCell key={eventIndex}>
                <Skeleton className="h-4 w-12" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
