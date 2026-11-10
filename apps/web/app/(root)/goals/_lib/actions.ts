"use server";

import { db } from "@workspace/db";
import { event, goal, person, type Goal } from "@workspace/db/schema";
import { and, eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { unauthorized } from "next/navigation";
import {
  createGoal,
  deleteGoal,
  setGoalCompleted,
  setGoalPublic,
  updateGoal,
} from "@/db/mutations";
import { canEditGoals } from "@/app/(root)/summary/_lib/summary-access";
import { canCompleteGoalYear } from "@/app/(root)/summary/_lib/summary-year";
import { personGoalsTag } from "@/lib/cache-tag-names";
import {
  goalEventId,
  goalTargetSchema,
  MAX_GOALS_PER_YEAR,
  type GoalTarget,
} from "@/lib/goals/types";
import { isOfficialEvent } from "@/lib/official-events";
import { getSessionUserId } from "@/lib/team-auth";
import { z } from "zod";

export type GoalActionResult = { ok: true } | { ok: false; error: string };

const EDIT_CLOSED =
  "Las metas de este año ya no se pueden modificar. Se pueden definir del 20 de diciembre al 31 de enero.";

async function requireUserId(): Promise<string> {
  const userId = await getSessionUserId();
  if (!userId) unauthorized();
  return userId;
}

/** The goal, if the signed-in person owns it; otherwise a 401. */
async function requireOwnGoal(goalId: unknown): Promise<Goal> {
  const userId = await requireUserId();
  const id = z.uuid().safeParse(goalId);
  if (!id.success) unauthorized();

  const [row] = await db
    .select()
    .from(goal)
    .where(eq(goal.id, id.data))
    .limit(1);
  if (!row || row.personId !== userId) unauthorized();
  return row;
}

/** Null when the target is valid, else the Spanish error to show. */
async function validateTarget(target: GoalTarget): Promise<string | null> {
  const eventId = goalEventId(target);
  if (eventId) {
    const [official] = await db
      .select({ id: event.id })
      .from(event)
      .where(and(eq(event.id, eventId), isOfficialEvent))
      .limit(1);
    if (!official) return "Elige un evento oficial.";
    if (
      eventId === "333mbf" &&
      (target.type === "result" || target.type === "rank") &&
      target.kind === "average"
    ) {
      return "3x3x3 Multi-Blind no tiene promedio.";
    }
  }
  return null;
}

function parseTarget(
  input: unknown,
): { ok: true; target: GoalTarget } | { ok: false; error: string } {
  const parsed = goalTargetSchema.safeParse(input);
  return parsed.success
    ? { ok: true, target: parsed.data }
    : { ok: false, error: "Revisa los datos de la meta." };
}

export async function createGoalAction(
  year: unknown,
  input: unknown,
): Promise<GoalActionResult> {
  const userId = await requireUserId();
  const goalYear = z.number().int().safeParse(year);
  if (!goalYear.success || !(await canEditGoals(goalYear.data))) {
    return { ok: false, error: EDIT_CLOSED };
  }

  const parsed = parseTarget(input);
  if (!parsed.ok) return parsed;
  const invalid = await validateTarget(parsed.target);
  if (invalid) return { ok: false, error: invalid };

  const [personRow] = await db
    .select({ wcaId: person.wcaId })
    .from(person)
    .where(eq(person.wcaId, userId))
    .limit(1);
  if (!personRow) {
    return { ok: false, error: "No encontramos tu perfil de la WCA." };
  }

  const created = await createGoal({
    personId: userId,
    year: goalYear.data,
    target: parsed.target,
    limit: MAX_GOALS_PER_YEAR,
  });
  if (!created) {
    return {
      ok: false,
      error: `Puedes tener hasta ${MAX_GOALS_PER_YEAR} metas por año.`,
    };
  }

  updateTag(personGoalsTag(userId, goalYear.data));
  return { ok: true };
}

export async function updateGoalAction(
  goalId: unknown,
  input: unknown,
): Promise<GoalActionResult> {
  const row = await requireOwnGoal(goalId);
  if (!(await canEditGoals(row.year))) return { ok: false, error: EDIT_CLOSED };

  const parsed = parseTarget(input);
  if (!parsed.ok) return parsed;
  const invalid = await validateTarget(parsed.target);
  if (invalid) return { ok: false, error: invalid };

  await updateGoal({ id: row.id, target: parsed.target });
  updateTag(personGoalsTag(row.personId, row.year));
  return { ok: true };
}

export async function deleteGoalAction(
  goalId: unknown,
): Promise<GoalActionResult> {
  const row = await requireOwnGoal(goalId);
  if (!(await canEditGoals(row.year))) return { ok: false, error: EDIT_CLOSED };

  await deleteGoal(row.id);
  updateTag(personGoalsTag(row.personId, row.year));
  return { ok: true };
}

export async function setGoalPublicAction(
  goalId: unknown,
  isPublic: unknown,
): Promise<GoalActionResult> {
  const row = await requireOwnGoal(goalId);
  if (typeof isPublic !== "boolean") {
    return { ok: false, error: "Valor inválido." };
  }

  await setGoalPublic({ id: row.id, isPublic });
  updateTag(personGoalsTag(row.personId, row.year));
  return { ok: true };
}

export async function setGoalCompletedAction(
  goalId: unknown,
  completed: unknown,
): Promise<GoalActionResult> {
  const row = await requireOwnGoal(goalId);
  if (typeof completed !== "boolean") {
    return { ok: false, error: "Valor inválido." };
  }
  if (row.type !== "custom") {
    return {
      ok: false,
      error: "Esta meta se revisa automáticamente con tus resultados.",
    };
  }
  if (!canCompleteGoalYear(row.year)) {
    return {
      ok: false,
      error: "Ya no puedes cambiar el estado de las metas de ese año.",
    };
  }

  await setGoalCompleted({ id: row.id, completed });
  updateTag(personGoalsTag(row.personId, row.year));
  return { ok: true };
}
