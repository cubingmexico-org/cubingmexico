import "server-only";

import { db } from "@workspace/db";
import {
  competition,
  competitionDelegate,
  competitionOrganizer,
  delegate,
  organizer,
  person,
} from "@workspace/db/schema";
import type { DelegateLevel } from "@/lib/delegate-level";
import { and, asc, countDistinct, desc, eq } from "drizzle-orm";
import { type TeamSummaryContext } from "./context";
import type { TeamSummaryNewDelegate } from "../types";

export function queryStaffSection({
  stateId,
  hostedYearFilter,
}: TeamSummaryContext) {
  return Promise.all([
    // Delegate candidates for new-delegate heuristic
    db
      .select({
        wcaId: person.wcaId,
        name: person.name,
        gender: person.gender,
        level: delegate.level,
        competitionId: competition.id,
        competitionName: competition.name,
        startDate: competition.startDate,
      })
      .from(delegate)
      .innerJoin(person, eq(delegate.personId, person.wcaId))
      .innerJoin(
        competitionDelegate,
        eq(competitionDelegate.delegateId, delegate.id),
      )
      .innerJoin(
        competition,
        eq(competitionDelegate.competitionId, competition.id),
      )
      .where(eq(person.stateId, stateId))
      .orderBy(asc(competition.startDate), asc(person.name)),

    // Team organizers of hosted comps
    db
      .select({
        wcaId: person.wcaId,
        name: person.name,
        competitions: countDistinct(competition.id),
      })
      .from(organizer)
      .innerJoin(person, eq(organizer.personId, person.wcaId))
      .innerJoin(
        competitionOrganizer,
        eq(competitionOrganizer.organizerId, organizer.id),
      )
      .innerJoin(
        competition,
        eq(competitionOrganizer.competitionId, competition.id),
      )
      .where(and(hostedYearFilter, eq(person.stateId, stateId)))
      .groupBy(person.wcaId, person.name)
      .orderBy(desc(countDistinct(competition.id)), asc(person.name)),

    // Team delegates of hosted comps
    db
      .select({
        wcaId: person.wcaId,
        name: person.name,
        competitions: countDistinct(competition.id),
      })
      .from(delegate)
      .innerJoin(person, eq(delegate.personId, person.wcaId))
      .innerJoin(
        competitionDelegate,
        eq(competitionDelegate.delegateId, delegate.id),
      )
      .innerJoin(
        competition,
        eq(competitionDelegate.competitionId, competition.id),
      )
      .where(and(hostedYearFilter, eq(person.stateId, stateId)))
      .groupBy(person.wcaId, person.name)
      .orderBy(desc(countDistinct(competition.id)), asc(person.name)),
  ]);
}

export function buildNewDelegates(
  newDelegateCandidates: Awaited<ReturnType<typeof queryStaffSection>>[0],
  yearStart: Date,
  yearEnd: Date,
): TeamSummaryNewDelegate[] {
  // New delegates: first competition_delegates appearance in this year
  const firstDelegateByPerson = new Map<
    string,
    (typeof newDelegateCandidates)[number]
  >();
  for (const row of newDelegateCandidates) {
    if (!firstDelegateByPerson.has(row.wcaId)) {
      firstDelegateByPerson.set(row.wcaId, row);
    }
  }
  const newDelegates: TeamSummaryNewDelegate[] = Array.from(
    firstDelegateByPerson.values(),
  )
    .filter((row) => {
      const startMs = new Date(row.startDate).getTime();
      return startMs >= yearStart.getTime() && startMs < yearEnd.getTime();
    })
    .map((row) => ({
      wcaId: row.wcaId,
      name: row.name,
      level: (row.level as DelegateLevel | null) ?? null,
      gender: row.gender,
      firstCompetitionId: row.competitionId,
      firstCompetitionName: row.competitionName,
      firstCompetitionDate: String(row.startDate),
    }))
    .sort((a, b) => (a.name ?? a.wcaId).localeCompare(b.name ?? b.wcaId, "es"));

  return newDelegates;
}
