import type { ReactNode } from "react";

export type SolveChartTooltipRow = {
  label: string;
  color: string;
  value: string;
};

type SolveChartTooltipCardProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  rows: SolveChartTooltipRow[];
};

export function SolveChartTooltipCard({
  title,
  subtitle,
  rows,
}: SolveChartTooltipCardProps) {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-semibold text-foreground">{title}</p>
      {subtitle ? (
        <p className="mb-1.5 text-muted-foreground">{subtitle}</p>
      ) : null}
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
              <span className="text-muted-foreground">{row.label}</span>
            </div>
            <span className="font-mono font-medium text-foreground">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
