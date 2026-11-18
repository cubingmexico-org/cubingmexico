import "server-only";

import { db } from "@workspace/db";
import { person, state } from "@workspace/db/schema";
import { eq, inArray } from "drizzle-orm";
import { liveRoundEventId } from "./format";
import {
  getStateAverageBests,
  getStateSingleBests,
} from "./state-bests";
import { attachLiveStateRecords } from "./state-records";
import type {
  EnrichedLiveCompetitor,
  EnrichedLiveResult,
  EnrichedLiveRoundDetails,
  LiveCompetitor,
  LiveRoundDetails,
  PersonStateEnrichment,
  ScoretakingSoftware,
} from "./types";

export async function getPersonStateMap(
  wcaIds: string[],
): Promise<Map<string, PersonStateEnrichment>> {
  const unique = [...new Set(wcaIds.filter(Boolean))];
  if (unique.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      wcaId: person.wcaId,
      stateId: person.stateId,
      stateName: state.name,
    })
    .from(person)
    .leftJoin(state, eq(person.stateId, state.id))
    .where(inArray(person.wcaId, unique));

  const map = new Map<string, PersonStateEnrichment>();
  for (const row of rows) {
    map.set(row.wcaId, {
      stateId: row.stateId,
      stateName: row.stateName,
    });
  }
  return map;
}

export function enrichCompetitors(
  competitors: LiveCompetitor[],
  states: Map<string, PersonStateEnrichment>,
): EnrichedLiveCompetitor[] {
  return competitors.map((competitor) => {
    const enrichment =
      competitor.wca_id != null
        ? (states.get(competitor.wca_id) ?? {
            stateId: null,
            stateName: null,
          })
        : { stateId: null, stateName: null };
    return { ...competitor, ...enrichment };
  });
}

export async function enrichLiveRoundDetails(
  round: LiveRoundDetails,
  meta: {
    competitionName: string | null;
    scoretakingSoftware: ScoretakingSoftware | null;
  },
): Promise<EnrichedLiveRoundDetails> {
  const wcaIds = round.competitors
    .map((c) => c.wca_id)
    .filter((id): id is string => Boolean(id));
  const states = await getPersonStateMap(wcaIds);
  const competitors = enrichCompetitors(round.competitors, states);

  const eventId =
    round.results[0]?.event_id ?? liveRoundEventId(round.id);
  const stateIds = competitors
    .map((c) => c.stateId)
    .filter((id): id is string => Boolean(id));

  const [singleBests, averageBests] = await Promise.all([
    getStateSingleBests(eventId, stateIds),
    getStateAverageBests(eventId, stateIds),
  ]);

  const competitorsByRegistrationId = new Map(
    competitors.map((c) => [c.id, c]),
  );
  const tags = attachLiveStateRecords(
    round.results,
    competitorsByRegistrationId,
    singleBests,
    averageBests,
  );

  const results: EnrichedLiveResult[] = round.results.map((result, i) => ({
    ...result,
    stateSingleRecord: tags[i]!.stateSingleRecord,
    stateAverageRecord: tags[i]!.stateAverageRecord,
  }));

  return {
    ...round,
    competitors,
    results,
    competitionName: meta.competitionName,
    scoretakingSoftware: meta.scoretakingSoftware,
  };
}
