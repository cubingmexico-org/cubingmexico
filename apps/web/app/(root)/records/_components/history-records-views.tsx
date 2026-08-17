import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { roundRank } from "@/lib/utils";
import type { RecordHistoryEntry } from "../_lib/queries";
import { formatRecordResult, formatRecordSolves } from "../_lib/format";
import { StateLabel } from "@/components/state-flag";

/** Format a calendar date key (YYYY-MM-DD) without local timezone day shifts. */
function formatCircaDate(dateKey: string): string {
  const key = dateKey.slice(0, 10);
  return new Date(`${key}T12:00:00.000Z`).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
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
        {formatCircaDate(entry.recordDate)}
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
          <Link
            className="text-link hover:text-link/80"
            href={`/persons/${entry.personId}`}
          >
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
          ? formatRecordResult(entry.eventId, entry.average, "average")
          : null}
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <StateLabel stateName={entry.personState} />
      </TableCell>
      <TableCell className="whitespace-nowrap">
        <Link
          className="text-link hover:text-link/80"
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

type HistoryDisplayRow = {
  key: string;
  entry: RecordHistoryEntry;
};

/** Split a result that set both single and average into two rows (WCA style). */
function expandRecordHistoryRows(
  rows: RecordHistoryEntry[],
): HistoryDisplayRow[] {
  const expanded: HistoryDisplayRow[] = [];

  for (const row of rows) {
    if (row.isSingleRecord) {
      expanded.push({
        key: `${row.resultId}-single`,
        entry: { ...row, isAverageRecord: false },
      });
    }
    if (row.isAverageRecord) {
      expanded.push({
        key: `${row.resultId}-average`,
        entry: { ...row, isSingleRecord: false },
      });
    }
  }

  return expanded;
}

/** Newest first; same day ordered by round (later rounds first), then single before average. */
function byChronologicalDesc(
  a: HistoryDisplayRow,
  b: HistoryDisplayRow,
): number {
  const dateDelta = b.entry.recordDate.localeCompare(a.entry.recordDate);
  if (dateDelta !== 0) return dateDelta;

  const roundDelta =
    roundRank(a.entry.roundTypeId) - roundRank(b.entry.roundTypeId);
  if (roundDelta !== 0) return roundDelta;

  if (a.entry.isSingleRecord !== b.entry.isSingleRecord) {
    return a.entry.isSingleRecord ? -1 : 1;
  }

  return a.entry.eventRank - b.entry.eventRank;
}

/** Per-event history: all singles first (date desc), then all averages (date desc). */
function toWcaHistoryRows(rows: RecordHistoryEntry[]): HistoryDisplayRow[] {
  return expandRecordHistoryRows(rows).sort((a, b) => {
    if (a.entry.isSingleRecord !== b.entry.isSingleRecord) {
      return a.entry.isSingleRecord ? -1 : 1;
    }
    return byChronologicalDesc(a, b);
  });
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
      {groups.map((group) => {
        const historyRows = toWcaHistoryRows(group.rows);

        return (
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
                {historyRows.map(({ key, entry }) => (
                  <HistoryRow
                    key={key}
                    entry={entry}
                    showEvent={false}
                    showSolves
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        );
      })}
    </>
  );
}

export function MixedHistoryRecordsTable({
  records,
}: {
  records: RecordHistoryEntry[];
}) {
  const historyRows =
    expandRecordHistoryRows(records).sort(byChronologicalDesc);

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
            <TableHead>Resoluciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {historyRows.map(({ key, entry }) => (
            <HistoryRow key={key} entry={entry} showEvent showSolves />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
