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
import { roundTypeLabel, formatAttemptValue } from "@/lib/utils";
import { cn } from "@workspace/ui/lib/utils";
import type {
  PersonResultsByEventGroup,
  PersonResultsEventOption,
} from "../_lib/queries";

type PersonResultsTabProps = {
  eventOptions: PersonResultsEventOption[];
  selectedEventId: string;
  selectedResults: PersonResultsByEventGroup | null;
};

function getPodiumRowClass(
  position?: number | null,
  roundTypeId?: string | null,
  best?: number | null,
) {
  if ((roundTypeId !== "c" && roundTypeId !== "f") || !best || best <= 0) {
    return "";
  }

  switch (position) {
    case 1:
      return "border-amber-500/30 bg-amber-500/10";
    case 2:
      return "border-slate-400/30 bg-slate-400/10";
    case 3:
      return "border-yellow-500/30 bg-yellow-500/10";
    default:
      return "";
  }
}

export function PersonResultsTab({
  eventOptions,
  selectedEventId,
  selectedResults,
}: PersonResultsTabProps) {
  if (eventOptions.length === 0 || !selectedResults) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Esta persona todavía no tiene resultados registrados.
          </p>
        </CardContent>
      </Card>
    );
  }

  const solveCount = Math.max(
    1,
    ...selectedResults.results.map((resultRow) => resultRow.solves.length),
  );

  const firstIndexByCompetition = selectedResults.results.reduce<
    Record<string, number>
  >((accumulator, resultRow, index) => {
    if (accumulator[resultRow.competitionId] === undefined) {
      accumulator[resultRow.competitionId] = index;
    }

    return accumulator;
  }, {});

  return (
    <Card>
      <CardHeader className="space-y-6">
        <div className="flex flex-wrap justify-center gap-2 text-muted-foreground">
          {eventOptions.map((group) => {
            const href = `?tab=results-by-event&event=${group.eventId}`;

            return (
              <Link
                key={group.eventId}
                href={href}
                className={cn(
                  `cubing-icon event-${group.eventId} text-3xl hover:text-primary/50 transition-colors`,
                  selectedEventId === group.eventId && "text-primary",
                )}
              />
            );
          })}
        </div>
        <CardTitle className="flex items-center gap-2">
          <span
            className={`cubing-icon event-${selectedResults.eventId} text-xl`}
          />
          {selectedResults.eventName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead rowSpan={2}>Competencia</TableHead>
                <TableHead rowSpan={2}>Ronda</TableHead>
                <TableHead rowSpan={2}>Lugar</TableHead>
                <TableHead rowSpan={2} className="text-center">
                  Single
                </TableHead>
                {selectedResults.eventId !== "333mbf" && (
                  <TableHead rowSpan={2} className="text-center">
                    Average
                  </TableHead>
                )}
                <TableHead colSpan={solveCount} className="text-center">
                  Resoluciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selectedResults.results.map((resultRow, rowIndex) => {
                const isFirstForCompetition =
                  firstIndexByCompetition[resultRow.competitionId] === rowIndex;
                const hasFiveSolves = resultRow.solves.length >= 5;
                const min = hasFiveSolves
                  ? Math.min(...resultRow.solves.filter((value) => value !== 0))
                  : undefined;
                const max = hasFiveSolves
                  ? Math.max(...resultRow.solves)
                  : undefined;
                const podiumRowClass = getPodiumRowClass(
                  resultRow.position,
                  resultRow.roundTypeId,
                  resultRow.best,
                );

                return (
                  <TableRow
                    key={resultRow.resultId}
                    className={cn(podiumRowClass, "transition-colors")}
                  >
                    <TableCell className="whitespace-nowrap">
                      {isFirstForCompetition ? (
                        <Link
                          className="hover:underline"
                          href={`/competitions/${resultRow.competitionId}`}
                        >
                          {resultRow.competitionName}
                        </Link>
                      ) : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {roundTypeLabel(resultRow.roundTypeId)}
                    </TableCell>
                    <TableCell className="text-center">
                      {resultRow.position ?? "—"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-center whitespace-nowrap font-bold",
                        resultRow.isPersonalRecordSingle &&
                          "font-semibold text-blue-700",
                      )}
                    >
                      {resultRow.best === 0
                        ? null
                        : formatAttemptValue(resultRow.eventId, resultRow.best)}
                    </TableCell>
                    {resultRow.eventId !== "333mbf" && (
                      <TableCell
                        className={cn(
                          "text-center whitespace-nowrap font-bold",
                          resultRow.isPersonalRecordAverage &&
                            "font-semibold text-blue-700",
                        )}
                      >
                        {resultRow.average === 0
                          ? null
                          : resultRow.eventId === "333fm" &&
                              resultRow.average > 0
                            ? resultRow.average / 100
                            : formatAttemptValue(
                                resultRow.eventId,
                                resultRow.average,
                              )}
                      </TableCell>
                    )}
                    {Array.from({ length: solveCount }).map((_, index) => {
                      const value = resultRow.solves[index];
                      const formattedValue =
                        value === undefined
                          ? null
                          : formatAttemptValue(resultRow.eventId, value);

                      return (
                        <TableCell
                          key={`${resultRow.resultId}-${index}`}
                          className={cn("text-center whitespace-nowrap")}
                        >
                          {formattedValue ? (
                            hasFiveSolves &&
                            value !== 0 &&
                            (value === min || value === max) ? (
                              `(${formattedValue})`
                            ) : (
                              formattedValue
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
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
