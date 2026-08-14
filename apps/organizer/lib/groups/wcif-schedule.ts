import type { Activity, EventId, WCIF } from "@/types/wcif";

/** Round activity code, e.g. `333-r1`. */
export function roundActivityCode(
  eventId: EventId | string,
  roundNumber: number,
): string {
  return `${eventId}-r${roundNumber}`;
}

/** Parse `333-r1` → { eventId, roundNumber }. */
export function parseRoundActivityCode(
  code: string,
): { eventId: string; roundNumber: number } | null {
  const match = /^(.+)-r(\d+)$/.exec(code);
  if (!match?.[1] || match[2] === undefined) return null;
  return { eventId: match[1], roundNumber: Number(match[2]) };
}

/** Group activity code, e.g. `333-r1-g2`. */
export function groupActivityCode(
  roundCode: string,
  groupNumber: number,
): string {
  return `${roundCode}-g${groupNumber}`;
}

/** Parse group number from `333-r1-g2` → 2. */
export function parseGroupNumber(activityCode: string): number | null {
  const match = /-g(\d+)$/.exec(activityCode);
  return match ? Number(match[1]) : null;
}

/** Round id from events[].rounds is typically `333-r1`. */
export function roundIdToActivityCode(roundId: string): string {
  return roundId;
}

export function eventIdFromRoundId(roundId: string): EventId | string {
  const parsed = parseRoundActivityCode(roundId);
  if (parsed) return parsed.eventId;
  const [eventId] = roundId.split("-");
  return eventId ?? roundId;
}

export function deepCloneWcif(wcif: WCIF): WCIF {
  return structuredClone(wcif);
}

export function maxActivityId(wcif: WCIF): number {
  let max = 0;
  for (const venue of wcif.schedule.venues) {
    for (const room of venue.rooms) {
      for (const activity of room.activities) {
        max = Math.max(max, activity.id);
        for (const child of activity.childActivities ?? []) {
          max = Math.max(max, child.id);
        }
      }
    }
  }
  return max;
}

export type LocatedActivity = {
  activity: Activity;
  roomId: number;
  roomName: string;
  venueId: number;
};

/** Parent round activities matching activityCode across all rooms. */
export function findRoundActivities(
  wcif: WCIF,
  roundActivityCode: string,
): LocatedActivity[] {
  const found: LocatedActivity[] = [];
  for (const venue of wcif.schedule.venues) {
    for (const room of venue.rooms) {
      for (const activity of room.activities) {
        if (activity.activityCode === roundActivityCode) {
          found.push({
            activity,
            roomId: room.id,
            roomName: room.name,
            venueId: venue.id,
          });
        }
      }
    }
  }
  return found;
}

export function findActivityById(
  wcif: WCIF,
  activityId: number,
): LocatedActivity | null {
  for (const venue of wcif.schedule.venues) {
    for (const room of venue.rooms) {
      for (const activity of room.activities) {
        if (activity.id === activityId) {
          return {
            activity,
            roomId: room.id,
            roomName: room.name,
            venueId: venue.id,
          };
        }
        for (const child of activity.childActivities ?? []) {
          if (child.id === activityId) {
            return {
              activity: child,
              roomId: room.id,
              roomName: room.name,
              venueId: venue.id,
            };
          }
        }
      }
    }
  }
  return null;
}

export function getGroupActivitiesForRound(
  wcif: WCIF,
  roundActivityCode: string,
): LocatedActivity[] {
  const parents = findRoundActivities(wcif, roundActivityCode);
  const groups: LocatedActivity[] = [];
  for (const parent of parents) {
    for (const child of parent.activity.childActivities ?? []) {
      if (parseGroupNumber(child.activityCode) !== null) {
        groups.push({
          activity: child,
          roomId: parent.roomId,
          roomName: parent.roomName,
          venueId: parent.venueId,
        });
      }
    }
  }
  return groups.sort((a, b) => {
    const ga = parseGroupNumber(a.activity.activityCode) ?? 0;
    const gb = parseGroupNumber(b.activity.activityCode) ?? 0;
    if (ga !== gb) return ga - gb;
    return a.activity.id - b.activity.id;
  });
}

