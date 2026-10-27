import type { ParticipantData, WCIF } from "@/types/wcif";
import { ranksBySingle } from "./result-format";

type ParticipantResult = ParticipantData["results"][number];

const NO_RESULT = new Set([-2, -1, 0]);

/**
 * Every competitor with results, each with one entry per event taken from the
 * last round they competed in. Competitors with an unranked result are left out.
 */
export function buildParticipantResults(wcif: WCIF): ParticipantData[] {
  const participants: ParticipantData[] = [];

  for (const person of wcif.persons) {
    if (person.registrantId === null) continue;
    const eventIds = person.registration?.eventIds ?? [];

    const byEvent = new Map<string, ParticipantResult>();
    for (const event of wcif.events) {
      if (!eventIds.includes(event.id)) continue;
      for (const round of event.rounds) {
        const result = round.results.find(
          (r) => r.personId === person.registrantId,
        );
        if (!result) continue;
        byEvent.set(event.id, {
          event: event.id,
          ranking: result.ranking,
          // Rounds that rank by average still show the single when the competitor has no average.
          average:
            ranksBySingle(round) || result.average === 0
              ? result.best
              : result.average,
        });
      }
    }

    const results = [...byEvent.values()].sort((a, b) => {
      const aMissing = NO_RESULT.has(a.average);
      const bMissing = NO_RESULT.has(b.average);
      if (aMissing !== bMissing) return aMissing ? 1 : -1;
      return (a.ranking ?? 0) - (b.ranking ?? 0);
    });

    if (results.length > 0 && !results.some((r) => r.ranking === null)) {
      participants.push({
        wcaId: person.wcaId,
        registrantId: person.registrantId,
        name: person.name,
        results,
      });
    }
  }

  return participants;
}
