"use server";

import {
  getPersonChampionshipPodiums,
  getPersonCompetitionLocations,
  getPersonCompetitionResults,
  getPersonPodiumsByEvent,
  getPersonPrStreaks,
  getPersonRecordHistory,
  getPersonStaffCompetitions,
  getPersonUnofficialPodiumsByEvent,
  getPersonUnofficialResults,
} from "./queries";
import { getStatesGeoJSON } from "@/db/queries";
import {
  getNemesisReport,
  getNemesizedReport,
} from "../../_lib/nemesis-queries";
import { requireEventId, requireWcaId } from "@/lib/action-input";
import { eventScopeFromDeprecated } from "@/lib/official-events";

export async function loadPersonCompetitionResults(
  wcaId: string,
  eventId: string,
) {
  return getPersonCompetitionResults(
    requireWcaId(wcaId),
    requireEventId(eventId),
  );
}

export async function loadPersonRecordHistory(wcaId: string) {
  return getPersonRecordHistory(requireWcaId(wcaId));
}

export async function loadPersonChampionshipPodiums(wcaId: string) {
  return getPersonChampionshipPodiums(requireWcaId(wcaId));
}

export async function loadPersonPrStreaks(
  wcaId: string,
  includeDeprecated: boolean,
) {
  return getPersonPrStreaks(
    requireWcaId(wcaId),
    eventScopeFromDeprecated(includeDeprecated === true),
  );
}

export async function loadPersonPodiumsByEvent(
  wcaId: string,
  includeDeprecated: boolean,
) {
  return getPersonPodiumsByEvent(
    requireWcaId(wcaId),
    eventScopeFromDeprecated(includeDeprecated === true),
  );
}

export async function loadPersonStaffCompetitions(wcaId: string) {
  return getPersonStaffCompetitions(requireWcaId(wcaId));
}

export async function loadPersonUnofficialResults(wcaId: string) {
  return getPersonUnofficialResults(requireWcaId(wcaId));
}

export async function loadPersonUnofficialPodiums(wcaId: string) {
  return getPersonUnofficialPodiumsByEvent(requireWcaId(wcaId));
}

export async function loadPersonNemeses(
  wcaId: string,
  includeDeprecated: boolean,
) {
  const id = requireWcaId(wcaId);
  const scope = eventScopeFromDeprecated(includeDeprecated === true);
  const [report, nemesized] = await Promise.all([
    getNemesisReport(id, scope),
    getNemesizedReport(id, scope),
  ]);
  return { report, nemesized, includeDeprecated: scope === "all" };
}

export async function loadPersonMapData(wcaId: string) {
  const [locations, statesData] = await Promise.all([
    getPersonCompetitionLocations(requireWcaId(wcaId)),
    getStatesGeoJSON(),
  ]);

  const stateIds = locations
    .map((location) => location.stateId)
    .filter((stateId): stateId is string => stateId !== null);

  const filteredStatesData = statesData?.features.filter((feature) =>
    stateIds.includes(feature.properties.id),
  );

  const filteredLocations = locations.filter((location) => {
    const latitude = location.latitude ?? 0;
    const longitude = location.longitude ?? 0;
    return latitude !== 0 && longitude !== 0;
  });

  return {
    locations: filteredLocations,
    statesData: filteredStatesData,
    visitedStateCount: new Set(stateIds).size,
  };
}
