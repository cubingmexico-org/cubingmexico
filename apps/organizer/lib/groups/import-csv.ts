import type { Activity, Assignment, Person, WCIF } from "@/types/wcif";
import {
  createGroupsForRound,
  deepCloneWcif,
  findRoundActivities,
  getGroupActivitiesForRound,
  groupActivityCode,
  maxActivityId,
  parseGroupNumber,
  parseRoundActivityCode,
} from "@/lib/groups/wcif-schedule";

export type ImportCsvRow = {
  name?: string;
  wcaId?: string | null;
  registrantId?: string | number | null;
  wcaUserId?: string | number | null;
  round?: string;
  group?: string | number | null;
  room?: string;
  roomId?: string | number | null;
  activityId?: string | number | null;
  assignmentCode?: string;
  station?: string | number | null;
};

export type ImportResult = {
  wcif: WCIF;
  applied: number;
  warnings: string[];
  errors: string[];
};

function normalizeHeaderKey(key: string): string {
  return key.trim().toLowerCase().replace(/[\s_]+/g, "");
}

const HEADER_MAP: Record<string, keyof ImportCsvRow> = {
  name: "name",
  nombre: "name",
  wcaid: "wcaId",
  registrantid: "registrantId",
  wcauserid: "wcaUserId",
  round: "round",
  ronda: "round",
  group: "group",
  grupo: "group",
  room: "room",
  sala: "room",
  roomid: "roomId",
  activityid: "activityId",
  assignmentcode: "assignmentCode",
  rol: "assignmentCode",
  station: "station",
  estacion: "station",
  estación: "station",
};

export function normalizeImportRows(
  rawRows: Record<string, unknown>[],
): ImportCsvRow[] {
  return rawRows.map((raw) => {
    const row: ImportCsvRow = {};
    for (const [key, value] of Object.entries(raw)) {
      const mapped = HEADER_MAP[normalizeHeaderKey(key)];
      if (!mapped) continue;
      (row as Record<string, unknown>)[mapped] =
        value === "" || value === undefined ? null : value;
    }
    return row;
  });
}

function isRound1(roundCode: string): boolean {
  const parsed = parseRoundActivityCode(roundCode);
  return parsed?.roundNumber === 1;
}

