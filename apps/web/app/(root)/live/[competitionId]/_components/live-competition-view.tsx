"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ExternalLink, Radio } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Badge } from "@workspace/ui/components/badge";
import { buttonVariants } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { eventNames } from "@/lib/constants";
import {
  liveRoundCompletedCount,
  liveRoundEventId,
  liveRoundLabel,
  liveRoundStateLabel,
} from "@/lib/live/format";
import type {
  LiveCompetitionMeta,
  LiveRoundSummary,
} from "@/lib/live/types";
import { useVisiblePoll } from "../../_components/use-visible-poll";

type LiveRoundsPayload = {
  competition: LiveCompetitionMeta;
  rounds: LiveRoundSummary[];
  officialLiveUrl: string;
};

export function LiveCompetitionView({
  competitionId,
  initial,
}: {
  competitionId: string;
  initial: LiveRoundsPayload;
}) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  const poll = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/live/${encodeURIComponent(competitionId)}/rounds`,
      );
      if (!response.ok) {
        setError("No se pudieron actualizar las rondas.");
        return;
      }
      const json = (await response.json()) as {
        success: boolean;
        data?: LiveRoundsPayload;
      };
      if (json.success && json.data) {
        setData(json.data);
        setError(null);
      }
    } catch {
      setError("No se pudieron actualizar las rondas.");
    }
  }, [competitionId]);

  useVisiblePoll(poll);

  const openRounds = data.rounds.filter((r) => r.state === "open");
  const otherRounds = data.rounds.filter((r) => r.state !== "open");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Radio className="size-3.5 text-red-500 animate-pulse" />
            Actualización automática
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            {data.competition.name}
          </h1>
          {(data.competition.venue || data.competition.city) && (
            <p className="text-muted-foreground">
              {data.competition.venue ? (
                <ReactMarkdown
                  components={{
                    a: ({ children, href }) => (
                      <Link
                        className="hover:underline"
                        href={href ?? ""}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {children}
                      </Link>
                    ),
                    p: ({ children }) => <>{children}</>,
                  }}
                >
                  {data.competition.venue}
                </ReactMarkdown>
              ) : null}
              {data.competition.venue && data.competition.city ? " · " : null}
              {data.competition.city}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/live"
            prefetch={false}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Todas en vivo
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

      {data.rounds.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Sin resultados en vivo todavía</CardTitle>
            <CardDescription>
              Esta competencia aún no tiene rondas en el sistema de resultados
              en vivo de la WCA, o usa otro software de captura. Revisa la
              fuente oficial.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={data.officialLiveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants())}
            >
              <ExternalLink />
              Abrir en WCA
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {openRounds.length > 0 ? (
            <RoundSection
              title="Rondas en curso"
              competitionId={competitionId}
              rounds={openRounds}
            />
          ) : null}
          {otherRounds.length > 0 ? (
            <RoundSection
              title={
                openRounds.length > 0 ? "Otras rondas" : "Todas las rondas"
              }
              competitionId={competitionId}
              rounds={openRounds.length > 0 ? otherRounds : data.rounds}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function RoundSection({
  title,
  competitionId,
  rounds,
}: {
  title: string;
  competitionId: string;
  rounds: LiveRoundSummary[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {rounds.map((round) => {
          const eventId = liveRoundEventId(round.id);
          const completed = liveRoundCompletedCount(round);
          const total = round.total_competitors ?? 0;
          return (
            <li key={round.id}>
              <Link
                href={`/live/${competitionId}/rounds/${encodeURIComponent(round.id)}`}
                prefetch={false}
                className="flex items-center gap-3 rounded-xl border p-4 hover:bg-accent/40 transition-colors"
              >
                <span
                  className={`cubing-icon event-${eventId} text-2xl shrink-0`}
                  aria-hidden
                />
                <div className="min-w-0 grow space-y-1">
                  <p className="font-medium leading-snug">
                    {liveRoundLabel(round.id)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {eventNames[eventId] ?? eventId}
                    {total > 0
                      ? ` · ${completed}/${total} resultados`
                      : null}
                  </p>
                </div>
                <Badge
                  variant={round.state === "open" ? "default" : "secondary"}
                >
                  {liveRoundStateLabel(round.state)}
                </Badge>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
