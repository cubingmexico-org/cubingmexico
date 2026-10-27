import { cn } from "@workspace/ui/lib/utils";

type SolveChartLegendProps = {
  items: { label: string; colorClass: string }[];
};

export function SolveChartLegend({ items }: SolveChartLegendProps) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-muted-foreground">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span
            className={cn(
              "inline-block h-2.5 w-2.5 rounded-full",
              item.colorClass,
            )}
          />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
