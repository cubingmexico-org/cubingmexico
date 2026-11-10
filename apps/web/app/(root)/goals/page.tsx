import type { Metadata } from "next";
import Link from "next/link";
import { notFound, unauthorized } from "next/navigation";
import { getEvents } from "@/db/queries";
import { getSessionUserId } from "@/lib/team-auth";
import { goalAsOfDay, getGoalViews } from "@/lib/goals/evaluate";
import { MAX_GOALS_PER_YEAR } from "@/lib/goals/types";
import {
  canAccessGoals,
  getSessionEditableGoalYear,
} from "../summary/_lib/summary-access";
import {
  canCompleteGoalYear,
  GOALS_EDIT_DEADLINE_DAY,
  isGoalYearClosed,
  isSummaryYearPublished,
} from "../summary/_lib/summary-year";
import { GoalYearPanel } from "./_components/goal-year-panel";
import { getPersonGoalYears } from "./_lib/queries";

export const metadata: Metadata = {
  title: "Mis metas | Cubing México",
  robots: { index: false, follow: false },
};

export default async function Page() {
  const wcaId = await getSessionUserId();
  if (!wcaId) unauthorized();
  if (!(await canAccessGoals())) notFound();

  const editableYear = await getSessionEditableGoalYear();
  const [events, goalYears] = await Promise.all([
    getEvents("official"),
    getPersonGoalYears(wcaId),
  ]);

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  // The editable year, the running year, and last year while its goals can still be checked off.
  const lastYear = currentYear - 1;
  const showLastYear =
    goalYears.includes(lastYear) && canCompleteGoalYear(lastYear, now);
  const panelYears = [
    ...new Set([editableYear, currentYear, showLastYear ? lastYear : null]),
  ]
    .filter((year): year is number => year !== null)
    .sort((a, b) => b - a);
  const pastYears = goalYears.filter(
    (year) => !panelYears.includes(year) && isSummaryYearPublished(year, now),
  );

  const panels = await Promise.all(
    panelYears.map(async (year) => ({
      year,
      goals: await getGoalViews(wcaId, year, goalAsOfDay(year, now)),
    })),
  );

  return (
    <div className="space-y-10">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Mis metas</h1>
        <p className="text-sm text-muted-foreground">
          Define hasta {MAX_GOALS_PER_YEAR} metas por año entre el 20 de
          diciembre y el {GOALS_EDIT_DEADLINE_DAY} de enero. Se revisan
          automáticamente con tus resultados oficiales de la WCA y aparecen en
          tu resumen anual. Solo tú las ves, a menos que las hagas públicas.
        </p>
      </div>

      {panels.map(({ year, goals }) => (
        <GoalYearPanel
          key={year}
          year={year}
          goals={goals}
          events={events}
          editable={year === editableYear}
          canComplete={canCompleteGoalYear(year, now)}
          yearClosed={isGoalYearClosed(year, now)}
          yearStarted={year <= currentYear}
        />
      ))}

      {pastYears.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Años anteriores</h2>
          <ul className="flex flex-wrap gap-3">
            {pastYears.map((year) => (
              <li key={year}>
                <Link
                  href={`/summary/${year}/${wcaId}`}
                  prefetch={false}
                  className="text-link hover:text-link/80"
                >
                  Resumen {year}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
