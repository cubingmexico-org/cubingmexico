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
import { Search } from "lucide-react";
import {
  formatAverageResult,
  formatBestResult,
  type ResultsByPersonGroup,
} from "../../_lib/results";
import { StateLabel } from "@/components/state-flag";
import { roundTypeLabel, formatAttemptValue } from "@/lib/utils";
import { normalizeSearchText } from "@/lib/search";
import type { CcResultRow } from "@/lib/cubing-contests";
import { CcAttribution } from "@/components/cubing-contests/cc-attribution";
import { CcResultsTable } from "@/components/cubing-contests/cc-results-table";

interface ResultsByPersonViewProps {
  groupedByPerson: ResultsByPersonGroup[];
  /** Cubing Contests results keyed by WCA id, shown under each person's official results. */
  unofficialByPerson?: Record<string, CcResultRow[]>;
}

export function ResultsByPersonView({
  groupedByPerson,
  unofficialByPerson = {},
}: ResultsByPersonViewProps) {
  const hasUnofficial = Object.keys(unofficialByPerson).length > 0;
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
                    prefetch={false}
                    href={`/persons/${personGroup.personId}`}
                    className="text-link hover:text-link/80"
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
                {unofficialByPerson[personGroup.personId]?.length ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      No oficiales
                    </h4>
                    <CcResultsTable
                      rows={unofficialByPerson[personGroup.personId]!}
                      mode="events"
                      personWcaId={personGroup.personId}
                    />
                  </div>
                ) : null}
              </div>
            );
          })
        )}
        {hasUnofficial && <CcAttribution />}
      </CardContent>
    </Card>
  );
}
