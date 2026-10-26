"use client";

import { useMemo } from "react";
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
import {
  chartUnit,
  formatDisplayValue,
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
import type {
  PersonResultsByEventGroup,
  PersonResultsEventOption,
} from "../_lib/queries";
import {
  buildSessionPoints,
  summarizeSessionPoints,
  type SessionPoint,
} from "../_lib/results-chart-points";
import { ResultsChartStatsTable } from "./results-chart-stats-table";

type PersonResultsChartTabProps = {
  eventOptions: PersonResultsEventOption[];
  selectedEventId: string;
  selectedResults: PersonResultsByEventGroup | null;
  onEventSelect?: (eventId: string) => void;
};

export function PersonResultsChartTab({
  eventOptions,
  selectedEventId,
  selectedResults,
  onEventSelect,
}: PersonResultsChartTabProps) {
  const points = useMemo(
    () => buildSessionPoints(selectedResults),
    [selectedResults],
  );

  const stats = useMemo(
    () =>
      selectedResults
        ? summarizeSessionPoints(selectedResults.eventId, points)
        : null,
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
      label: "Mejor",
      color: "#facc15",
    },
    ao50: {
      label: "Ao50",
      color: "#ef4444",
    },
    ao100: {
      label: "Ao100",
      color: "#22c55e",
    },
  } satisfies ChartConfig;

  if (eventOptions.length === 0 || !selectedResults) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gráfica de resoluciones</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Esta persona todavía no tiene resoluciones registradas.
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
        <CardTitle className="flex items-center gap-2">
          <span
            className={`cubing-icon event-${selectedResults.eventId} text-xl`}
          />
          {selectedResults.eventName}
          <span className="text-sm font-normal text-muted-foreground">
            ({validValues.length} resoluciones)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {validValues.length === 0 ? (
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
                      value: "Mejor",
                      position: "insideTopLeft",
                      fill: "#facc15",
                      fontSize: 12,
                    }}
                  />
                )}
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0)
                      return null;

                    // All entries share the same solve position
                    const point = payload[0]?.payload as SessionPoint;
                    if (!point) return null;

                    const fmtVal = (v: number | null) =>
                      formatDisplayValue(selectedResults.eventId, v);

                    const showUnit =
                      selectedResults.eventId !== "333fm" &&
                      selectedResults.eventId !== "333mbf";
                    const ptsSuffix =
                      selectedResults.eventId === "333mbf" ? ` ${unit}` : "";

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
                    if (point.ao50 !== null) {
                      rows.push({
                        label:
                          point.bestAo50 !== null
                            ? "¡Nuevo récord Ao50!"
                            : "Ao50",
                        color: "#ef4444",
                        value:
                          fmtVal(point.ao50) +
                          (showUnit ? ` ${unit}` : ptsSuffix),
                      });
                    }
                    if (point.ao100 !== null) {
                      rows.push({
                        label:
                          point.bestAo100 !== null
                            ? "¡Nuevo récord Ao100!"
                            : "Ao100",
                        color: "#22c55e",
                        value:
                          fmtVal(point.ao100) +
                          (showUnit ? ` ${unit}` : ptsSuffix),
                      });
                    }
                    if (point.best !== null) {
                      rows.push({
                        label: "¡Nuevo récord!",
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
                            #{point.solveNumber} · {point.competitionName}
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
                  name="Mejor"
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
                <Line
                  dataKey="ao50"
                  name="Ao50"
                  type="monotone"
                  stroke="#ef4444"
                  strokeWidth={3}
                  dot={(props: {
                    cx?: number;
                    cy?: number;
                    payload?: SessionPoint;
                    index?: number;
                  }) => {
                    const { cx, cy, payload } = props;
                    if (
                      !payload?.bestAo50 ||
                      cx === undefined ||
                      cy === undefined
                    )
                      return <g key={props.index} />;
                    return (
                      <circle
                        key={props.index}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill="#fff"
                        stroke="#ef4444"
                        strokeWidth={3}
                      />
                    );
                  }}
                  activeDot={{ r: 4, fill: "#ef4444" }}
                  connectNulls
                  isAnimationActive={false}
                />
                <Line
                  dataKey="ao100"
                  name="Ao100"
                  type="monotone"
                  stroke="#22c55e"
                  strokeWidth={3}
                  dot={(props: {
                    cx?: number;
                    cy?: number;
                    payload?: SessionPoint;
                    index?: number;
                  }) => {
                    const { cx, cy, payload } = props;
                    if (
                      !payload?.bestAo100 ||
                      cx === undefined ||
                      cy === undefined
                    )
                      return <g key={props.index} />;
                    return (
                      <circle
                        key={props.index}
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill="#fff"
                        stroke="#22c55e"
                        strokeWidth={3}
                      />
                    );
                  }}
                  activeDot={{ r: 4, fill: "#22c55e" }}
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
                { label: "Mejor", colorClass: "bg-[#facc15]" },
                { label: "Ao50", colorClass: "bg-[#ef4444]" },
                { label: "Ao100", colorClass: "bg-[#22c55e]" },
              ]}
            />

            {stats && (
              <ResultsChartStatsTable
                eventId={selectedResults.eventId}
                stats={stats}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
