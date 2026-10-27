import Link from "next/link";
import { TableCell } from "@workspace/ui/components/table";

export function PersonLink({
  wcaId,
  name,
}: {
  wcaId: string;
  name: string | null;
}) {
  return (
    <Link
      prefetch={false}
      href={`/persons/${wcaId}`}
      className="text-link hover:text-link/80"
    >
      {name ?? wcaId}
    </Link>
  );
}

export function EventNameCell({
  eventId,
  eventName,
}: {
  eventId: string;
  eventName: string;
}) {
  return (
    <TableCell>
      <span className={`cubing-icon event-${eventId}`} />
      <span className="ml-2">{eventName}</span>
    </TableCell>
  );
}

export function MedalCells({
  gold,
  silver,
  bronze,
}: {
  gold: number;
  silver: number;
  bronze: number;
}) {
  return (
    <>
      <TableCell className="text-center font-semibold text-amber-500 dark:text-amber-400">
        {gold || ""}
      </TableCell>
      <TableCell className="text-center font-semibold text-slate-500 dark:text-slate-300">
        {silver || ""}
      </TableCell>
      <TableCell className="text-center font-semibold text-yellow-700 dark:text-yellow-600">
        {bronze || ""}
      </TableCell>
    </>
  );
}
