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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { roundRank, roundTypeLabel } from "@/lib/utils";
import {
  attemptToChartValue,
  calculateAoN,
  calculateDeviation,
  chartUnit,
  formatDisplayValue,
  formatSolveTooltipValue,
  formatTotalTime,
  isHigherBetter,
  totalLabel,
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

type PersonResultsChartTabProps = {
  eventOptions: PersonResultsEventOption[];
  selectedEventId: string;
  selectedResults: PersonResultsByEventGroup | null;
  onEventSelect?: (eventId: string) => void;
};

type SessionPoint = {
  solveNumber: number;
  value: number | null;
  rawSolve: number;
  competitionName: string;
  round: string;
  best: number | null;
  ao12: number | null;
  ao50: number | null;
  ao100: number | null;
  bestAo50: number | null;
  bestAo100: number | null;
};

export function PersonResultsChartTab({
  eventOptions,
  selectedEventId,
  selectedResults,
  onEventSelect,
}: PersonResultsChartTabProps) {
  const points = useMemo<SessionPoint[]>(() => {
    if (!selectedResults) {
      return [];
    }

    // Rebuild a single chronological "session": oldest competition first
    const chronological = selectedResults.results
      .slice()
      .sort((left, right) => {
        const dateDelta = left.competitionStartDate.localeCompare(
          right.competitionStartDate,
        );

        if (dateDelta !== 0) {
          return dateDelta;
        }

        return roundRank(right.roundTypeId) - roundRank(left.roundTypeId);
      });

    const rawSolvesList: {
      value: number | null;
      rawSolve: number;
      competitionName: string;
      round: string;
    }[] = [];

    for (const resultRow of chronological) {
      for (const solve of resultRow.solves) {
        // Skip DNS (-2) entirely — only DNF (-1) is kept as null for AoN purposes
        if (solve === -2) continue;

        rawSolvesList.push({
          value: attemptToChartValue(resultRow.eventId, solve),
          rawSolve: solve,
          competitionName: resultRow.competitionName,
          round: roundTypeLabel(resultRow.roundTypeId),
        });
      }
    }

    const eventId = selectedResults.eventId;
    const higherBetter = isHigherBetter(eventId);
    const allValues = rawSolvesList.map((s) => s.value);
    // WCA ordering: lower encoded multi value is better; for other events use chart value.
    let runningBestRaw: number | null = null;
    const resultPoints: SessionPoint[] = [];

    for (let i = 0; i < rawSolvesList.length; i++) {
      const item = rawSolvesList[i];
      if (!item) continue;

      let bestVal: number | null = null;

      if (item.value !== null && item.rawSolve > 0) {
        const isNewPb =
          runningBestRaw === null ||
          (eventId === "333mbf"
            ? item.rawSolve < runningBestRaw
            : higherBetter
              ? item.value > runningBestRaw
              : item.value < runningBestRaw);

        if (isNewPb) {
          runningBestRaw = eventId === "333mbf" ? item.rawSolve : item.value;
          bestVal = item.value;
        }
      }

      const window12 = allValues.slice(Math.max(0, i - 11), i + 1);
      const ao12Val = calculateAoN(window12, 12);

      const window50 = allValues.slice(Math.max(0, i - 49), i + 1);
      const ao50Val = calculateAoN(window50, 50);

      const window100 = allValues.slice(Math.max(0, i - 99), i + 1);
      const ao100Val = calculateAoN(window100, 100);

      resultPoints.push({
        solveNumber: i + 1,
        value: item.value,
        rawSolve: item.rawSolve,
        competitionName: item.competitionName,
        round: item.round,
        best: bestVal,
        ao12: ao12Val,
        ao50: ao50Val,
        ao100: ao100Val,
        bestAo50: null,
        bestAo100: null,
      });
    }

    let bestAo50: number | null = null;
    let bestAo50Idx = -1;
    let bestAo100: number | null = null;
    let bestAo100Idx = -1;

    for (let i = 0; i < resultPoints.length; i++) {
      const pt = resultPoints[i];
      if (!pt) continue;
      if (
        pt.ao50 !== null &&
        (bestAo50 === null ||
          (higherBetter ? pt.ao50 > bestAo50 : pt.ao50 < bestAo50))
      ) {
        bestAo50 = pt.ao50;
        bestAo50Idx = i;
      }
      if (
        pt.ao100 !== null &&
        (bestAo100 === null ||
          (higherBetter ? pt.ao100 > bestAo100 : pt.ao100 < bestAo100))
      ) {
        bestAo100 = pt.ao100;
        bestAo100Idx = i;
      }
    }

    if (bestAo50Idx !== -1) {
      const targetAo50 = resultPoints[bestAo50Idx];
      if (targetAo50) {
        targetAo50.bestAo50 = bestAo50;
      }
    }
    if (bestAo100Idx !== -1) {
      const targetAo100 = resultPoints[bestAo100Idx];
      if (targetAo100) {
        targetAo100.bestAo100 = bestAo100;
      }
    }

    return resultPoints;
  }, [selectedResults]);

  const stats = useMemo(() => {
    if (!selectedResults || points.length === 0) return null;

    const higherBetter = isHigherBetter(selectedResults.eventId);
    const allSolves = points.map((p) => p.value);
    const validAllSolves = allSolves.filter((v): v is number => v !== null);

    const globalDev = calculateDeviation(validAllSolves);

    const pickBestAo = (values: number[]) =>
      values.length > 0
        ? higherBetter
          ? Math.max(...values)
          : Math.min(...values)
        : null;

    // Global best averages achieved across entire timeline
    const validAo12s = points
      .map((p) => p.ao12)
      .filter((v): v is number => v !== null);
    const globalAo12 = pickBestAo(validAo12s) ?? calculateAoN(allSolves, 12);

    const validAo50s = points
      .map((p) => p.ao50)
      .filter((v): v is number => v !== null);
    const globalAo50 = pickBestAo(validAo50s) ?? calculateAoN(allSolves, 50);

    const validAo100s = points
      .map((p) => p.ao100)
      .filter((v): v is number => v !== null);
    const globalAo100 = pickBestAo(validAo100s) ?? calculateAoN(allSolves, 100);

    const globalBest =
      validAllSolves.length > 0
        ? higherBetter
          ? Math.max(...validAllSolves)
          : Math.min(...validAllSolves)
        : null;
    const globalWorst =
      validAllSolves.length > 0
        ? higherBetter
          ? Math.min(...validAllSolves)
          : Math.max(...validAllSolves)
        : null;
    const globalMean =
      validAllSolves.length > 0
        ? validAllSolves.reduce((acc, v) => acc + v, 0) / validAllSolves.length
        : null;
    const globalTotalTime =
      validAllSolves.length > 0
        ? validAllSolves.reduce((acc, v) => acc + v, 0)
        : null;

    // Last results (current moving averages at the end of the solve history)
    const lastAo12 = calculateAoN(allSolves, 12);
    const lastAo50 = calculateAoN(allSolves, 50);
    const lastAo100 = calculateAoN(allSolves, 100);

    return {
      global: {
        deviation: globalDev,
        ao12: globalAo12,
        ao50: globalAo50,
        ao100: globalAo100,
        best: globalBest,
        worst: globalWorst,
        mean: globalMean,
        totalTime: globalTotalTime,
        count: allSolves.length,
        validCount: validAllSolves.length,
      },
      last: {
        ao12: lastAo12,
        ao50: lastAo50,
        ao100: lastAo100,
      },
    };
  }, [selectedResults, points]);

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

            {/* Statistics Summary Table */}
            {stats && (
              <div className="mt-8 rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-45">Σ</TableHead>
                      <TableHead className="text-right">Global</TableHead>
                      <TableHead className="text-right">Último</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Desviación</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatDisplayValue(
                          selectedResults.eventId,
                          stats.global.deviation,
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">—</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Ao12</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatDisplayValue(
                          selectedResults.eventId,
                          stats.global.ao12,
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatDisplayValue(
                          selectedResults.eventId,
                          stats.last.ao12,
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Ao50</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatDisplayValue(
                          selectedResults.eventId,
                          stats.global.ao50,
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatDisplayValue(
                          selectedResults.eventId,
                          stats.last.ao50,
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Ao100</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatDisplayValue(
                          selectedResults.eventId,
                          stats.global.ao100,
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatDisplayValue(
                          selectedResults.eventId,
                          stats.last.ao100,
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Mejor</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatDisplayValue(
                          selectedResults.eventId,
                          stats.global.best,
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">—</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Peor</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatDisplayValue(
                          selectedResults.eventId,
                          stats.global.worst,
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">—</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Media</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatDisplayValue(
                          selectedResults.eventId,
                          stats.global.mean,
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">—</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        {totalLabel(selectedResults.eventId)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatTotalTime(
                          selectedResults.eventId,
                          stats.global.totalTime,
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">—</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">
                        Total resoluciones
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {stats.global.validCount.toLocaleString("es-MX")}/
                        {stats.global.count.toLocaleString("es-MX")}
                      </TableCell>
                      <TableCell className="text-right font-mono">—</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
