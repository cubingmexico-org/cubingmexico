"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import type { TeamEventInsight } from "../_lib/queries";
import { eventLabel, formatShare } from "../_lib/format";
import {
  RECOMMENDATION_LABELS,
  type EventRecommendation,
} from "../_lib/recommendation";

type SortKey =
  | "event"
  | "members"
  | "roundsCompeted"
  | "podiums"
  | "roundsHosted"
  | "gap"
  | "top100"
  | "bestNationalRank";

type Sort = { key: SortKey; desc: boolean };

const SORT_VALUE: Record<SortKey, (e: TeamEventInsight) => number> = {
  event: (e) => e.eventRank,
  members: (e) => e.members,
  roundsCompeted: (e) => e.roundsCompeted,
  podiums: (e) => e.podiums,
  roundsHosted: (e) => e.roundsHosted,
  gap: (e) => e.gap ?? Number.NEGATIVE_INFINITY,
  top100: (e) => e.top100Single + e.top100Average,
  bestNationalRank: (e) => e.bestNationalRank ?? Number.POSITIVE_INFINITY,
};

const RECOMMENDATION_CLASSES: Record<EventRecommendation, string> = {
  more_rounds:
    "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400",
  balanced:
    "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

function SortableHead({
  label,
  sortKey,
  sort,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  sort: Sort;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = sort.key === sortKey;
  const Icon = active ? (sort.desc ? ArrowDown : ArrowUp) : ArrowUpDown;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 whitespace-nowrap hover:text-foreground",
          active && "text-foreground",
        )}
      >
        {label}
        <Icon className="size-3" />
      </button>
    </TableHead>
  );
}

export function TeamEventsTable({ events }: { events: TeamEventInsight[] }) {
  const [sort, setSort] = useState<Sort>({ key: "event", desc: false });

  const sorted = useMemo(() => {
    const value = SORT_VALUE[sort.key];
    return events
      .slice()
      .sort(
        (a, b) =>
          (sort.desc ? value(b) - value(a) : value(a) - value(b)) ||
          a.eventRank - b.eventRank,
      );
  }, [events, sort]);

  const onSort = (key: SortKey) =>
    setSort((current) =>
      current.key === key
        ? { key, desc: !current.desc }
        : { key, desc: key !== "event" && key !== "bestNationalRank" },
    );

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sin resultados en este periodo
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHead
            label="Evento"
            sortKey="event"
            sort={sort}
            onSort={onSort}
          />
          <SortableHead
            label="Miembros"
            sortKey="members"
            sort={sort}
            onSort={onSort}
          />
          <SortableHead
            label="Rondas compitiendo"
            sortKey="roundsCompeted"
            sort={sort}
            onSort={onSort}
          />
          <SortableHead
            label="Podios"
            sortKey="podiums"
            sort={sort}
            onSort={onSort}
          />
          <SortableHead
            label="Rondas en el estado"
            sortKey="roundsHosted"
            sort={sort}
            onSort={onSort}
          />
          <SortableHead
            label="% miembros / % competencias"
            sortKey="gap"
            sort={sort}
            onSort={onSort}
          />
          <SortableHead
            label="Top 100 nacional"
            sortKey="top100"
            sort={sort}
            onSort={onSort}
          />
          <SortableHead
            label="Mejor NR"
            sortKey="bestNationalRank"
            sort={sort}
            onSort={onSort}
          />
          <TableHead>Recomendación</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((e) => (
          <TableRow key={e.eventId}>
            <TableCell className="whitespace-nowrap">
              <span className="inline-flex items-center gap-2">
                <span className={`cubing-icon event-${e.eventId}`} />
                {eventLabel(e.eventId, e.eventName)}
              </span>
            </TableCell>
            <TableCell className="tabular-nums">{e.members}</TableCell>
            <TableCell className="tabular-nums">
              {e.roundsCompeted}
              {e.roundsCompetedOutside > 0 ? (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({e.roundsCompetedOutside} fuera)
                </span>
              ) : null}
            </TableCell>
            <TableCell className="tabular-nums">{e.podiums}</TableCell>
            <TableCell className="tabular-nums">
              {e.roundsHosted}
              {e.competitionsHosted > 0 ? (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({e.competitionsHosted} comps)
                </span>
              ) : null}
            </TableCell>
            <TableCell className="whitespace-nowrap tabular-nums">
              {formatShare(e.demandShare)}
              <span className="mx-1 text-muted-foreground">/</span>
              {formatShare(e.supplyShare)}
            </TableCell>
            <TableCell className="whitespace-nowrap tabular-nums">
              {e.top100Single}
              <span className="ml-1 text-xs text-muted-foreground">S</span>
              <span className="mx-1 text-muted-foreground">·</span>
              {e.top100Average}
              <span className="ml-1 text-xs text-muted-foreground">A</span>
            </TableCell>
            <TableCell className="tabular-nums">
              {e.bestNationalRank ?? "—"}
            </TableCell>
            <TableCell>
              {e.recommendation ? (
                <Badge
                  variant="outline"
                  className={RECOMMENDATION_CLASSES[e.recommendation]}
                >
                  {RECOMMENDATION_LABELS[e.recommendation]}
                </Badge>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
