"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import { Search } from "lucide-react";
import { eventNames } from "@/lib/constants";
import {
  formatAverageResult,
  formatBestResult,
  type CompetitionResultRow,
  type ResultsByEventGroup,
  type ResultsByPersonGroup,
} from "../../_lib/results";
import { StateLabel } from "@/components/state-flag";
import { roundTypeLabel, formatAttemptValue } from "@/lib/utils";
import { normalizeSearchText } from "@/lib/search";

interface CompetitionHeaderData {
  event_ids: string[];
  main_event_id: string | null;
}

interface ResultsPodiumsViewProps {
  podiumGroups: [string, CompetitionResultRow[]][];
}

interface ResultsAllViewProps {
  competitionId: string;
  competitionData: CompetitionHeaderData;
  groupedResultsByEvent: ResultsByEventGroup[];
  selectedEventId: string;
}

interface ResultsByPersonViewProps {
  groupedByPerson: ResultsByPersonGroup[];
}

export function ResultsPodiumsView({ podiumGroups }: ResultsPodiumsViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Podios</CardTitle>
        <CardDescription>
          Los resultados mexicanos del podio por evento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {podiumGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay podios disponibles.
          </p>
        ) : (
          podiumGroups.map(([eventId, eventResults]) => {
            const solveCount = Math.max(
              1,
              ...eventResults.map((resultRow) => resultRow.solves?.length ?? 0),
            );

            return (
              <div key={eventId} className="space-y-3">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <span className={`cubing-icon event-${eventId} text-xl`} />
                  {eventNames[eventId] || eventId}
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Posición</TableHead>
                        <TableHead>Competidor</TableHead>
                        <TableHead>Ronda</TableHead>
                        <TableHead className="text-right">Single</TableHead>
                        <TableHead className="text-right">Average</TableHead>
                        <TableHead colSpan={solveCount} className="text-center">
                          Resoluciones
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eventResults
                        .slice()
                        .sort(
                          (left, right) =>
                            (left.position ?? 999) - (right.position ?? 999),
                        )
                        .map((resultRow) => {
                          const solves = resultRow.solves ?? [];
                          const hasFiveSolves = solves.length >= 5;
                          const min = hasFiveSolves
                            ? Math.min(...solves.filter((value) => value !== 0))
                            : undefined;
                          const max = hasFiveSolves
                            ? Math.max(...solves)
                            : undefined;

                          return (
                            <TableRow
                              key={`${resultRow.eventId}-${resultRow.personId}-${resultRow.position ?? 0}`}
                            >
                              <TableCell>{resultRow.position ?? "—"}</TableCell>
                              <TableCell className="font-medium">
                                <div>
                                  <Link
                                    href={`/persons/${resultRow.personId}`}
                                    className="hover:underline"
                                  >
                                    {resultRow.personName ?? resultRow.personId}
                                  </Link>
                                </div>
                                {resultRow.personState && (
                                  <div className="text-xs text-muted-foreground">
                                    <StateLabel
                                      stateName={resultRow.personState}
                                      size={12}
                                    />
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                {roundTypeLabel(resultRow.roundTypeId)}
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                {formatBestResult(resultRow)}
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                {formatAverageResult(resultRow)}
                              </TableCell>
                              {Array.from({ length: solveCount }).map(
                                (_, index) => {
                                  const value = solves[index];
                                  const formattedValue =
                                    value === undefined
                                      ? null
                                      : formatAttemptValue(
                                          resultRow.eventId,
                                          value,
                                        );

                                  return (
                                    <TableCell
                                      key={`${resultRow.eventId}-${resultRow.personId}-${resultRow.position ?? 0}-${index}`}
                                      className="text-center whitespace-nowrap"
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
                                        <span className="text-muted-foreground">
                                          —
                                        </span>
                                      )}
                                    </TableCell>
                                  );
                                },
                              )}
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export function ResultsAllView({
  competitionId,
  competitionData,
  groupedResultsByEvent,
  selectedEventId,
}: ResultsAllViewProps) {
  const activeEvent =
    groupedResultsByEvent.find((event) => event.eventId === selectedEventId) ??
    groupedResultsByEvent[0] ??
    null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resultados por evento</CardTitle>
        <CardDescription>
          Revisa todas las rondas de un evento específico.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2 text-muted-foreground">
          {competitionData.event_ids.map((eventId) => {
            const href = `/competitions/${competitionId}/results/all?event=${eventId}`;

            return (
              <Link
                key={eventId}
                href={href}
                className={cn(
                  `cubing-icon event-${eventId} text-2xl hover:text-primary/50 transition-colors`,
                  selectedEventId === eventId && "text-primary",
                )}
              />
            );
          })}
        </div>

        {!activeEvent ? (
          <p className="text-sm text-muted-foreground">
            No hay resultados para el evento seleccionado.
          </p>
        ) : (
          <div className="space-y-3">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <span
                className={`cubing-icon event-${activeEvent.eventId} text-xl`}
              />
              {activeEvent.eventName}
            </h3>
            {activeEvent.rounds.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hay rondas registradas para este evento.
              </p>
            ) : (
              activeEvent.rounds.map((round) => {
                const solveCount = Math.max(
                  1,
                  ...round.rows.map(
                    (resultRow) => resultRow.solves?.length ?? 0,
                  ),
                );

                return (
                  <div
                    key={`${activeEvent.eventId}-${round.roundTypeId}`}
                    className="space-y-2"
                  >
                    <h4 className="text-sm font-medium">{round.roundLabel}</h4>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Posición</TableHead>
                            <TableHead>Competidor</TableHead>
                            <TableHead>Ronda</TableHead>
                            <TableHead className="text-right">Single</TableHead>
                            <TableHead className="text-right">
                              Average
                            </TableHead>
                            <TableHead
                              colSpan={solveCount}
                              className="text-center"
                            >
                              Resoluciones
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {round.rows.map((resultRow) => {
                            const solves = resultRow.solves ?? [];
                            const hasFiveSolves = solves.length >= 5;
                            const min = hasFiveSolves
                              ? Math.min(
                                  ...solves.filter((value) => value !== 0),
                                )
                              : undefined;
                            const max = hasFiveSolves
                              ? Math.max(...solves)
                              : undefined;

                            return (
                              <TableRow
                                key={`${resultRow.eventId}-${resultRow.personId}-${resultRow.position ?? 0}`}
                              >
                                <TableCell>
                                  {resultRow.position ?? "—"}
                                </TableCell>
                                <TableCell className="font-medium">
                                  <div>
                                    <Link
                                      href={`/persons/${resultRow.personId}`}
                                      className="hover:underline"
                                    >
                                      {resultRow.personName ??
                                        resultRow.personId}
                                    </Link>
                                  </div>
                                  {resultRow.personState && (
                                    <div className="text-xs text-muted-foreground">
                                      <StateLabel
                                        stateName={resultRow.personState}
                                        size={12}
                                      />
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>{round.roundLabel}</TableCell>
                                <TableCell className="text-right font-bold">
                                  {formatBestResult(resultRow)}
                                </TableCell>
                                <TableCell className="text-right font-bold">
                                  {formatAverageResult(resultRow)}
                                </TableCell>
                                {Array.from({ length: solveCount }).map(
                                  (_, index) => {
                                    const value = solves[index];
                                    const formattedValue =
                                      value === undefined
                                        ? null
                                        : formatAttemptValue(
                                            resultRow.eventId,
                                            value,
                                          );

                                    return (
                                      <TableCell
                                        key={`${resultRow.eventId}-${resultRow.personId}-${resultRow.position ?? 0}-${index}`}
                                        className="text-center whitespace-nowrap"
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
                                  },
                                )}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ResultsByPersonView({
  groupedByPerson,
}: ResultsByPersonViewProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredGroups = useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchQuery.trim());

    if (!normalizedQuery) {
      return groupedByPerson;
    }

    return groupedByPerson.filter((personGroup) => {
      const personName = normalizeSearchText(personGroup.personName);
      const personId = normalizeSearchText(personGroup.personId);

      return (
        personName.includes(normalizedQuery) ||
        personId.includes(normalizedQuery)
      );
    });
  }, [groupedByPerson, searchQuery]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Por persona</CardTitle>
        <CardDescription>Resultados agrupados por competidor.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Buscar por nombre..."
            aria-label="Buscar competidor por nombre"
            className="pl-9"
          />
        </div>

        {filteredGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {searchQuery
              ? "No hay competidores que coincidan con tu búsqueda."
              : "No hay resultados agrupados por persona."}
          </p>
        ) : (
          filteredGroups.map((personGroup) => {
            const solveCount = Math.max(
              1,
              ...personGroup.results.map(
                (resultRow) => resultRow.solves?.length ?? 0,
              ),
            );

            return (
              <div key={personGroup.personId} className="space-y-3">
                <h3 className="text-base font-semibold">
                  <Link
                    href={`/persons/${personGroup.personId}`}
                    className="hover:underline"
                  >
                    {personGroup.personName ?? personGroup.personId}
                  </Link>
                  {personGroup.results[0]?.personState && (
                    <span className="ml-2 text-sm text-muted-foreground">
                      <StateLabel
                        stateName={personGroup.results[0].personState}
                        size={14}
                      />
                    </span>
                  )}
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Evento</TableHead>
                        <TableHead>Ronda</TableHead>
                        <TableHead>#</TableHead>
                        <TableHead>Single</TableHead>
                        <TableHead>Average</TableHead>
                        <TableHead colSpan={solveCount} className="text-center">
                          Resoluciones
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {personGroup.results
                        .slice()
                        .sort(
                          (left, right) =>
                            left.eventRank - right.eventRank ||
                            (left.position ?? 999) - (right.position ?? 999),
                        )
                        .map((resultRow) => {
                          const solves = resultRow.solves ?? [];
                          const hasFiveSolves = solves.length >= 5;
                          const min = hasFiveSolves
                            ? Math.min(...solves.filter((value) => value !== 0))
                            : undefined;
                          const max = hasFiveSolves
                            ? Math.max(...solves)
                            : undefined;

                          return (
                            <TableRow
                              key={`${resultRow.eventId}-${resultRow.personId}-${resultRow.position ?? 0}-${resultRow.roundTypeId}`}
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`cubing-icon event-${resultRow.eventId} text-lg`}
                                  />
                                  <span>{resultRow.eventName}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {roundTypeLabel(resultRow.roundTypeId)}
                              </TableCell>
                              <TableCell>{resultRow.position ?? "—"}</TableCell>
                              <TableCell>
                                {formatBestResult(resultRow)}
                              </TableCell>
                              <TableCell>
                                {formatAverageResult(resultRow)}
                              </TableCell>
                              {Array.from({ length: solveCount }).map(
                                (_, index) => {
                                  const value = solves[index];
                                  const formattedValue =
                                    value === undefined
                                      ? null
                                      : formatAttemptValue(
                                          resultRow.eventId,
                                          value,
                                        );

                                  return (
                                    <TableCell
                                      key={`${resultRow.eventId}-${resultRow.personId}-${resultRow.position ?? 0}-${resultRow.roundTypeId}-${index}`}
                                      className="text-center whitespace-nowrap"
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
                                },
                              )}
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
