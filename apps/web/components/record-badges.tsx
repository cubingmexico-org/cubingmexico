import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";

export function recordBadgeClass(type: string | null | undefined): string {
  if (type === "WR") {
    return "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-400";
  }
  if (type === "NAR") {
    return "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-400";
  }
  if (type === "NR") {
    return "bg-green-500/15 text-green-700 border-green-500/30 dark:text-green-400";
  }
  if (type === "SR") {
    return "bg-violet-500/15 text-violet-700 border-violet-500/30 dark:text-violet-400";
  }
  if (type === "PR") {
    return "bg-muted text-muted-foreground border-border";
  }
  return "";
}

function BadgeChip({ tag }: { tag: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("text-xs px-1 py-0 h-5", recordBadgeClass(tag))}
    >
      {tag}
    </Badge>
  );
}

/** WCA regional / PR tag plus Cubing México state record tag. */
export function RecordBadges({
  regional,
  state,
  className,
}: {
  regional?: string | null;
  state?: string | null;
  className?: string;
}) {
  if (!regional && !state) return null;

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {regional ? <BadgeChip tag={regional} /> : null}
      {state ? <BadgeChip tag={state} /> : null}
    </span>
  );
}
