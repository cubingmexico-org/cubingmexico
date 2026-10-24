import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { formatDate, roundTypeLabel } from "@/lib/utils";
import { formatCcResult, type CcResultRow } from "@/lib/cubing-contests";
import {
  CcCompetitorName,
  CcCompetitors,
} from "@/components/cubing-contests/cc-competitors";
import { CcEventIcon } from "@/components/cubing-contests/cc-event-icon";
import { CcRecordBadge } from "@/components/cubing-contests/cc-record-badge";

type CcResultsTableProps = {
  rows: CcResultRow[];
  /**
   * `competitors`: one row per result with every competitor (competition page).
   * `competitions`: one row per result with its competition, plus teammates of
   * `personWcaId` for team events (person profile).
   * `events`: one row per result with its event and round, plus teammates of
   * `personWcaId` (one person's results at a competition).
   */
  mode: "competitors" | "competitions" | "events";
  personWcaId?: string;
};

function SolveCells({
  row,
  solveCount,
}: {
  row: CcResultRow;
  solveCount: number;
}) {
  const attempts = row.attempts;
  const nonZero = attempts.filter((value) => value !== 0);
  const bracket = attempts.length >= 5 && nonZero.length > 0;
  const positive = nonZero.filter((value) => value > 0);
  const hasDnf = nonZero.some((value) => value < 0);
  const min = positive.length > 0 ? Math.min(...positive) : undefined;
  const max = hasDnf
    ? nonZero.find((value) => value < 0)
    : positive.length > 0
      ? Math.max(...positive)
      : undefined;

  return (
    <>
      {Array.from({ length: solveCount }).map((_, index) => {
        const value = attempts[index];
        const formatted =
          value === undefined ? null : formatCcResult(row.eventFormat, value);
        return (
          <TableCell
            key={`${row.resultId}-${index}`}
            className="text-center whitespace-nowrap"
          >
            {formatted ? (
              bracket && (value === min || value === max) ? (
                `(${formatted})`
              ) : (
                formatted
              )
            ) : (
              <span className="text-muted-foreground font-thin">—</span>
            )}
          </TableCell>
        );
      })}
    </>
  );
}

export function CcResultsTable({
  rows,
  mode,
  personWcaId,
}: CcResultsTableProps) {
  const solveCount = Math.max(1, ...rows.map((row) => row.attempts.length));
  const hasTeams = rows.some((row) => row.competitors.length > 1);
  const showRound = mode !== "competitors";
  const showTeammates = mode !== "competitors" && hasTeams;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {mode === "competitions" && <TableHead>Competencia</TableHead>}
            {mode === "events" && <TableHead>Evento</TableHead>}
            {showRound && <TableHead>Ronda</TableHead>}
            <TableHead>Posición</TableHead>
            {mode === "competitors" && <TableHead>Competidor</TableHead>}
            {showTeammates && <TableHead>Con</TableHead>}
            <TableHead className="text-right">Single</TableHead>
            <TableHead className="text-right">Average</TableHead>
            <TableHead colSpan={solveCount} className="text-center">
              Resoluciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.resultId}>
              {mode === "competitions" && (
                <TableCell className="font-medium">
                  <Link
                    prefetch={false}
                    href={`/competitions/${row.competitionId}/results/unofficial?event=${row.eventId}`}
                    className="text-link hover:text-link/80"
                  >
                    {row.competitionName}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(row.date, row.date)}
                  </div>
                </TableCell>
              )}
              {mode === "events" && (
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <CcEventIcon
                      eventId={row.eventId}
                      eventName={row.eventName}
                      className="text-lg"
                    />
                    <span>{row.eventName}</span>
                  </div>
                </TableCell>
              )}
              {showRound && (
                <TableCell>{roundTypeLabel(row.roundTypeId)}</TableCell>
              )}
              <TableCell>{row.position ?? "—"}</TableCell>
              {mode === "competitors" && (
                <TableCell className="font-medium">
                  <CcCompetitors competitors={row.competitors} />
                </TableCell>
              )}
              {showTeammates && (
                <TableCell>
                  <div className="space-y-1">
                    {row.competitors
                      .filter((competitor) => competitor.wcaId !== personWcaId)
                      .map((competitor) => (
                        <div key={competitor.ccPersonId}>
                          <CcCompetitorName competitor={competitor} />
                        </div>
                      ))}
                  </div>
                </TableCell>
              )}
              <TableCell className="text-right font-bold whitespace-nowrap">
                <CcRecordBadge marker={row.singleRecord} className="mr-1.5" />
                {row.best > 0 ? formatCcResult(row.eventFormat, row.best) : "—"}
              </TableCell>
              <TableCell className="text-right font-bold whitespace-nowrap">
                <CcRecordBadge marker={row.averageRecord} className="mr-1.5" />
                {row.average > 0
                  ? formatCcResult(row.eventFormat, row.average, "average")
                  : "—"}
              </TableCell>
              <SolveCells row={row} solveCount={solveCount} />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
