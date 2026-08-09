import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import { roundTypeLabel, formatAttemptValue } from "@/lib/utils";
import { cn } from "@workspace/ui/lib/utils";
import type { PersonRecordHistoryEntry } from "../_lib/queries";

type Props = {
  records: PersonRecordHistoryEntry[];
};

function recordBadgeClass(type: string | null) {
  if (type === "WR")
    return "bg-amber-500/15 text-amber-700 border-amber-500/30";
  if (type === "NAR") return "bg-blue-500/15 text-blue-700 border-blue-500/30";
  if (type === "NR")
    return "bg-green-500/15 text-green-700 border-green-500/30";
  if (type === "SR")
    return "bg-violet-500/15 text-violet-700 border-violet-500/30";
  return "";
}

function RecordBadges({
  regional,
  state,
}: {
  regional: string | null;
  state: string | null;
}) {
  return (
    <>
      {regional && (
        <Badge
          variant="outline"
          className={cn("text-xs px-1 py-0 h-5", recordBadgeClass(regional))}
        >
          {regional}
        </Badge>
      )}
      {state && (
        <Badge
          variant="outline"
          className={cn("text-xs px-1 py-0 h-5", recordBadgeClass(state))}
        >
          {state}
        </Badge>
      )}
    </>
  );
}

export function PersonRecordsTab({ records }: Props) {
  if (records.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historial de Récords</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Esta persona no tiene récords registrados.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by event, preserving event rank order (rows already ordered by event.rank)
  const grouped = records.reduce<
    Map<
      string,
      { eventId: string; eventName: string; rows: PersonRecordHistoryEntry[] }
    >
  >((acc, row) => {
    const group = acc.get(row.eventId) ?? {
      eventId: row.eventId,
      eventName: row.eventName,
      rows: [],
    };
    group.rows.push(row);
    acc.set(row.eventId, group);
    return acc;
  }, new Map());

  const solveCount = Math.max(1, ...records.map((r) => r.solves.length));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Récords</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Single</TableHead>
                <TableHead>Average</TableHead>
                <TableHead>Competencia</TableHead>
                <TableHead>Ronda</TableHead>
                <TableHead colSpan={solveCount} className="text-center">
                  Resoluciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(grouped.values()).flatMap((group) => [
                // Event group header row
                <TableRow
                  key={`header-${group.eventId}`}
                  className="bg-muted/50 hover:bg-muted/50"
                >
                  <TableCell
                    colSpan={4 + solveCount}
                    className="font-semibold py-2"
                  >
                    <span
                      className={`cubing-icon event-${group.eventId} mr-2`}
                    />
                    {group.eventName}
                  </TableCell>
                </TableRow>,

                // Individual record rows
                ...group.rows.map((row) => {
                  const hasFiveSolves = row.solves.length >= 5;
                  const min = hasFiveSolves
                    ? Math.min(...row.solves.filter((v) => v > 0))
                    : undefined;
                  const max = hasFiveSolves
                    ? Math.max(...row.solves)
                    : undefined;

                  const hasSingleRecord =
                    !!row.regionalSingleRecord || !!row.stateSingleRecord;
                  const hasAverageRecord =
                    !!row.regionalAverageRecord || !!row.stateAverageRecord;

                  return (
                    <TableRow key={row.resultId}>
                      {/* Single */}
                      <TableCell className="whitespace-nowrap font-semibold">
                        {hasSingleRecord && (
                          <div className="flex items-center gap-1.5">
                            {formatAttemptValue(row.eventId, row.best)}
                            <RecordBadges
                              regional={row.regionalSingleRecord}
                              state={row.stateSingleRecord}
                            />
                          </div>
                        )}
                      </TableCell>

                      {/* Average */}
                      <TableCell className="whitespace-nowrap font-semibold">
                        {hasAverageRecord && (
                          <div className="flex items-center gap-1.5">
                            {row.eventId === "333fm"
                              ? row.average / 100
                              : formatAttemptValue(row.eventId, row.average)}
                            <RecordBadges
                              regional={row.regionalAverageRecord}
                              state={row.stateAverageRecord}
                            />
                          </div>
                        )}
                      </TableCell>

                      {/* Competition */}
                      <TableCell className="whitespace-nowrap">
                        <Link
                          className="hover:underline text-primary"
                          href={`/competitions/${row.competitionId}`}
                        >
                          {row.competitionName}
                        </Link>
                      </TableCell>

                      {/* Round */}
                      <TableCell className="whitespace-nowrap">
                        {roundTypeLabel(row.roundTypeId)}
                      </TableCell>

                      {/* Solves */}
                      {hasAverageRecord &&
                        Array.from({ length: solveCount }).map((_, i) => {
                          const value = row.solves[i];
                          const formatted =
                            value === undefined
                              ? null
                              : formatAttemptValue(row.eventId, value);

                          return (
                            <TableCell
                              key={`${row.resultId}-${i}`}
                              className="text-center whitespace-nowrap"
                            >
                              {formatted ? (
                                hasFiveSolves &&
                                value !== 0 &&
                                (value === min || value === max) ? (
                                  <span className="text-muted-foreground">
                                    ({formatted})
                                  </span>
                                ) : (
                                  formatted
                                )
                              ) : (
                                <span className="text-muted-foreground font-thin">
                                  —
                                </span>
                              )}
                            </TableCell>
                          );
                        })}
                    </TableRow>
                  );
                }),
              ])}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
