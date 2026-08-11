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
import { formatAttemptValue } from "@/lib/utils";
import { cn } from "@workspace/ui/lib/utils";
import type { PersonChampionshipPodium } from "../_lib/queries";

type Props = {
  podiums: PersonChampionshipPodium[];
};

function positionClass(position: number | null) {
  switch (position) {
    case 1:
      return "text-amber-600 font-bold";
    case 2:
      return "text-slate-500 font-bold";
    case 3:
      return "text-yellow-700 font-bold";
    default:
      return "";
  }
}

function championshipTypeLabel(type: string) {
  switch (type) {
    case "world":
      return "Campeonato Mundial";
    case "_North America":
      return "Campeonato Norteamericano";
    case "MX":
      return "Campeonato Mexicano";
    default:
      return type;
  }
}

export function PersonChampionshipPodiumsTab({ podiums }: Props) {
  if (podiums.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Podios en Campeonatos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Esta persona no tiene podios en campeonatos registrados.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by competition (preserving order — already sorted by date desc)
  const grouped = podiums.reduce<
    Map<
      string,
      {
        competitionId: string;
        competitionName: string;
        competitionStartDate: string;
        championshipType: string;
        rows: PersonChampionshipPodium[];
      }
    >
  >((acc, row) => {
    const group = acc.get(row.competitionId) ?? {
      competitionId: row.competitionId,
      competitionName: row.competitionName,
      competitionStartDate: row.competitionStartDate,
      championshipType: row.championshipType,
      rows: [],
    };
    group.rows.push(row);
    acc.set(row.competitionId, group);
    return acc;
  }, new Map());

  const solveCount = Math.max(1, ...podiums.map((p) => p.solves.length));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Podios en Campeonatos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead className="text-center">Lugar</TableHead>
                <TableHead className="text-center">Single</TableHead>
                <TableHead className="text-center">Average</TableHead>
                <TableHead colSpan={solveCount} className="text-center">
                  Resoluciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from(grouped.values()).flatMap((group) => [
                // Competition section header
                <TableRow
                  key={`header-${group.competitionId}`}
                  className="bg-muted/50 hover:bg-muted/50"
                >
                  <TableCell colSpan={4 + solveCount} className="py-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-2">
                      <Link
                        href={`/competitions/${group.competitionId}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {group.competitionName}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {championshipTypeLabel(group.championshipType)}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>,

                // Podium rows
                ...group.rows.map((row) => {
                  const hasFiveSolves = row.solves.length >= 5;
                  const min = hasFiveSolves
                    ? Math.min(...row.solves.filter((v) => v > 0))
                    : undefined;
                  const max = hasFiveSolves
                    ? Math.max(...row.solves)
                    : undefined;

                  return (
                    <TableRow key={row.resultId}>
                      {/* Event */}
                      <TableCell className="whitespace-nowrap">
                        <span
                          className={`cubing-icon event-${row.eventId} mr-2`}
                        />
                        {row.eventName}
                      </TableCell>

                      {/* Place */}
                      <TableCell
                        className={cn(
                          "text-center",
                          positionClass(row.position),
                        )}
                      >
                        {row.position ?? "—"}
                      </TableCell>

                      {/* Single */}
                      <TableCell className="text-center font-semibold whitespace-nowrap">
                        {row.best > 0
                          ? formatAttemptValue(row.eventId, row.best)
                          : null}
                      </TableCell>

                      {/* Average */}
                      <TableCell className="text-center font-semibold whitespace-nowrap">
                        {row.average > 0
                          ? formatAttemptValue(
                              row.eventId,
                              row.average,
                              "average",
                            )
                          : null}
                      </TableCell>

                      {/* Solves */}
                      {Array.from({ length: solveCount }).map((_, i) => {
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
