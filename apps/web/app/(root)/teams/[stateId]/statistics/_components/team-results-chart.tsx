"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { parseAsString, useQueryState } from "nuqs";
import {
  Brush,
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
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  chartUnit,
  formatSolveTooltipValue,
  isHigherBetter,
  yAxisTick,
} from "@/lib/solve-chart";
import { SolveChartEventPicker } from "@/components/solve-chart/solve-chart-event-picker";
import { SolveChartLegend } from "@/components/solve-chart/solve-chart-legend";
import {
  SolveChartTooltipCard,
  type SolveChartTooltipRow,
} from "@/components/solve-chart/solve-chart-tooltip-card";
import { loadTeamCompetitionResults } from "../_lib/actions";
import { selectedTeamResultsEventId } from "../_lib/selected-event";
import {
  buildTeamSolvePoints,
  teamSolveStats,
  type SessionPoint,
} from "../_lib/solve-points";
import { TeamResultsStatsTable } from "./team-results-stats-table";
import type {
  TeamResultsByEventGroup,
  TeamResultsEventOption,
} from "../_lib/queries";

type TeamResultsChartProps = {
  stateId: string;
  eventOptions: TeamResultsEventOption[];
  /** Results for the event selected when the page rendered. */
  initialResults: {
    eventId: string;
    results: TeamResultsByEventGroup | null;
  } | null;
};

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
  const points = useMemo(
    () => (selectedResults ? buildTeamSolvePoints(selectedResults) : []),
    [selectedResults],
  );

  const stats = useMemo(
    () =>
      selectedResults ? teamSolveStats(selectedResults.eventId, points) : null,
    [selectedResults, points],
  );

  const validValues = points
    .map((point) => point.value)
    .filter((value): value is number => value !== null);

  const higherBetter = selectedResults
    ? isHigherBetter(selectedResults.eventId)
    : false;
  const bestValue =
    validValues.length > 0
      ? higherBetter
        ? Math.max(...validValues)
        : Math.min(...validValues)
      : null;

  const unit = chartUnit(selectedResults?.eventId ?? "");

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
        <SolveChartEventPicker
          eventOptions={eventOptions}
          selectedEventId={selectedEventId}
          onEventSelect={onEventSelect}
        />
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
            <Skeleton className="h-105 w-full" />
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
            <ChartContainer config={chartConfig} className="h-115 w-full">
              <LineChart
                data={points}
                margin={{
                  top: 8,
                  right: 16,
                  bottom: points.length > 20 ? 24 : 8,
                  left: 8,
                }}
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
                  tickFormatter={(value: number) =>
                    yAxisTick(selectedResults.eventId, value)
                  }
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

                    const showUnit =
                      selectedResults.eventId !== "333fm" &&
                      selectedResults.eventId !== "333mbf";

                    const rows: SolveChartTooltipRow[] = [];

                    if (point.value !== null) {
                      rows.push({
                        label: "Resolución",
                        color: "#ffffff",
                        value:
                          formatSolveTooltipValue(
                            selectedResults.eventId,
                            point.rawSolve,
                          ) + (showUnit ? ` ${unit}` : ""),
                      });
                    }
                    if (point.best !== null) {
                      rows.push({
                        label: point.isStateRecord
                          ? "¡Nuevo SR!"
                          : "¡Nuevo mejor del team!",
                        color: "#facc15",
                        value:
                          formatSolveTooltipValue(
                            selectedResults.eventId,
                            point.rawSolve,
                          ) + (showUnit ? ` ${unit}` : ""),
                      });
                    }

                    return (
                      <SolveChartTooltipCard
                        title={
                          <>
                            #{point.solveNumber} · {point.personName}
                          </>
                        }
                        subtitle={
                          <>
                            {point.competitionName}
                            {point.round ? ` · ${point.round}` : ""}
                          </>
                        }
                        rows={rows}
                      />
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
                {points.length > 20 && (
                  <Brush
                    key={selectedEventId}
                    dataKey="solveNumber"
                    height={28}
                    stroke="#a1a1aa"
                    travellerWidth={10}
                    tickFormatter={(value: number) => String(value)}
                  />
                )}
              </LineChart>
            </ChartContainer>

            <SolveChartLegend
              items={[
                {
                  label: "Resoluciones",
                  colorClass: "border border-muted-foreground/30 bg-foreground",
                },
                { label: "SR / Mejor del team", colorClass: "bg-[#facc15]" },
              ]}
            />

            {stats ? (
              <TeamResultsStatsTable
                eventId={selectedResults.eventId}
                stats={stats}
              />
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
  initialResults,
}: TeamResultsChartProps) {
  const [event, setEvent] = useQueryState(
    "event",
    parseAsString.withDefault(selectedTeamResultsEventId(eventOptions, null)),
  );

  const selectedEventId = selectedTeamResultsEventId(eventOptions, event);

  const [isPending, startTransition] = useTransition();
  const [selectedResults, setSelectedResults] = useState(
    initialResults?.results ?? null,
  );
  const [loadedEventId, setLoadedEventId] = useState<string | null>(
    initialResults?.eventId ?? null,
  );

  useEffect(() => {
    if (!selectedEventId) {
      setSelectedResults(null);
      setLoadedEventId(null);
      return;
    }
    if (loadedEventId === selectedEventId) return;

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
  }, [stateId, selectedEventId, loadedEventId]);

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
