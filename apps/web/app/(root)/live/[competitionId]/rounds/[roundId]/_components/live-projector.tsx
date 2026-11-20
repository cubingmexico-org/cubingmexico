"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, X } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { RecordBadges } from "@/components/record-badges";
import {
  formatLiveResultValue,
  liveRoundEventId,
  liveRoundLabel,
  liveRoundSpectatorLabel,
} from "@/lib/live/format";
import type {
  EnrichedLiveCompetitor,
  EnrichedLiveResult,
  LiveRoundSummary,
} from "@/lib/live/types";
import { LiveRegion } from "../../../../_components/live-region";

const ROW_HEIGHT_PX = 52;
const CHROME_HEIGHT_PX = 120;
const SHOWING_MS = 800;
const SHOWN_MS = 8_000;
const HIDING_MS = 600;

type Phase = "showing" | "shown" | "hiding";

function rowsPerPage(): number {
  if (typeof window === "undefined") return 12;
  return Math.max(
    1,
    Math.floor((window.innerHeight - CHROME_HEIGHT_PX) / ROW_HEIGHT_PX),
  );
}

export function LiveProjector({
  title,
  competitionName,
  roundId,
  rounds,
  eventId,
  attemptCount,
  results,
  competitorsById,
  loading,
  onRoundChange,
  onClose,
}: {
  title: string;
  competitionName: string;
  roundId: string;
  rounds: LiveRoundSummary[];
  eventId: string;
  attemptCount: number;
  results: EnrichedLiveResult[];
  competitorsById: Map<number, EnrichedLiveCompetitor>;
  loading: boolean;
  onRoundChange: (roundId: string) => void;
  onClose: () => void;
}) {
  const nonempty = useMemo(
    () =>
      results.filter(
        (r) => r.attempts.some((a) => a.value !== 0) || r.best > 0,
      ),
    [results],
  );

  const [paused, setPaused] = useState(false);
  const [phase, setPhase] = useState<Phase>("showing");
  const [topIndex, setTopIndex] = useState(0);
  const [pageSize, setPageSize] = useState(12);

  useEffect(() => {
    const update = () => setPageSize(rowsPerPage());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === " ") {
        event.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    setTopIndex(0);
    setPhase("showing");
  }, [roundId]);

  useEffect(() => {
    if (paused) return;

    if (phase === "showing") {
      const t = setTimeout(() => setPhase("shown"), SHOWING_MS);
      return () => clearTimeout(t);
    }

    if (phase === "shown") {
      if (nonempty.length <= pageSize) return;
      const t = setTimeout(() => setPhase("hiding"), SHOWN_MS);
      return () => clearTimeout(t);
    }

    if (phase === "hiding") {
      const t = setTimeout(() => {
        setTopIndex((prev) => {
          const next = prev + pageSize;
          return next >= nonempty.length ? 0 : next;
        });
        setPhase("showing");
      }, HIDING_MS);
      return () => clearTimeout(t);
    }
  }, [phase, paused, nonempty.length, pageSize]);

  const page = nonempty.slice(topIndex, topIndex + pageSize);
  const opacity = phase === "hiding" ? 0 : phase === "showing" ? 0.35 : 1;
  const selectRounds =
    rounds.length > 0
      ? rounds
      : [{ id: roundId, format: "a", state: "open" as const }];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-zinc-50">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 px-6 py-4">
        <div className="min-w-0 space-y-2">
          <p className="text-sm text-zinc-400 truncate">{competitionName}</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <span
                className={`cubing-icon event-${eventId} text-2xl`}
                aria-hidden
              />
              <span className="sr-only">{title}</span>
            </h1>
            <Select value={roundId} onValueChange={onRoundChange}>
              <SelectTrigger
                size="sm"
                aria-label="Evento y ronda"
                className="min-w-56 max-w-[min(100vw-2rem,28rem)] border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 [&_svg]:text-zinc-400"
              >
                <SelectValue placeholder="Elegir ronda" />
              </SelectTrigger>
              <SelectContent className="z-60 max-h-80 border-zinc-700 bg-zinc-900 text-zinc-100">
                {selectRounds.map((round) => {
                  const roundEventId = liveRoundEventId(round.id);
                  const label = liveRoundLabel(round.id);
                  return (
                    <SelectItem
                      key={round.id}
                      value={round.id}
                      textValue={label}
                      className="focus:bg-zinc-800 focus:text-zinc-50"
                    >
                      <span className="inline-flex items-center gap-2">
                        <span
                          className={`cubing-icon event-${roundEventId}`}
                          aria-hidden
                        />
                        <span>{label}</span>
                        <span className="text-zinc-500">
                          · {liveRoundSpectatorLabel(round)}
                        </span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? <Play /> : <Pause />}
            {paused ? "Reanudar" : "Pausar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
            onClick={onClose}
          >
            <X />
            Cerrar
          </Button>
        </div>
      </header>

      <div
        className="relative flex-1 overflow-hidden px-4 py-2 transition-opacity duration-500"
        style={{ opacity: loading ? 0.4 : opacity }}
      >
        <table className="w-full border-collapse text-lg">
          <thead>
            <tr className="text-left text-zinc-400 border-b border-zinc-800">
              <th className="px-3 py-3 w-16">#</th>
              <th className="px-3 py-3">Competidor</th>
              <th className="px-3 py-3">Región</th>
              {Array.from({ length: attemptCount }, (_, i) => (
                <th key={i} className="px-3 py-3 text-right tabular-nums">
                  {i + 1}
                </th>
              ))}
              <th className="px-3 py-3 text-right">Avg</th>
              <th className="px-3 py-3 text-right">Single</th>
            </tr>
          </thead>
          <tbody>
            {page.map((result) => {
              const competitor = competitorsById.get(result.registration_id);
              const attemptsByNumber = new Map(
                result.attempts.map((a) => [a.attempt_number, a.value]),
              );
              const pos = result.local_pos ?? result.global_pos;
              const name =
                competitor?.name ?? `Registrant ${result.registration_id}`;

              return (
                <tr
                  key={result.result_id}
                  className="border-b border-zinc-900"
                  style={{ height: ROW_HEIGHT_PX }}
                >
                  <td className="px-3 tabular-nums font-semibold">
                    {pos ?? "—"}
                  </td>
                  <td className="px-3 font-medium">{name}</td>
                  <td className="px-3">
                    <LiveRegion
                      countryIso2={competitor?.country_iso2}
                      stateId={competitor?.stateId}
                      stateName={competitor?.stateName}
                      size={18}
                      nameClassName="text-base text-zinc-300"
                    />
                  </td>
                  {Array.from({ length: attemptCount }, (_, i) => {
                    const value = attemptsByNumber.get(i + 1);
                    return (
                      <td key={i} className="px-3 text-right tabular-nums">
                        {value == null
                          ? "—"
                          : formatLiveResultValue(eventId, value, "single")}
                      </td>
                    );
                  })}
                  <td className="px-3 text-right">
                    <span className="inline-flex items-center justify-end gap-2 tabular-nums">
                      {formatLiveResultValue(
                        eventId,
                        result.average,
                        "average",
                      )}
                      <RecordBadges
                        regional={result.average_record_tag}
                        state={result.stateAverageRecord}
                      />
                    </span>
                  </td>
                  <td className="px-3 text-right">
                    <span className="inline-flex items-center justify-end gap-2 tabular-nums">
                      {formatLiveResultValue(eventId, result.best, "single")}
                      <RecordBadges
                        regional={result.single_record_tag}
                        state={result.stateSingleRecord}
                      />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!loading && nonempty.length === 0 ? (
          <p className="p-8 text-center text-zinc-400">
            Aún no hay resultados para proyectar en esta ronda.
          </p>
        ) : null}
        {loading ? (
          <p className="absolute inset-x-0 top-1/3 text-center text-zinc-400">
            Cargando ronda…
          </p>
        ) : null}
      </div>
    </div>
  );
}
