import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import type { RecordHistoryEntry } from "../_lib/queries";
import { formatRecordResult, formatRecordSolves } from "../_lib/format";

function formatCircaDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function SolvesCell({
  eventId,
  solves,
}: {
  eventId: string;
  solves: number[];
}) {
  const formatted = formatRecordSolves(eventId, solves);

  return (
    <p className="flex gap-4">
      {formatted.map(({ key, text, isOutlier }) =>
        text == null ? null : (
          <span key={key}>{isOutlier ? `(${text})` : text}</span>
        ),
      )}
    </p>
  );
}

function HistoryRow({
  entry,
  showEvent,
  showSolves,
}: {
  entry: RecordHistoryEntry;
  showEvent: boolean;
  showSolves: boolean;
}) {
  return (
    <TableRow>
      <TableCell className="whitespace-nowrap">
        {formatCircaDate(entry.competitionStartDate)}
      </TableCell>
      {showEvent ? (
        <TableCell className="whitespace-nowrap">
          <div className="flex gap-2 items-center">
            <span className={`cubing-icon event-${entry.eventId} text-xl`} />
            {entry.eventName}
          </div>
        </TableCell>
      ) : null}
      <TableCell className="whitespace-nowrap">
        {entry.personName ? (
          <Link className="hover:underline" href={`/persons/${entry.personId}`}>
            {entry.personName}
          </Link>
        ) : null}
      </TableCell>
      <TableCell>
        {entry.isSingleRecord && entry.best > 0
          ? formatRecordResult(entry.eventId, entry.best)
          : null}
      </TableCell>
      <TableCell>
        {entry.isAverageRecord && entry.average > 0
          ? formatRecordResult(entry.eventId, entry.average)
          : null}
      </TableCell>
      <TableCell className="whitespace-nowrap">{entry.personState}</TableCell>
      <TableCell className="whitespace-nowrap">
        <Link
          className="hover:underline"
          href={`/competitions/${entry.competitionId}`}
        >
          {entry.competitionName}
        </Link>
      </TableCell>
      {showSolves ? (
        <TableCell className="whitespace-nowrap">
          <SolvesCell eventId={entry.eventId} solves={entry.solves} />
        </TableCell>
      ) : null}
    </TableRow>
  );
}

export function HistoryRecordsTables({
  records,
}: {
  records: RecordHistoryEntry[];
}) {
  const grouped = records.reduce<
    Map<
      string,
      {
        eventId: string;
        eventName: string;
        eventRank: number;
        rows: RecordHistoryEntry[];
      }
    >
  >((acc, row) => {
    const group = acc.get(row.eventId) ?? {
      eventId: row.eventId,
      eventName: row.eventName,
      eventRank: row.eventRank,
      rows: [],
    };
    group.rows.push(row);
    acc.set(row.eventId, group);
    return acc;
  }, new Map());

  const groups = Array.from(grouped.values()).sort(
    (a, b) => a.eventRank - b.eventRank,
  );

  return (
    <>
      {groups.map((group) => (
        <div key={group.eventId} className="space-y-4 py-4">
          <div className="flex gap-2 items-center">
            <span className={`cubing-icon event-${group.eventId} text-2xl`} />
            <h2 className="text-lg font-medium">{group.eventName}</h2>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Single</TableHead>
                <TableHead>Average</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Competencia</TableHead>
                <TableHead>Resoluciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {group.rows.map((entry) => (
                <HistoryRow
                  key={entry.resultId}
                  entry={entry}
                  showEvent={false}
                  showSolves
                />
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </>
  );
}

export function MixedHistoryRecordsTable({
  records,
}: {
  records: RecordHistoryEntry[];
}) {
  return (
    <div className="py-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fecha</TableHead>
            <TableHead>Evento</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Single</TableHead>
            <TableHead>Average</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Competencia</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((entry) => (
            <HistoryRow
              key={entry.resultId}
              entry={entry}
              showEvent
              showSolves={false}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
