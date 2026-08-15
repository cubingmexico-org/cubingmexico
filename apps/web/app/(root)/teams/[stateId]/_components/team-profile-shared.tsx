import Link from "next/link";
import { cn } from "@workspace/ui/lib/utils";
import { formatAttemptValue } from "@/lib/utils";
import { eventNames } from "@/lib/constants";
import type { TeamMedals, TeamNationalRecord } from "../_lib/queries";

export function TeamPersonLink({
  wcaId,
  name,
}: {
  wcaId: string;
  name: string | null;
}) {
  return (
    <Link href={`/persons/${wcaId}`} className="text-link hover:text-link/80">
      {name ?? wcaId}
    </Link>
  );
}

export function MedalStrip({ medals }: { medals: TeamMedals }) {
  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      <MedalStat label="Oros" value={medals.gold} tone="gold" />
      <MedalStat label="Platas" value={medals.silver} tone="silver" />
      <MedalStat label="Bronces" value={medals.bronze} tone="bronze" />
    </div>
  );
}

function MedalStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "gold" | "silver" | "bronze";
}) {
  return (
    <div className="rounded-lg border px-3 py-4 text-center">
      <div
        className={cn(
          "text-2xl font-bold tabular-nums sm:text-3xl",
          tone === "gold" && "text-amber-500 dark:text-amber-400",
          tone === "silver" && "text-slate-500 dark:text-slate-300",
          tone === "bronze" && "text-yellow-700 dark:text-yellow-600",
        )}
      >
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground sm:text-sm">
        {label}
      </div>
    </div>
  );
}

export function KeyStat({
  label,
  value,
  href,
  className,
}: {
  label: string;
  value: number | string;
  href?: string;
  className?: string;
}) {
  const content = (
    <div className="rounded-lg border px-3 py-4 text-center">
      <div className="text-2xl font-bold tabular-nums sm:text-3xl">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground sm:text-sm">
        {label}
      </div>
    </div>
  );

  if (!href) {
    return className ? <div className={className}>{content}</div> : content;
  }

  return (
    <Link
      href={href}
      className={cn("transition-opacity hover:opacity-80", className)}
    >
      {content}
    </Link>
  );
}

export function NationalRecordsList({
  records,
  emptyMessage = "Sin récords nacionales actuales",
}: {
  records: TeamNationalRecord[];
  emptyMessage?: string;
}) {
  if (records.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="divide-y rounded-lg border">
      {records.map((record) => (
        <li
          key={`${record.type}-${record.eventId}-${record.personId}`}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 text-sm"
        >
          <span className={`cubing-icon event-${record.eventId} shrink-0`} />
          <span className="min-w-0 grow font-medium">
            {eventNames[record.eventId] ?? record.eventId}
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              {record.type === "single" ? "Single" : "Average"}
            </span>
          </span>
          <span className="tabular-nums text-muted-foreground">
            {formatAttemptValue(record.eventId, record.value, record.type) ??
              "—"}
          </span>
          <TeamPersonLink wcaId={record.personId} name={record.personName} />
        </li>
      ))}
    </ul>
  );
}
