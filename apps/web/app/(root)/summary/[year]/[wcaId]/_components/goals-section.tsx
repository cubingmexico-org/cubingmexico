import Link from "next/link";
import { Target } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { getSessionUserId } from "@/lib/team-auth";
import { goalAsOfDay, getGoalViews } from "@/lib/goals/evaluate";
import {
  GoalStatusBadge,
  goalStatus,
} from "@/app/(root)/goals/_components/goal-status-badge";
import {
  canAccessGoals,
  getSessionEditableGoalYear,
} from "../../../_lib/summary-access";
import { isGoalYearClosed } from "../../../_lib/summary-year";

/**
 * Reads the session, so it renders outside the cached summary: the owner sees
 * every goal of the year, everyone else only the public ones.
 */
export async function GoalsSection({
  year,
  wcaId,
}: {
  year: number;
  wcaId: string;
}) {
  const viewerId = await getSessionUserId();
  if (!(await canAccessGoals())) return null;

  const isOwner = viewerId === wcaId;
  const editableYear = isOwner ? await getSessionEditableGoalYear() : null;
  const now = new Date();

  const allGoals = await getGoalViews(wcaId, year, goalAsOfDay(year, now));
  const goals = isOwner ? allGoals : allGoals.filter((g) => g.isPublic);
  const showNextYearCta = isOwner && editableYear === year + 1;
  if (goals.length === 0 && !showNextYearCta) return null;

  const yearClosed = isGoalYearClosed(year, now);
  const achieved = goals.filter((g) => g.achieved).length;

  return (
    <section className="space-y-3 max-w-4xl mx-auto w-full">
      {goals.length > 0 && (
        <>
          <h2 className="text-xl font-semibold">Metas {year}</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            {achieved} de {goals.length}{" "}
            {goals.length === 1 ? "meta cumplida" : "metas cumplidas"}
            {yearClosed ? "." : " hasta ahora."}
            {isOwner && allGoals.some((g) => !g.isPublic) && (
              <> Solo tú ves las metas privadas.</>
            )}
          </p>
          <ul className="space-y-2">
            {goals.map((goal) => (
              <li
                key={goal.id}
                className="flex flex-wrap items-start justify-between gap-2 rounded-lg border p-3"
              >
                <div className="space-y-1">
                  <p className="font-medium">{goal.label}</p>
                  {goal.progress && (
                    <p className="text-sm text-muted-foreground">
                      {goal.progress}
                    </p>
                  )}
                </div>
                <GoalStatusBadge
                  status={goalStatus(goal.achieved, yearClosed)}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {showNextYearCta && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-4">
          <p className="text-sm sm:text-base">
            ¿Qué quieres lograr en {year + 1}? Define tus metas y revisa en tu
            próximo resumen si las cumpliste.
          </p>
          <Button asChild>
            <Link href="/goals" prefetch={false}>
              <Target className="size-4" />
              Define tus metas para {year + 1}
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}