function resolvePerson(
  wcif: WCIF,
  row: ImportCsvRow,
): Person | undefined {
  const registrantId =
    row.registrantId != null && row.registrantId !== ""
      ? Number(row.registrantId)
      : null;
  if (registrantId != null && Number.isFinite(registrantId)) {
    const byReg = wcif.persons.find((p) => p.registrantId === registrantId);
    if (byReg) return byReg;
  }

  const wcaId =
    typeof row.wcaId === "string" && row.wcaId.trim()
      ? row.wcaId.trim()
      : null;
  if (wcaId) {
    const byWca = wcif.persons.find(
      (p) => p.wcaId?.toLowerCase() === wcaId.toLowerCase(),
    );
    if (byWca) return byWca;
  }

  const wcaUserId =
    row.wcaUserId != null && row.wcaUserId !== ""
      ? Number(row.wcaUserId)
      : null;
  if (wcaUserId != null && Number.isFinite(wcaUserId)) {
    return wcif.persons.find((p) => p.wcaUserId === wcaUserId);
  }

  return undefined;
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

function rebalanceChildren(parent: Activity): void {
  const children = parent.childActivities ?? [];
  if (children.length === 0) return;
  children.forEach((child, index) => {
    const times = splitTimeWindow(
      parent.startTime,
      parent.endTime,
      children.length,
      index,
    );
    child.startTime = times.startTime;
    child.endTime = times.endTime;
  });
}

/**
 * Ensure group child activities exist for (round, roomId, groupNumber) pairs.
 */
export function ensureMissingGroupActivities(
  wcif: WCIF,
  needs: { round: string; roomId: number | null; group: number }[],
): WCIF {
  const draft = deepCloneWcif(wcif);
  let nextId = maxActivityId(draft) + 1;

  const byRound = new Map<string, { roomId: number | null; group: number }[]>();
  for (const need of needs) {
    const list = byRound.get(need.round) ?? [];
    list.push(need);
    byRound.set(need.round, list);
  }

  for (const [roundCode, roundNeeds] of byRound) {
    const parents = findRoundActivities(draft, roundCode);
    if (parents.length === 0) continue;

    const multiStage = parents.length > 1;
    const maxGroupNeeded = Math.max(...roundNeeds.map((n) => n.group), 0);

    // If any row omits roomId and there are multiple stages, we create the
    // same max group count on every stage (spread).
    const needsSpread = roundNeeds.some((n) => n.roomId == null) && multiStage;

    if (needsSpread || !multiStage) {
      for (const parent of parents) {
        const existing = new Map(
          (parent.activity.childActivities ?? []).map((c) => [
            parseGroupNumber(c.activityCode) ?? 0,
            c,
          ]),
        );
        for (let g = 1; g <= maxGroupNeeded; g++) {
          if (existing.has(g)) continue;
          const child: Activity = {
            id: nextId++,
            name: `${parent.activity.name} Grupo ${g}`,
            activityCode: groupActivityCode(roundCode, g),
            startTime: parent.activity.startTime,
            endTime: parent.activity.endTime,
            childActivities: [],
            scrambleSetId: null,
            extensions: [],
          };
          parent.activity.childActivities = [
            ...(parent.activity.childActivities ?? []),
            child,
          ];
        }
        parent.activity.childActivities = (
          parent.activity.childActivities ?? []
        ).sort(
          (a, b) =>
            (parseGroupNumber(a.activityCode) ?? 0) -
            (parseGroupNumber(b.activityCode) ?? 0),
        );
        rebalanceChildren(parent.activity);
      }
      continue;
    }

    // Per-room: only create missing groups on the specified room
    for (const need of roundNeeds) {
      if (need.roomId == null) continue;
      const parent = parents.find((p) => p.roomId === need.roomId);
      if (!parent) continue;
      const existingNums = new Set(
        (parent.activity.childActivities ?? []).map(
          (c) => parseGroupNumber(c.activityCode) ?? 0,
        ),
      );
      if (existingNums.has(need.group)) continue;
      const child: Activity = {
        id: nextId++,
        name: `${parent.activity.name} Grupo ${need.group}`,
        activityCode: groupActivityCode(roundCode, need.group),
        startTime: parent.activity.startTime,
        endTime: parent.activity.endTime,
        childActivities: [],
        scrambleSetId: null,
        extensions: [],
      };
      parent.activity.childActivities = [
        ...(parent.activity.childActivities ?? []),
        child,
      ].sort(
        (a, b) =>
          (parseGroupNumber(a.activityCode) ?? 0) -
          (parseGroupNumber(b.activityCode) ?? 0),
      );
      rebalanceChildren(parent.activity);
    }
  }

  return draft;
}

function findGroupActivity(
  wcif: WCIF,
  roundCode: string,
  group: number,
  roomId: number | null,
): { id: number } | null {
  const groups = getGroupActivitiesForRound(wcif, roundCode).filter(
    (g) => parseGroupNumber(g.activity.activityCode) === group,
  );
  if (groups.length === 0) return null;
  if (roomId != null) {
    const match = groups.find((g) => g.roomId === roomId);
    if (match) return { id: match.activity.id };
  }
  if (groups.length === 1) return { id: groups[0]!.activity.id };
  // Ambiguous multi-stage without roomId
  return null;
}

/**
 * Import Round-1 assignment CSV into a WCIF draft.
 */
export function importRound1Assignments(
  wcif: WCIF,
  rows: ImportCsvRow[],
): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (rows.length === 0) {
    return { wcif, applied: 0, warnings, errors: ["El CSV está vacío"] };
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const round = typeof row.round === "string" ? row.round.trim() : "";
    if (!round) {
      errors.push(`Fila ${i + 2}: falta round`);
      continue;
    }
    if (!isRound1(round)) {
      errors.push(
        `Fila ${i + 2}: solo se permite Round 1 (recibido ${round})`,
      );
    }
  }

  if (errors.length > 0) {
    return { wcif, applied: 0, warnings, errors };
  }

  const needs: { round: string; roomId: number | null; group: number }[] = [];
  for (const row of rows) {
    const round = String(row.round).trim();
    const group = Number(row.group);
    if (!Number.isFinite(group) || group < 1) continue;
    const roomId =
      row.roomId != null && row.roomId !== ""
        ? Number(row.roomId)
        : null;
    needs.push({
      round,
      roomId: roomId != null && Number.isFinite(roomId) ? roomId : null,
      group,
    });
  }

  let draft = ensureMissingGroupActivities(wcif, needs);

  // If still no groups for a round referenced, try createGroupsForRound with max
  const rounds = new Set(rows.map((r) => String(r.round).trim()));
  for (const round of rounds) {
    const existing = getGroupActivitiesForRound(draft, round);
    if (existing.length > 0) continue;
    const maxGroup = Math.max(
      ...rows
        .filter((r) => String(r.round).trim() === round)
        .map((r) => Number(r.group) || 0),
      0,
    );
    if (maxGroup < 1) continue;
    try {
      draft = createGroupsForRound(draft, round, {
        spreadAcrossStages: true,
        groupCount: maxGroup,
        timeSplit: true,
      });
    } catch (e) {
      errors.push(
        e instanceof Error
          ? e.message
          : `No se pudieron crear grupos para ${round}`,
      );
    }
  }

  if (errors.length > 0) {
    return { wcif, applied: 0, warnings, errors };
  }

  let applied = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const round = String(row.round).trim();
    const group = Number(row.group);
    const person = resolvePerson(draft, row);
    if (!person) {
      errors.push(
        `Fila ${i + 2}: persona no encontrada (${row.name ?? row.wcaId ?? row.registrantId ?? "?"})`,
      );
      continue;
    }
    if (!Number.isFinite(group) || group < 1) {
      errors.push(`Fila ${i + 2}: grupo inválido`);
      continue;
    }

    const roomId =
      row.roomId != null && row.roomId !== ""
        ? Number(row.roomId)
        : null;
    const activity = findGroupActivity(
      draft,
      round,
      group,
      roomId != null && Number.isFinite(roomId) ? roomId : null,
    );

    if (!activity) {
      const parents = findRoundActivities(draft, round);
      if (parents.length > 1 && roomId == null) {
        errors.push(
          `Fila ${i + 2}: hay varios escenarios; indica roomId para el grupo ${group}`,
        );
      } else {
        errors.push(
          `Fila ${i + 2}: no existe grupo ${group} para ${round}`,
        );
      }
      continue;
    }

    const assignmentCode =
      (typeof row.assignmentCode === "string" && row.assignmentCode.trim()) ||
      "competitor";
    const station =
      row.station != null && row.station !== ""
        ? Number(row.station)
        : null;

    const assignment: Assignment = {
      activityId: activity.id,
      stationNumber:
        station != null && Number.isFinite(station) ? station : null,
      assignmentCode,
    };

    const draftPerson = draft.persons.find(
      (p) => p.wcaUserId === person.wcaUserId,
    );
    if (!draftPerson) continue;

    const groupIds = new Set(
      getGroupActivitiesForRound(draft, round).map((g) => g.activity.id),
    );
    draftPerson.assignments = (draftPerson.assignments ?? []).filter(
      (a) =>
        !(
          groupIds.has(a.activityId) &&
          a.assignmentCode === assignment.assignmentCode
        ),
    );
    draftPerson.assignments.push(assignment);
    applied++;
  }

  if (applied === 0 && errors.length === 0) {
    warnings.push("No se aplicó ninguna fila");
  }

  return { wcif: draft, applied, warnings, errors };
}
