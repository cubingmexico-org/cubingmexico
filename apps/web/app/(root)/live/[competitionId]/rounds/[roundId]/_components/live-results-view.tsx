"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, GalleryVertical, Radio } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button, buttonVariants } from "@workspace/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import { RecordBadges } from "@/components/record-badges";
import {
  formatLiveResultValue,
  liveRoundEventId,
  liveRoundLabel,
  liveRoundStateLabel,
} from "@/lib/live/format";
import type {
  EnrichedLiveCompetitor,
  EnrichedLiveResult,
  EnrichedLiveRoundDetails,
  LiveRoundSummary,
} from "@/lib/live/types";
import { LiveRegion } from "../../../../_components/live-region";
import { useVisiblePoll } from "../../../../_components/use-visible-poll";
import { LiveProjector } from "./live-projector";

type LiveRoundPayload = EnrichedLiveRoundDetails & {
  officialLiveUrl: string;
};

export function LiveResultsView({
  competitionId,
  roundId: initialRoundId,
  initial,
}: {
  competitionId: string;
  roundId: string;
  initial: LiveRoundPayload;
}) {
  const [activeRoundId, setActiveRoundId] = useState(initialRoundId);
  const [data, setData] = useState(initial);
  const [rounds, setRounds] = useState<LiveRoundSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [projectorOpen, setProjectorOpen] = useState(false);
  const [roundLoading, setRoundLoading] = useState(false);

  // Sync when the route param changes (e.g. browser back/forward into this page).
  useEffect(() => {
    setActiveRoundId(initialRoundId);
    setData(initial);
  }, [initialRoundId, initial]);

  const fetchRound = useCallback(
    async (roundId: string, { silent }: { silent?: boolean } = {}) => {
      if (!silent) setRoundLoading(true);
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
      } finally {
        if (!silent) setRoundLoading(false);
      }
    },
    [competitionId],
  );

  const poll = useCallback(() => {
    void fetchRound(activeRoundId, { silent: true });
  }, [fetchRound, activeRoundId]);

  useVisiblePoll(poll);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(
          `/api/live/${encodeURIComponent(competitionId)}/rounds`,
        );
        if (!response.ok) return;
        const json = (await response.json()) as {
          success: boolean;
          data?: { rounds: LiveRoundSummary[] };
        };
        if (!cancelled && json.success && json.data) {
          setRounds(json.data.rounds);
        }
      } catch {
        // Dropdown stays empty; projector still works for the current round.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [competitionId]);

  const selectRound = useCallback(
    (nextRoundId: string) => {
      if (nextRoundId === activeRoundId) return;
      setActiveRoundId(nextRoundId);
      // Keep projector mounted: avoid App Router remount from router.replace.
      window.history.replaceState(
        null,
        "",
        `/live/${competitionId}/rounds/${encodeURIComponent(nextRoundId)}`,
      );
      void fetchRound(nextRoundId);
    },
    [activeRoundId, competitionId, fetchRound],
  );

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

  const eventId = sortedResults[0]?.event_id ?? liveRoundEventId(activeRoundId);
  const title = liveRoundLabel(activeRoundId);
  const competitionName = data.competitionName ?? competitionId;

  if (projectorOpen) {
    return (
      <LiveProjector
        key={activeRoundId}
        competitionName={competitionName}
        roundId={activeRoundId}
        rounds={rounds}
        title={title}
        eventId={eventId}
        attemptCount={attemptCount}
        results={sortedResults}
        competitorsById={competitorsById}
        loading={roundLoading}
        onRoundChange={selectRound}
        onClose={() => setProjectorOpen(false)}
      />
    );
  }

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
              {competitionName}
            </Link>
          </p>
          <h1 className="text-3xl font-bold tracking-tight flex flex-wrap items-center gap-3">
            <span
              className={`cubing-icon event-${eventId} text-3xl`}
              aria-hidden
            />
            {title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant={data.state === "open" ? "default" : "secondary"}>
              {liveRoundStateLabel(data.state)}
            </Badge>
            <span className="inline-flex items-center gap-1">
              <Radio className="size-3.5 text-red-500 animate-pulse" />
              Actualización automática
            </span>
            {data.timeLimit ? (
              <span>
                Límite:{" "}
                {formatLiveResultValue(eventId, data.timeLimit.centiseconds)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="default"
            onClick={() => setProjectorOpen(true)}
          >
            <GalleryVertical />
            Proyectar
          </Button>
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
  result: EnrichedLiveResult;
  competitor: EnrichedLiveCompetitor | undefined;
  attemptCount: number;
  eventId: string;
}) {
  const attemptsByNumber = new Map(
    result.attempts.map((a) => [a.attempt_number, a.value]),
  );
  const pos = result.local_pos ?? result.global_pos;
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
      <TableCell>
        <LiveRegion
          countryIso2={competitor?.country_iso2}
          stateId={competitor?.stateId}
          stateName={competitor?.stateName}
        />
      </TableCell>
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
      <TableCell className="text-right">
        <span className="inline-flex items-center justify-end gap-1.5 tabular-nums">
          {formatLiveResultValue(eventId, result.average, "average")}
          <RecordBadges
            regional={result.average_record_tag}
            state={result.stateAverageRecord}
          />
        </span>
      </TableCell>
      <TableCell className="text-right">
        <span className="inline-flex items-center justify-end gap-1.5 tabular-nums">
          {formatLiveResultValue(eventId, result.best, "single")}
          <RecordBadges
            regional={result.single_record_tag}
            state={result.stateSingleRecord}
          />
        </span>
      </TableCell>
    </TableRow>
  );
}
