import type { WCIF } from "@/types/wcif";
import {
  getGroupActivitiesForRound,
  parseGroupNumber,
  parseRoundActivityCode,
} from "@/lib/groups/wcif-schedule";

export type ScrambleRoundMeta = {
  roundId: string;
  eventId: string;
  roundNumber: number;
  scrambleSetCount: number;
  groupCount: number;
  groupsByRoom: { roomId: number; roomName: string; groups: number }[];
  activityCodes: string[];
};

export type ScrambleHandoffPayload = {
  competitionId: string;
  competitionName: string;
  exportedAt: string;
  rounds: ScrambleRoundMeta[];
  note: string;
};

export function buildScrambleHandoffPayload(
  wcif: WCIF,
): ScrambleHandoffPayload {
  const rounds: ScrambleRoundMeta[] = [];

  for (const event of wcif.events) {
    for (const round of event.rounds) {
      const parsed = parseRoundActivityCode(round.id);
      const groups = getGroupActivitiesForRound(wcif, round.id);
      const byRoom = new Map<
        number,
        { roomId: number; roomName: string; groups: number }
      >();
      for (const g of groups) {
        const existing = byRoom.get(g.roomId);
        if (existing) existing.groups += 1;
        else {
          byRoom.set(g.roomId, {
            roomId: g.roomId,
            roomName: g.roomName,
            groups: 1,
          });
        }
      }

      rounds.push({
        roundId: round.id,
        eventId: event.id,
        roundNumber: parsed?.roundNumber ?? 0,
        scrambleSetCount: round.scrambleSetCount ?? 1,
        groupCount: groups.length,
        groupsByRoom: [...byRoom.values()],
        activityCodes: [
          ...new Set(groups.map((g) => g.activity.activityCode)),
        ].sort((a, b) => {
          const ga = parseGroupNumber(a) ?? 0;
          const gb = parseGroupNumber(b) ?? 0;
          return ga - gb;
        }),
      });
    }
  }

  return {
    competitionId: wcif.id,
    competitionName: wcif.name,
    exportedAt: new Date().toISOString(),
    rounds,
    note: "Usa estos metadatos con TNoodle (JAR local). Abre http://localhost:2014 con TNoodle en ejecución.",
  };
}

export function downloadScrambleMetadata(wcif: WCIF): void {
  const payload = buildScrambleHandoffPayload(wcif);
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${wcif.id}-scramble-handoff.json`;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const TNOODLE_LOCAL_URL = "http://localhost:2014";
