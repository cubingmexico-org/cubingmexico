import type { ReactNode } from "react";
import { TableCell } from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";

export type StatTone = "default" | "gold" | "silver" | "bronze";

export function Stat({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: StatTone;
}) {
  return (
    <span
      className={cn(
        "inline-block font-bold text-[1.15em] leading-none mx-0.5",
        tone === "default" && "text-emerald-600 dark:text-emerald-400",
        tone === "gold" && "text-amber-500 dark:text-amber-400",
        tone === "silver" && "text-slate-500 dark:text-slate-300",
        tone === "bronze" && "text-yellow-700 dark:text-yellow-600",
      )}
    >
      {children}
    </span>
  );
}

export function AccentCell({ children }: { children: ReactNode }) {
  return (
    <TableCell className="text-center font-semibold text-emerald-600 dark:text-emerald-400">
      {children}
    </TableCell>
  );
}
