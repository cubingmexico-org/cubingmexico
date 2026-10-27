"use client";

import { useEffect, useMemo, useState } from "react";
import type { WCIF } from "@/types/wcif";
import {
  findRoundActivities,
  getGroupActivitiesForRound,
  parseRoundActivityCode,
} from "@/lib/groups/wcif-schedule";
import {
  extensionSourceLabel,
  suggestGroupCountsFromExtensions,
} from "@/lib/groups/extensions";
import {
  getActivityConfig,
  getCompetitionConfig,
  getRoomConfig,
  hasOrganizacionActivityConfig,
} from "@/lib/groups/config";
import { suggestedGroupsForRound } from "@/lib/groups/config-suggestions";
import { suggestStaffForRound } from "@/lib/groups/formulas";

/**
 * Form state of the group config panel. It starts from the round's existing groups or
 * the suggestion for it, and from the saved staff config or the competition defaults,
 * and resets whenever the round or the WCIF changes.
 */
export function useGroupConfigState(wcif: WCIF, roundActivityCode: string) {
  const parents = useMemo(
    () => findRoundActivities(wcif, roundActivityCode),
    [wcif, roundActivityCode],
  );
  const existingGroups = useMemo(
    () => getGroupActivitiesForRound(wcif, roundActivityCode),
    [wcif, roundActivityCode],
  );
  const roundMeta = useMemo(
    () => parseRoundActivityCode(roundActivityCode),
    [roundActivityCode],
  );
  const competitionConfig = useMemo(() => getCompetitionConfig(wcif), [wcif]);
  const roundSuggestion = useMemo(
    () => suggestedGroupsForRound(wcif, roundActivityCode),
    [wcif, roundActivityCode],
  );
  const primaryStations = useMemo(() => {
    const first = parents[0];
    if (!first) return 0;
    const room = wcif.schedule.venues
      .flatMap((v) => v.rooms)
      .find((r) => r.id === first.roomId);
    return room ? getRoomConfig(room).stations : 0;
  }, [wcif, parents]);

  const [spreadAcrossStages, setSpreadAcrossStages] = useState(true);
  const [groupCount, setGroupCount] = useState(2);
  const [perRoomCounts, setPerRoomCounts] = useState<Record<number, number>>(
    {},
  );
  const [timeSplit, setTimeSplit] = useState(true);
  const [scramblersEnabled, setScramblersEnabled] = useState(true);
  const [runnersEnabled, setRunnersEnabled] = useState(true);
  const [assignJudges, setAssignJudges] = useState(true);
  const [scramblerCount, setScramblerCount] = useState(1);
  const [runnerCount, setRunnerCount] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [extensionHint, setExtensionHint] = useState<string | null>(null);

  const effectiveGroups = spreadAcrossStages
    ? groupCount
    : Math.max(...Object.values(perRoomCounts), groupCount, 1);

  const staffHelpers = useMemo(
    () =>
      suggestStaffForRound({
        stations: primaryStations,
        competitors: Math.max(roundSuggestion.competitors, 1),
        roundNumber: roundMeta?.roundNumber ?? 1,
        groups: effectiveGroups,
        assignScramblers: scramblersEnabled,
        assignRunners: runnersEnabled,
        assignJudges,
      }),
    [
      primaryStations,
      roundSuggestion.competitors,
      roundMeta?.roundNumber,
      effectiveGroups,
      scramblersEnabled,
      runnersEnabled,
      assignJudges,
    ],
  );

  useEffect(() => {
    setError(null);
    const foreign = suggestGroupCountsFromExtensions(wcif, roundActivityCode);
    const suggestion = suggestedGroupsForRound(wcif, roundActivityCode);
    const firstParent = parents[0];
    const savedConfig = firstParent
      ? getActivityConfig(firstParent.activity)
      : null;
    const hasSaved = firstParent
      ? hasOrganizacionActivityConfig(firstParent.activity)
      : false;

    if (existingGroups.length > 0) {
      setGroupCount(Math.max(1, existingGroups.length));
      const initial: Record<number, number> = {};
      for (const parent of parents) {
        initial[parent.roomId] = parent.activity.childActivities?.length || 0;
      }
      setPerRoomCounts(initial);
      setExtensionHint(null);
    } else {
      setSpreadAcrossStages(suggestion.spreadAcrossStages);
      setGroupCount(Math.max(1, suggestion.groupCount));
      setPerRoomCounts({ ...suggestion.perRoomCounts });

      if (foreign) {
        setExtensionHint(
          `Detectado desde ${extensionSourceLabel(foreign.source)}`,
        );
      } else if (suggestion.stations > 0) {
        setExtensionHint(
          `Sugerido: ${suggestion.competitors} inscritos · ${suggestion.stations} estaciones → ${suggestion.groupCount} grupo(s)`,
        );
      } else {
        setExtensionHint(
          "Configura estaciones en Configuración para una mejor sugerencia",
        );
      }
    }

    const staffSeed = suggestStaffForRound({
      stations: primaryStations,
      competitors: Math.max(suggestion.competitors, 1),
      roundNumber: roundMeta?.roundNumber ?? 1,
      groups: hasSaved
        ? (savedConfig?.groups ?? suggestion.groupCount)
        : suggestion.groupCount,
      assignScramblers: competitionConfig.assignScramblers,
      assignRunners: competitionConfig.assignRunners,
      assignJudges: competitionConfig.assignJudges,
    });

    if (hasSaved && savedConfig) {
      setScramblersEnabled(savedConfig.scramblers > 0);
      setRunnersEnabled(savedConfig.runners > 0);
      setAssignJudges(savedConfig.assignJudges);
      setScramblerCount(savedConfig.scramblers);
      setRunnerCount(savedConfig.runners);
    } else {
      setScramblersEnabled(competitionConfig.assignScramblers);
      setRunnersEnabled(competitionConfig.assignRunners);
      setAssignJudges(competitionConfig.assignJudges);
      setScramblerCount(staffSeed.scramblers);
      setRunnerCount(staffSeed.runners);
    }
  }, [
    roundActivityCode,
    parents,
    existingGroups.length,
    wcif,
    primaryStations,
    roundMeta?.roundNumber,
    competitionConfig.assignScramblers,
    competitionConfig.assignRunners,
    competitionConfig.assignJudges,
  ]);

  return {
    parents,
    existingGroups,
    staffHelpers,
    extensionHint,
    error,
    setError,
    spreadAcrossStages,
    setSpreadAcrossStages,
    groupCount,
    setGroupCount,
    perRoomCounts,
    setPerRoomCounts,
    timeSplit,
    setTimeSplit,
    scramblersEnabled,
    setScramblersEnabled,
    runnersEnabled,
    setRunnersEnabled,
    assignJudges,
    setAssignJudges,
    scramblerCount,
    setScramblerCount,
    runnerCount,
    setRunnerCount,
  };
}
