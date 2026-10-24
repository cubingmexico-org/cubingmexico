import type { ReactNode } from "react";
import type { CcYearSummary } from "@/lib/cubing-contests";
import { CcEventIcon } from "@/components/cubing-contests/cc-event-icon";
import { CcAttribution } from "@/components/cubing-contests/cc-attribution";
import { Stat } from "./summary-stat";

/** Unofficial events in the year. Never part of the official totals or share cards. */
export function UnofficialSummarySection({
  lead,
  summary,
}: {
  /** Start of the sentence including the verb, e.g. "Ella registró". */
  lead: ReactNode;
  summary: CcYearSummary;
}) {
  const { resultCount, competitionCount, events, podiums } = summary;
  const podiumTotal = podiums.gold + podiums.silver + podiums.bronze;

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Eventos no oficiales</h2>
      <p className="text-muted-foreground text-sm sm:text-base">
        {lead} <Stat>{resultCount}</Stat>{" "}
        {resultCount === 1 ? "resultado" : "resultados"} en{" "}
        <Stat>{events.length}</Stat>{" "}
        {events.length === 1 ? "evento no oficial" : "eventos no oficiales"} en{" "}
        <Stat>{competitionCount}</Stat>{" "}
        {competitionCount === 1 ? "competencia" : "competencias"}
        {podiumTotal > 0 ? (
          <>
            , con <Stat tone="gold">{podiums.gold}</Stat>{" "}
            {podiums.gold === 1 ? "oro" : "oros"},{" "}
            <Stat tone="silver">{podiums.silver}</Stat>{" "}
            {podiums.silver === 1 ? "plata" : "platas"} y{" "}
            <Stat tone="bronze">{podiums.bronze}</Stat>{" "}
            {podiums.bronze === 1 ? "bronce" : "bronces"}
          </>
        ) : null}
        .
      </p>
      <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
        {events.map((event) => (
          <span
            key={event.eventId}
            className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-sm"
          >
            <CcEventIcon eventId={event.eventId} eventName={event.eventName} />
            {event.eventName}
          </span>
        ))}
      </div>
      <CcAttribution />
    </section>
  );
}
