"use server";

import {
  getPersonChampionshipPodiums,
  getPersonCompetitionLocations,
  getPersonCompetitionResults,
  getPersonPrStreaks,
  getPersonRecordHistory,
  getPersonStaffCompetitions,
} from "./queries";
import { getStatesGeoJSON } from "@/db/queries";

export async function loadPersonCompetitionResults(
  wcaId: string,
  eventId: string,
) {
  return getPersonCompetitionResults(wcaId, eventId);
}

export async function loadPersonRecordHistory(wcaId: string) {
  return getPersonRecordHistory(wcaId);
}

export async function loadPersonChampionshipPodiums(wcaId: string) {
  return getPersonChampionshipPodiums(wcaId);
}

export async function loadPersonPrStreaks(wcaId: string) {
  return getPersonPrStreaks(wcaId);
}

export async function loadPersonStaffCompetitions(wcaId: string) {
  return getPersonStaffCompetitions(wcaId);
}

export async function loadPersonMapData(wcaId: string) {
  const [locations, statesData] = await Promise.all([
    getPersonCompetitionLocations(wcaId),
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
