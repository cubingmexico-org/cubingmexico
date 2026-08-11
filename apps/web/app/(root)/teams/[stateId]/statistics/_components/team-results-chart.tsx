"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { parseAsString, useQueryState } from "nuqs";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { formatAttemptValue, roundRank, roundTypeLabel } from "@/lib/utils";
import { cn } from "@workspace/ui/lib/utils";
import { loadTeamCompetitionResults } from "../_lib/actions";
import type {
  TeamResultsByEventGroup,
  TeamResultsEventOption,
} from "../_lib/queries";

type TeamResultsChartProps = {
  stateId: string;
  eventOptions: TeamResultsEventOption[];
};

type SessionPoint = {
  solveNumber: number;
  value: number | null;
  rawSolve: number;
  personName: string;
  competitionName: string;
  round: string;
  best: number | null;
  isStateRecord: boolean;
};

function formatSecondsToMMSS(seconds: number): string {
  if (seconds < 0 || Number.isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function attemptToChartValue(eventId: string, value: number): number | null {
  if (value <= 0) {
    return null;
  }

  if (eventId === "333fm") {
    return value;
  }

  if (eventId === "333mbf") {
    const valueStr = value.toString();
    const seconds = parseInt(valueStr.slice(2, 7), 10);
    return Number.isNaN(seconds) || seconds === 99999 ? null : seconds;
  }

  return value / 100;
}

function calculateDeviation(values: number[]): number | null {
  if (values.length < 2) return null;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

function formatDisplayValue(eventId: string, val: number | null): string {
  if (val === null || Number.isNaN(val) || !Number.isFinite(val)) {
    return "—";
  }
  if (eventId === "333fm") {
    return val.toFixed(2).replace(/\.00$/, "");
  }
  if (eventId === "333mbf") {
    return formatSecondsToMMSS(val);
  }
  return (
    formatAttemptValue(eventId, Math.round(val * 100)) ?? `${val.toFixed(2)}`
  );
}

function formatTotalTime(eventId: string, val: number | null): string {
  if (val === null || Number.isNaN(val) || !Number.isFinite(val)) {
    return "—";
  }
  if (eventId === "333fm") {
    return `${Math.round(val).toLocaleString("es-MX")} movs`;
  }

  if (val < 60) {
    return `${val.toFixed(2)}s`;
  }

  const seconds = val % 60;
  const totalMinutes = Math.floor(val / 60);
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const days = Math.floor(totalHours / 24);
  const secStr = seconds.toFixed(2).padStart(5, "0");

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${secStr}s`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secStr}s`;
  }
  return `${minutes}m ${secStr}s`;
}

function TeamResultsChartView({
  eventOptions,
  selectedEventId,
  selectedResults,
  onEventSelect,
  isLoading,
}: {
  eventOptions: TeamResultsEventOption[];
  selectedEventId: string;
  selectedResults: TeamResultsByEventGroup | null;
  onEventSelect: (eventId: string) => void;
  isLoading: boolean;
}) {
  const points = useMemo<SessionPoint[]>(() => {
    if (!selectedResults) {
      return [];
    }

    const chronological = selectedResults.results
      .slice()
      .sort((left, right) => {
        const dateDelta =
          Date.parse(left.competitionStartDate) -
          Date.parse(right.competitionStartDate);

        if (dateDelta !== 0) {
          return dateDelta;
        }

        const roundDelta =
          roundRank(right.roundTypeId) - roundRank(left.roundTypeId);
        if (roundDelta !== 0) {
          return roundDelta;
        }

        return (
          (left.position ?? 999) - (right.position ?? 999) ||
          left.best - right.best ||
          (left.personName ?? "").localeCompare(right.personName ?? "")
        );
      });

    const rawSolvesList: {
      value: number | null;
      rawSolve: number;
      personName: string;
      competitionName: string;
      round: string;
      isStateRecordResult: boolean;
      resultBest: number;
    }[] = [];

    for (const resultRow of chronological) {
      for (const solve of resultRow.solves) {
        if (solve === -2) continue;

        rawSolvesList.push({
          value: attemptToChartValue(resultRow.eventId, solve),
          rawSolve: solve,
          personName: resultRow.personName ?? resultRow.personId,
          competitionName: resultRow.competitionName,
          round: roundTypeLabel(resultRow.roundTypeId),
          isStateRecordResult:
            resultRow.isStateRecordSingle ||
            resultRow.stateSingleRecord === "SR",
          resultBest: resultRow.best,
        });
      }
    }

    let runningBest: number | null = null;
    const resultPoints: SessionPoint[] = [];

    for (let i = 0; i < rawSolvesList.length; i++) {
      const item = rawSolvesList[i];
      if (!item) continue;

      let bestVal: number | null = null;
      let isStateRecord = false;

      if (item.value !== null) {
        if (runningBest === null || item.value < runningBest) {
          runningBest = item.value;
          bestVal = item.value;
          isStateRecord =
            item.isStateRecordResult && item.rawSolve === item.resultBest;
        }
      }

      resultPoints.push({
        solveNumber: i + 1,
        value: item.value,
        rawSolve: item.rawSolve,
        personName: item.personName,
        competitionName: item.competitionName,
        round: item.round,
        best: bestVal,
        isStateRecord,
      });
    }

    return resultPoints;
  }, [selectedResults]);

  const stats = useMemo(() => {
    if (!selectedResults || points.length === 0) return null;

    const allSolves = points.map((p) => p.value);
    const validAllSolves = allSolves.filter((v): v is number => v !== null);
    const globalBest =
      validAllSolves.length > 0 ? Math.min(...validAllSolves) : null;
    const globalWorst =
      validAllSolves.length > 0 ? Math.max(...validAllSolves) : null;
    const globalMean =
      validAllSolves.length > 0
        ? validAllSolves.reduce((acc, v) => acc + v, 0) / validAllSolves.length
        : null;
    const globalTotalTime =
      validAllSolves.length > 0
        ? validAllSolves.reduce((acc, v) => acc + v, 0)
        : null;

    return {
      deviation: calculateDeviation(validAllSolves),
      best: globalBest,
      worst: globalWorst,
      mean: globalMean,
      totalTime: globalTotalTime,
      count: allSolves.length,
      validCount: validAllSolves.length,
      stateRecordCount: points.filter((p) => p.best !== null).length,
    };
  }, [selectedResults, points]);

  const validValues = points
    .map((point) => point.value)
    .filter((value): value is number => value !== null);

  const bestValue = validValues.length > 0 ? Math.min(...validValues) : null;

  const unit =
    selectedResults?.eventId === "333fm"
      ? "movs"
      : selectedResults?.eventId === "333mbf"
        ? "s"
        : "s";

  const chartConfig = {
    value: {
      label: "Resoluciones",
      color: "#ffffff",
    },
    best: {
      label: "SR / Mejor",
      color: "#facc15",
    },
  } satisfies ChartConfig;

  if (eventOptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gráfica de resoluciones</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Este team todavía no tiene resoluciones registradas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-6">
        <div className="flex flex-wrap justify-center gap-2 text-muted-foreground">
          {eventOptions.map((group) => (
            <button
              key={group.eventId}
              type="button"
              onClick={() => onEventSelect(group.eventId)}
              className={cn(
                `cubing-icon event-${group.eventId} text-3xl hover:text-primary/50 transition-colors`,
                selectedEventId === group.eventId && "text-primary",
              )}
            />
          ))}
        </div>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {selectedResults ? (
            <>
              <span
                className={`cubing-icon event-${selectedResults.eventId} text-xl`}
              />
              {selectedResults.eventName}
              <span className="text-sm font-normal text-muted-foreground">
                ({validValues.length.toLocaleString("es-MX")} resoluciones)
              </span>
            </>
          ) : (
            "Gráfica de resoluciones"
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[420px] w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !selectedResults ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay resoluciones registradas para este evento.
          </p>
        ) : validValues.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay resoluciones exitosas registradas para este evento.
          </p>
        ) : (
          <>
            <ChartContainer config={chartConfig} className="h-[420px] w-full">
              <LineChart
                data={points}
                margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="solveNumber"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                  label={{
                    value: "Resolución",
                    position: "insideBottom",
                    offset: -4,
                  }}
                />
                <YAxis
                  width={56}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value: number) => {
                    if (selectedResults.eventId === "333fm") {
                      return `${value}`;
                    }
                    if (selectedResults.eventId === "333mbf") {
                      return formatSecondsToMMSS(value);
                    }
                    return (
                      formatAttemptValue(
                        selectedResults.eventId,
                        Math.round(value * 100),
                      ) ?? `${value}`
                    );
                  }}
                />
                {bestValue !== null && (
                  <ReferenceLine
                    y={bestValue}
                    stroke="#facc15"
                    strokeDasharray="4 4"
                    strokeOpacity={0.4}
                    label={{
                      value: "SR",
                      position: "insideTopLeft",
                      fill: "#facc15",
                      fontSize: 12,
                    }}
                  />
                )}
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) {
                      return null;
                    }

                    const point = payload[0]?.payload as SessionPoint;
                    if (!point) return null;

                    const fmtVal = (v: number | null) =>
                      formatDisplayValue(selectedResults.eventId, v);

                    const showUnit =
                      selectedResults.eventId !== "333fm" &&
                      selectedResults.eventId !== "333mbf";

                    const rows: {
                      label: string;
                      color: string;
                      value: string;
                    }[] = [];

                    if (point.value !== null) {
                      rows.push({
                        label: "Resolución",
                        color: "#ffffff",
                        value:
                          fmtVal(point.value) + (showUnit ? ` ${unit}` : ""),
                      });
                    }
                    if (point.best !== null) {
                      rows.push({
                        label: point.isStateRecord
                          ? "¡Nuevo SR!"
                          : "¡Nuevo mejor del team!",
                        color: "#facc15",
                        value:
                          fmtVal(point.best) + (showUnit ? ` ${unit}` : ""),
                      });
                    }

                    return (
                      <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-md">
                        <p className="mb-1.5 font-semibold text-foreground">
                          #{point.solveNumber} · {point.personName}
                        </p>
                        <p className="mb-1.5 text-muted-foreground">
                          {point.competitionName}
                          {point.round ? ` · ${point.round}` : ""}
                        </p>
                        <div className="flex flex-col gap-1">
                          {rows.map((row) => (
                            <div
                              key={row.label}
                              className="flex items-center justify-between gap-4"
                            >
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full"
                                  style={{ backgroundColor: row.color }}
                                />
                                <span className="text-muted-foreground">
                                  {row.label}
                                </span>
                              </div>
                              <span className="font-mono font-medium text-foreground">
                                {row.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }}
                />
                <Line
                  dataKey="value"
                  name="Resoluciones"
                  type="monotone"
                  stroke="#ffffff"
                  strokeWidth={1.2}
                  dot={false}
                  activeDot={{ r: 4 }}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  dataKey="best"
                  name="SR / Mejor"
                  type="monotone"
                  stroke="#facc15"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  dot={{
                    r: 4,
                    fill: "#facc15",
                    stroke: "#eab308",
                    strokeWidth: 1,
                  }}
                  activeDot={{ r: 6, fill: "#facc15" }}
                  connectNulls
                  isAnimationActive={false}
                />
              </LineChart>
            </ChartContainer>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full border border-muted-foreground/30 bg-foreground" />
                <span>Resoluciones</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#facc15]" />
                <span>SR / Mejor del team</span>
              </div>
            </div>

            {stats ? (
              <div className="mt-8 rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Σ</TableHead>
                      <TableHead className="text-right">Team</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Desviación</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatDisplayValue(
                          selectedResults.eventId,
                          stats.deviation,
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">SR / Mejor</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatDisplayValue(
                          selectedResults.eventId,
                          stats.best,
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Peor</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatDisplayValue(
                          selectedResults.eventId,
                          stats.worst,
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Media</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatDisplayValue(
                          selectedResults.eventId,
                          stats.mean,
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        {selectedResults.eventId === "333fm"
                          ? "Movimientos totales"
                          : "Tiempo total"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatTotalTime(
                          selectedResults.eventId,
                          stats.totalTime,
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        Mejoras de SR
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {stats.stateRecordCount.toLocaleString("es-MX")}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        Total resoluciones
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {stats.validCount.toLocaleString("es-MX")}/
                        {stats.count.toLocaleString("es-MX")}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function TeamResultsChart({
  stateId,
  eventOptions,
}: TeamResultsChartProps) {
  const defaultEventId =
    eventOptions.find((option) => option.eventId === "333")?.eventId ??
    eventOptions[0]?.eventId ??
    "";

  const [event, setEvent] = useQueryState(
    "event",
    parseAsString.withDefault(defaultEventId),
  );

  const selectedEventId =
    eventOptions.find((option) => option.eventId === event)?.eventId ??
    defaultEventId;

  const [isPending, startTransition] = useTransition();
  const [selectedResults, setSelectedResults] =
    useState<TeamResultsByEventGroup | null>(null);
  const [loadedEventId, setLoadedEventId] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedEventId) {
      setSelectedResults(null);
      setLoadedEventId(null);
      return;
    }

    let cancelled = false;

    startTransition(() => {
      void loadTeamCompetitionResults(stateId, selectedEventId).then(
        (results) => {
          if (cancelled) return;
          setSelectedResults(results);
          setLoadedEventId(selectedEventId);
        },
      );
    });

    return () => {
      cancelled = true;
    };
  }, [stateId, selectedEventId]);

  const isLoading =
    isPending || (selectedEventId !== "" && loadedEventId !== selectedEventId);

  return (
    <TeamResultsChartView
      eventOptions={eventOptions}
      selectedEventId={selectedEventId}
      selectedResults={selectedResults}
      isLoading={isLoading}
      onEventSelect={(eventId) => {
        void setEvent(eventId);
      }}
    />
  );
}
