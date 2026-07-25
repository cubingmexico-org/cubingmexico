"use client";

import Link from "next/link";
import { useMemo } from "react";
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
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import { formatAttemptValue, roundRank, roundTypeLabel } from "@/lib/utils";
import { cn } from "@workspace/ui/lib/utils";
import type {
  PersonResultsByEventGroup,
  PersonResultsEventOption,
} from "../_lib/queries";

type PersonResultsChartTabProps = {
  eventOptions: PersonResultsEventOption[];
  selectedEventId: string;
  selectedResults: PersonResultsByEventGroup | null;
};

type SessionPoint = {
  solveNumber: number;
  value: number | null;
  rawSolve: number;
  competitionName: string;
  round: string;
};

// Formats a duration in seconds to m:ss format for Y-axis labels.
function formatSecondsToMMSS(seconds: number): string {
  if (seconds < 0 || Number.isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

// Converts a raw attempt value into a numeric value suitable for the Y axis.
// Non-positive values (DNF / DNS / skipped) become null so the line shows a gap.
function attemptToChartValue(eventId: string, value: number): number | null {
  if (value <= 0) {
    return null;
  }

  if (eventId === "333fm") {
    return value; // move count
  }

  if (eventId === "333mbf") {
    // Decode the seconds portion (TTTTT) of the multi-blind value.
    const valueStr = value.toString();
    const seconds = parseInt(valueStr.slice(2, 7), 10);
    return Number.isNaN(seconds) || seconds === 99999 ? null : seconds;
  }

  return value / 100; // centiseconds -> seconds
}

export function PersonResultsChartTab({
  eventOptions,
  selectedEventId,
  selectedResults,
}: PersonResultsChartTabProps) {
  const points = useMemo<SessionPoint[]>(() => {
    if (!selectedResults) {
      return [];
    }

    // Rebuild a single chronological "session": oldest competition first, and
    // within a competition earlier rounds (qualification, first, second) before
    // the final. roundRank returns a lower value for later rounds, so we sort it
    // descending to place earlier rounds first.
    const chronological = selectedResults.results
      .slice()
      .sort((left, right) => {
        const dateDelta =
          Date.parse(left.competitionStartDate) -
          Date.parse(right.competitionStartDate);

        if (dateDelta !== 0) {
          return dateDelta;
        }

        return roundRank(right.roundTypeId) - roundRank(left.roundTypeId);
      });

    const flattened: SessionPoint[] = [];

    for (const resultRow of chronological) {
      for (const solve of resultRow.solves) {
        flattened.push({
          solveNumber: flattened.length + 1,
          value: attemptToChartValue(resultRow.eventId, solve),
          rawSolve: solve,
          competitionName: resultRow.competitionName,
          round: roundTypeLabel(resultRow.roundTypeId),
        });
      }
    }

    return flattened;
  }, [selectedResults]);

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
      label: "Resolución",
      color: "var(--chart-1)",
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
        <div className="flex flex-wrap justify-center gap-2 text-muted-foreground">
          {eventOptions.map((group) => (
            <Link
              key={group.eventId}
              href={`?tab=results-chart&event=${group.eventId}`}
              className={cn(
                `cubing-icon event-${group.eventId} text-3xl hover:text-primary/50 transition-colors`,
                selectedEventId === group.eventId && "text-primary",
              )}
            />
          ))}
        </div>
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
            No hay resoluciones exitosas registradas para este evento (solo
            DNF/DNS).
          </p>
        ) : (
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
                  stroke="var(--color-value)"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                  label={{
                    value: "Mejor",
                    position: "insideTopLeft",
                    fill: "var(--color-value)",
                    fontSize: 12,
                  }}
                />
              )}
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    hideLabel
                    formatter={(value, _name, item) => {
                      const point = item.payload as SessionPoint;
                      const numericValue = value as number;
                      const formatted =
                        selectedResults.eventId === "333fm"
                          ? `${numericValue} movimientos`
                          : (formatAttemptValue(
                              selectedResults.eventId,
                              selectedResults.eventId === "333mbf"
                                ? point.rawSolve
                                : Math.round(numericValue * 100),
                            ) ?? "—");

                      return (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-foreground">
                            {formatted}
                            {selectedResults.eventId !== "333fm" &&
                              selectedResults.eventId !== "333mbf" &&
                              ` ${unit}`}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {point.competitionName}
                            {point.round ? ` · ${point.round}` : ""}
                          </span>
                        </div>
                      );
                    }}
                  />
                }
              />
              <Line
                dataKey="value"
                type="monotone"
                stroke="var(--color-value)"
                strokeWidth={2}
                dot={{ r: 2 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