function splitTimeWindow(
  startTime: string,
  endTime: string,
  groupCount: number,
  index: number,
): { startTime: string; endTime: string } {
  const startMs = new Date(startTime).getTime();
  const endMs = new Date(endTime).getTime();
  const duration = endMs - startMs;
  const slice = duration / groupCount;
  return {
    startTime: new Date(startMs + slice * index).toISOString(),
    endTime: new Date(startMs + slice * (index + 1)).toISOString(),
  };
}

export type CreateGroupsOptions = {
  /** Same count on every stage that has this round activity. */
  spreadAcrossStages: boolean;
  /** Used when spreadAcrossStages is true. */
  groupCount: number;
  /** roomId → count when spreadAcrossStages is false. */
  perRoomCounts?: Record<number, number>;
  /** Evenly split parent start/end across groups. */
  timeSplit?: boolean;
};

/**
 * Create or replace child group activities for a round.
 * Removes assignments that pointed at old child activities of this round.
 */
export function createGroupsForRound(
  wcif: WCIF,
  roundActivityCode: string,
  options: CreateGroupsOptions,
): WCIF {
  const draft = deepCloneWcif(wcif);
  const parents = findRoundActivities(draft, roundActivityCode);
  if (parents.length === 0) {
    throw new Error(`No hay actividades de ronda para ${roundActivityCode}`);
  }

  const removedIds = new Set<number>();
  let nextId = maxActivityId(draft) + 1;

  for (const parent of parents) {
    for (const child of parent.activity.childActivities ?? []) {
      removedIds.add(child.id);
    }
  }

  for (const person of draft.persons) {
    person.assignments = (person.assignments ?? []).filter(
      (a) => !removedIds.has(a.activityId),
    );
  }

  for (const parent of parents) {
    const count = options.spreadAcrossStages
      ? options.groupCount
      : (options.perRoomCounts?.[parent.roomId] ?? 0);

    if (count <= 0) {
      parent.activity.childActivities = [];
      continue;
    }

    const children: Activity[] = [];
    for (let i = 0; i < count; i++) {
      const groupNumber = i + 1;
      const times =
        options.timeSplit !== false
          ? splitTimeWindow(
              parent.activity.startTime,
              parent.activity.endTime,
              count,
              i,
            )
          : {
              startTime: parent.activity.startTime,
              endTime: parent.activity.endTime,
            };

      children.push({
        id: nextId++,
        name: `${parent.activity.name} Grupo ${groupNumber}`,
        activityCode: groupActivityCode(roundActivityCode, groupNumber),
        startTime: times.startTime,
        endTime: times.endTime,
        childActivities: [],
        scrambleSetId: null,
        extensions: [],
      });
    }
    parent.activity.childActivities = children;
  }

  return draft;
}

/** Remove all assignments for a round's group activities (keep child activities). */
export function clearRoundAssignments(
  wcif: WCIF,
  roundActivityCode: string,
): WCIF {
  const draft = deepCloneWcif(wcif);
  const groupIds = new Set(
    getGroupActivitiesForRound(draft, roundActivityCode).map(
      (g) => g.activity.id,
    ),
  );
  for (const person of draft.persons) {
    person.assignments = (person.assignments ?? []).filter(
      (a) => !groupIds.has(a.activityId),
    );
  }
  return draft;
}

/** Clear assignments for a single group activity. */
export function clearGroupAssignments(wcif: WCIF, activityId: number): WCIF {
  const draft = deepCloneWcif(wcif);
  for (const person of draft.persons) {
    person.assignments = (person.assignments ?? []).filter(
      (a) => a.activityId !== activityId,
    );
  }
  return draft;
}

export function timesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  const as = new Date(aStart).getTime();
  const ae = new Date(aEnd).getTime();
  const bs = new Date(bStart).getTime();
  const be = new Date(bEnd).getTime();
  return as < be && bs < ae;
}

export function listAllActivitiesFlat(wcif: WCIF): LocatedActivity[] {
  const list: LocatedActivity[] = [];
  for (const venue of wcif.schedule.venues) {
    for (const room of venue.rooms) {
      for (const activity of room.activities) {
        list.push({
          activity,
          roomId: room.id,
          roomName: room.name,
          venueId: venue.id,
        });
        for (const child of activity.childActivities ?? []) {
          list.push({
            activity: child,
            roomId: room.id,
            roomName: room.name,
            venueId: venue.id,
          });
        }
      }
    }
  }
  return list;
}
