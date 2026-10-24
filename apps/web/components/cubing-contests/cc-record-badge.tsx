import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import type { CcRecordMarker } from "@/lib/cubing-contests-records";

/** UNR uses the NR colors and USR the SR colors of the official record badges. */
export function CcRecordBadge({
  marker,
  className,
}: {
  marker: CcRecordMarker | null;
  className?: string;
}) {
  if (!marker) return null;
  return (
    <Badge
      variant="outline"
      title={
        marker === "UNR"
          ? "Récord nacional no oficial"
          : "Récord estatal no oficial"
      }
      className={cn(
        "text-xs px-1 py-0 h-5",
        marker === "UNR"
          ? "bg-green-500/15 text-green-700 border-green-500/30"
          : "bg-violet-500/15 text-violet-700 border-violet-500/30",
        className,
      )}
    >
      {marker}
    </Badge>
  );
}
