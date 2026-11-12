import type { TeamEventInsight } from "../_lib/queries";
import { eventLabel, formatShare } from "../_lib/format";
import { RECOMMENDATION_LABELS } from "../_lib/recommendation";

function maxBy<T>(items: T[], score: (item: T) => number): T | null {
  let best: T | null = null;
  let bestScore = 0;
  for (const item of items) {
    const value = score(item);
    if (value > bestScore) {
      best = item;
      bestScore = value;
    }
  }
  return best;
}

function HighlightStat({
  label,
  insight,
  detail,
}: {
  label: string;
  insight: TeamEventInsight | null;
  detail: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border px-3 py-4 text-center">
      <div className="text-xs text-muted-foreground sm:text-sm">{label}</div>
      {insight ? (
        <>
          <span
            className={`cubing-icon event-${insight.eventId} text-3xl leading-none`}
          />
          <div className="font-semibold">
            {eventLabel(insight.eventId, insight.eventName)}
          </div>
          <div className="text-xs text-muted-foreground">{detail}</div>
        </>
      ) : (
        <div className="py-3 text-sm text-muted-foreground">—</div>
      )}
    </div>
  );
}

export function TeamEventsHighlights({
  events,
}: {
  events: TeamEventInsight[];
}) {
  const popular = maxBy(events, (e) => e.members);
  const mostHosted = maxBy(events, (e) => e.roundsHosted);
  const strongest = maxBy(events, (e) => e.top100Single + e.top100Average);
  const needsRounds = maxBy(
    events.filter((e) => e.recommendation === "more_rounds"),
    (e) => 1 - (e.coverage ?? 0),
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      <HighlightStat
        label="Más popular"
        insight={popular}
        detail={
          popular
            ? `${popular.members} miembros${popular.recommendation === "frequency" ? `, ${RECOMMENDATION_LABELS.frequency.toLowerCase()}` : ""}`
            : ""
        }
      />
      <HighlightStat
        label="Más rondas en el estado"
        insight={mostHosted}
        detail={mostHosted ? `${mostHosted.roundsHosted} rondas` : ""}
      />
      <HighlightStat
        label="Más fuerte"
        insight={strongest}
        detail={
          strongest
            ? `${strongest.top100Single + strongest.top100Average} en top 100 nacional`
            : ""
        }
      />
      <HighlightStat
        label="Necesita más rondas"
        insight={needsRounds}
        detail={
          needsRounds
            ? `${formatShare(needsRounds.interest)} de interés, en ${formatShare(needsRounds.supplyShare)} de competencias`
            : ""
        }
      />
    </div>
  );
}
