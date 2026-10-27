import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import { formatAttemptValue, formatTime, formatTime333mbf } from "@/lib/utils";
import type { PersonalRecordWithStateRank } from "../_lib/queries";

/** A rank cell: bold for first place, N/A when unranked, empty when there's no result. */
function RankCell({ rank }: { rank: number | null | undefined }) {
  return (
    <TableCell
      className={cn("text-center", rank === 1 && "font-semibold text-blue-700")}
    >
      {rank === 0 || rank === null ? (
        <span className="text-muted-foreground font-thin">N/A</span>
      ) : (
        rank
      )}
    </TableCell>
  );
}

function formatSingle(eventId: string, best: number) {
  if (eventId === "333mbf") return formatTime333mbf(best);
  if (eventId === "333fm") return best;
  return formatTime(best);
}

export function PersonalRecordsTable({
  events,
  personalRecords,
  showStateRank,
}: {
  events: { id: string; name: string }[];
  personalRecords: Record<string, PersonalRecordWithStateRank>;
  showStateRank: boolean;
}) {
  const records = events.flatMap((event) => {
    const record = personalRecords[event.id];
    return record ? [{ event, record }] : [];
  });

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Evento</TableHead>
          {showStateRank && <TableHead className="text-center">SR</TableHead>}
          <TableHead className="text-center">NR</TableHead>
          <TableHead className="text-center">CR</TableHead>
          <TableHead className="text-center">WR</TableHead>
          <TableHead className="text-center">Single</TableHead>
          <TableHead className="text-center">Average</TableHead>
          <TableHead className="text-center">WR</TableHead>
          <TableHead className="text-center">CR</TableHead>
          <TableHead className="text-center">NR</TableHead>
          {showStateRank && <TableHead className="text-center">SR</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map(({ event, record }) => (
          <TableRow key={event.id}>
            <TableCell>
              <span className={`cubing-icon event-${event.id}`} />
              <span className="ml-2">{event.name}</span>
            </TableCell>
            {showStateRank && <RankCell rank={record.single.stateRank} />}
            <RankCell rank={record.single.countryRank} />
            <RankCell rank={record.single.continentRank} />
            <RankCell rank={record.single.worldRank} />
            <TableCell className="text-center font-semibold">
              {formatSingle(event.id, record.single.best)}
            </TableCell>
            <TableCell className="text-center font-semibold">
              {record.average?.best
                ? formatAttemptValue(event.id, record.average.best, "average")
                : null}
            </TableCell>
            <RankCell rank={record.average?.worldRank} />
            <RankCell rank={record.average?.continentRank} />
            <RankCell rank={record.average?.countryRank} />
            {showStateRank && <RankCell rank={record.average?.stateRank} />}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
