"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@workspace/ui/components/chart";
import type { TeamEventInsight } from "../_lib/queries";
import { eventLabel } from "../_lib/format";

const ROW_HEIGHT = 34;

const chartConfig = {
  interest: {
    label: "Miembros que lo compiten cuando se ofrece",
    color: "var(--chart-1)",
  },
  supply: {
    label: "Competencias del estado que lo incluyen",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function TeamEventsDemandChart({
  events,
}: {
  events: TeamEventInsight[];
}) {
  const data = events
    .filter(
      (e) =>
        e.isOfficial && ((e.interest ?? 0) > 0 || (e.supplyShare ?? 0) > 0),
    )
    .map((e) => ({
      eventId: e.eventId,
      label: eventLabel(e.eventId, e.eventName),
      interest: Number(((e.interest ?? 0) * 100).toFixed(1)),
      supply: Number(((e.supplyShare ?? 0) * 100).toFixed(1)),
    }));

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sin participación en este periodo
      </p>
    );
  }

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto w-full"
      style={{ height: data.length * ROW_HEIGHT + 60 }}
    >
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(value: number) => `${value}%`}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={130}
          tickLine={false}
          axisLine={false}
          interval={0}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value, name) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="text-muted-foreground">
                    {chartConfig[name as keyof typeof chartConfig]?.label ??
                      name}
                  </span>
                  <span className="font-mono font-medium tabular-nums">
                    {value}%
                  </span>
                </div>
              )}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="interest" fill="var(--color-interest)" radius={3} />
        <Bar dataKey="supply" fill="var(--color-supply)" radius={3} />
      </BarChart>
    </ChartContainer>
  );
}
