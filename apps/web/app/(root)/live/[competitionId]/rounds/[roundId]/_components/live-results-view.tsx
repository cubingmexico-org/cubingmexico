"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, Radio } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { buttonVariants } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import {
  formatLiveResultValue,
  formatRecordTag,
  liveRoundLabel,
  liveRoundStateLabel,
} from "@/lib/live/format";
import type {
  EnrichedLiveCompetitor,
  EnrichedLiveRoundDetails,
  LiveResult,
} from "@/lib/live/types";
import { useVisiblePoll } from "../../../../_components/use-visible-poll";

type LiveRoundPayload = EnrichedLiveRoundDetails & {
  officialLiveUrl: string;
};

export function LiveResultsView({
  competitionId,
  roundId,
  initial,
}: {
  competitionId: string;
  roundId: string;
  initial: LiveRoundPayload;
}) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const poll = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/live/${encodeURIComponent(competitionId)}/rounds/${encodeURIComponent(roundId)}`,
      );
      if (!response.ok) {
        setError("No se pudieron actualizar los resultados.");
        return;
      }
      const json = (await response.json()) as {
        success: boolean;
        data?: LiveRoundPayload;
      };
      if (json.success && json.data) {
        setData(json.data);
        setError(null);
      }
    } catch {
      setError("No se pudieron actualizar los resultados.");
    }
  }, [competitionId, roundId]);

  useVisiblePoll(poll);

  const competitorsById = useMemo(() => {
    const map = new Map<number, EnrichedLiveCompetitor>();
    for (const c of data.competitors) {
      map.set(c.id, c);
    }
    return map;
  }, [data.competitors]);

  const sortedResults = useMemo(() => {
    return [...data.results].sort((a, b) => {
      const aPos = a.local_pos ?? a.global_pos ?? 9999;
      const bPos = b.local_pos ?? b.global_pos ?? 9999;
      return aPos - bPos;
    });
  }, [data.results]);

  const attemptCount = Math.max(
    1,
    ...sortedResults.map((r) => r.attempts.length),
    data.format === "a" || data.format === "m" ? 5 : 3,
  );

  const eventId = sortedResults[0]?.event_id ?? roundId.split("-r")[0]!;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            <Link
              href={`/live/${competitionId}`}
              prefetch={false}
              className="hover:underline"
            >
              {data.competitionName ?? competitionId}
            </Link>
          </p>
          <h1 className="text-3xl font-bold tracking-tight flex flex-wrap items-center gap-3">
            <span
              className={`cubing-icon event-${eventId} text-3xl`}
              aria-hidden
            />
            {liveRoundLabel(roundId)}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge
              variant={data.state === "open" ? "default" : "secondary"}
            >
              {liveRoundStateLabel(data.state)}
            </Badge>
            <span className="inline-flex items-center gap-1">
              <Radio className="size-3.5 text-red-500 animate-pulse" />
              Actualización automática
            </span>
            {data.timeLimit ? (
              <span>
                Límite:{" "}
                {formatLiveResultValue(
                  eventId,
                  data.timeLimit.centiseconds,
                )}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/live/${competitionId}`}
            prefetch={false}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Rondas
          </Link>
          <Link
            href={data.officialLiveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <ExternalLink />
            Fuente oficial WCA
          </Link>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">{error}</p>
      ) : null}

      {sortedResults.length === 0 ? (
        <p className="text-muted-foreground">
          Esta ronda aún no tiene resultados. Aparecerán intento por intento
          conforme se capturen.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">#</TableHead>
                <TableHead>Competidor</TableHead>
                <TableHead>Región</TableHead>
                {Array.from({ length: attemptCount }, (_, i) => (
                  <TableHead key={i} className="text-right tabular-nums">
                    {i + 1}
                  </TableHead>
                ))}
                <TableHead className="text-right">Average</TableHead>
                <TableHead className="text-right">Single</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedResults.map((result) => (
                <ResultRow
                  key={result.result_id}
                  result={result}
                  competitor={competitorsById.get(result.registration_id)}
                  attemptCount={attemptCount}
                  eventId={eventId}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function ResultRow({
  result,
  competitor,
  attemptCount,
  eventId,
}: {
  result: LiveResult;
  competitor: EnrichedLiveCompetitor | undefined;
  attemptCount: number;
  eventId: string;
}) {
  const attemptsByNumber = new Map(
    result.attempts.map((a) => [a.attempt_number, a.value]),
  );
  const pos = result.local_pos ?? result.global_pos;
  const avgTag = formatRecordTag(result.average_record_tag);
  const singleTag = formatRecordTag(result.single_record_tag);
  const region =
    [competitor?.country_iso2, competitor?.stateName]
      .filter(Boolean)
      .join(" · ") || "—";

  const name = competitor?.name ?? `Registrant ${result.registration_id}`;
  const wcaId = competitor?.wca_id;

  return (
    <TableRow>
      <TableCell className="tabular-nums font-medium">{pos ?? "—"}</TableCell>
      <TableCell>
        {wcaId ? (
          <Link
            href={`/persons/${wcaId}`}
            prefetch={false}
            className="font-medium hover:underline"
          >
            {name}
          </Link>
        ) : (
          <span className="font-medium">{name}</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-sm">{region}</TableCell>
      {Array.from({ length: attemptCount }, (_, i) => {
        const value = attemptsByNumber.get(i + 1);
        return (
          <TableCell key={i} className="text-right tabular-nums">
            {value == null
              ? "—"
              : formatLiveResultValue(eventId, value, "single")}
          </TableCell>
        );
      })}
      <TableCell className="text-right tabular-nums">
        {formatLiveResultValue(eventId, result.average, "average")}
        {avgTag ? (
          <span className="ml-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
            {avgTag}
          </span>
        ) : null}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatLiveResultValue(eventId, result.best, "single")}
        {singleTag ? (
          <span className="ml-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
            {singleTag}
          </span>
        ) : null}
      </TableCell>
    </TableRow>
  );
}
