"use cache";

import "server-only";
import { db } from "@workspace/db";
import {
  state,
  person,
  type State,
  organizer,
  competitionOrganizer,
  competition,
} from "@workspace/db/schema";
import {
  organizerLevelFilterSql,
  recentOrganizedCompetitionCountSql,
  type OrganizerLevelFilter,
} from "@/lib/organizer-level";
import {
  and,
  count,
  countDistinct,
  gt,
  eq,
  desc,
  asc,
  inArray,
  sql,
} from "drizzle-orm";
import { accentInsensitiveContains } from "@/lib/search";
import { type GetOrganizersSchema } from "./validations";
import { cacheLife, cacheTag } from "next/cache";

const organizedCompetitionCount = recentOrganizedCompetitionCountSql();
const totalOrganizedCompetitionCount = countDistinct(
  competitionOrganizer.competitionId,
);
const organizerLevel = organizerLevelFilterSql(organizedCompetitionCount);

export async function getOrganizers(input: GetOrganizersSchema) {
  cacheLife("days");
  cacheTag("organizers");

  try {
    const offset = (input.page - 1) * input.perPage;

    const levelFilter =
      input.level.length > 0
        ? sql`${organizerLevel} IN (${sql.join(
            input.level.map((level) => sql`${level}`),
            sql`, `,
          )})`
        : undefined;

    const where = and(
      input.name
        ? accentInsensitiveContains(person.name, input.name)
        : undefined,
      input.state.length > 0 ? inArray(state.name, input.state) : undefined,
      input.gender.length > 0
        ? inArray(person.gender, input.gender)
        : undefined,
    );

    const orderBy =
      input.sort.length > 0
        ? input.sort.map((item) => {
            switch (item.id) {
              case "state":
                return item.desc ? desc(state.name) : asc(state.name);
              case "competitions":
              case "level":
                return item.desc
                  ? desc(organizedCompetitionCount)
                  : asc(organizedCompetitionCount);
              case "totalCompetitions":
                return item.desc
                  ? desc(totalOrganizedCompetitionCount)
                  : asc(totalOrganizedCompetitionCount);
              default:
                return item.desc ? desc(person[item.id]) : asc(person[item.id]);
            }
          })
        : [asc(person.name)];

    const { data, total } = await db.transaction(async (tx) => {
      const data = await tx
        .select({
          wcaId: person.wcaId,
          name: person.name,
          gender: person.gender,
          state: state.name,
          level: organizerLevel.as("level"),
          competitions: organizedCompetitionCount,
          totalCompetitions: totalOrganizedCompetitionCount,
        })
        .from(organizer)
        .innerJoin(
          competitionOrganizer,
          eq(organizer.id, competitionOrganizer.organizerId),
        )
        .innerJoin(
          competition,
          eq(competitionOrganizer.competitionId, competition.id),
        )
        .innerJoin(person, eq(organizer.personId, person.wcaId))
        .leftJoin(state, eq(person.stateId, state.id))
        .limit(input.perPage)
        .offset(offset)
        .where(where)
        .groupBy(person.wcaId, state.name, person.gender)
        .having(levelFilter)
        .orderBy(...orderBy);

      const total = (await tx
        .select({
          count: count(),
        })
        .from(organizer)
        .innerJoin(
          competitionOrganizer,
          eq(organizer.id, competitionOrganizer.organizerId),
        )
        .innerJoin(
          competition,
          eq(competitionOrganizer.competitionId, competition.id),
        )
        .innerJoin(person, eq(organizer.personId, person.wcaId))
        .leftJoin(state, eq(person.stateId, state.id))
        .where(where)
        .groupBy(person.wcaId, state.name, person.gender)
        .having(levelFilter)
        .execute()
        .then((res) => res.length)) as number;

      return {
        data,
        total,
      };
    });

    const pageCount = Math.ceil(total / input.perPage);
    return {
      data: data.map((row) => ({
        ...row,
        level: row.level as OrganizerLevelFilter,
        competitions: Number(row.competitions),
        totalCompetitions: Number(row.totalCompetitions),
      })),
      pageCount,
    };
  } catch (err) {
    console.error(err);
    return { data: [], pageCount: 0 };
  }
}

export async function getOrganizersStateCounts() {
  cacheLife("days");
  cacheTag("organizers-state-counts");

  try {
    return await db
      .select({
        state: state.name,
        count: count(),
      })
      .from(organizer)
      .innerJoin(person, eq(organizer.personId, person.wcaId))
      .leftJoin(state, eq(person.stateId, state.id))
      .groupBy(state.name)
      .having(gt(count(), 0))
      .orderBy(state.name)
      .then((res) =>
        res.reduce(
          (acc, { state, count }) => {
            if (!state) return acc;
            acc[state] = count;
            return acc;
          },
          {} as Record<State["name"], number>,
        ),
      );
  } catch (err) {
    console.error(err);
    return {} as Record<State["name"], number>;
  }
}

export async function getOrganizersGenderCounts() {
  cacheLife("days");
  cacheTag("organizers-gender-counts");

  try {
    return await db
      .select({
        gender: person.gender,
        count: count(),
      })
      .from(organizer)
      .innerJoin(person, eq(organizer.personId, person.wcaId))
      .groupBy(person.gender)
      .having(gt(count(), 0))
      .orderBy(person.gender)
      .then((res) =>
        res.reduce(
          (acc, { gender, count }) => {
            if (!gender) return acc;
            acc[gender] = count;
            return acc;
          },
          {} as Record<string, number>,
        ),
      );
  } catch (err) {
    console.error(err);
    return {} as Record<string, number>;
  }
}

export async function getOrganizerLevelCounts() {
  cacheLife("days");
  cacheTag("organizers-level-counts");

  try {
    const recentCount = recentOrganizedCompetitionCountSql();
    const innerLevel = organizerLevelFilterSql(recentCount);

    const rows = (await db.execute(sql`
      SELECT level, COUNT(*)::int AS count
      FROM (
        SELECT ${innerLevel} AS level
        FROM ${organizer}
        INNER JOIN ${competitionOrganizer}
          ON ${competitionOrganizer.organizerId} = ${organizer.id}
        INNER JOIN ${competition}
          ON ${competition.id} = ${competitionOrganizer.competitionId}
        INNER JOIN ${person}
          ON ${organizer.personId} = ${person.wcaId}
        GROUP BY ${person.wcaId}
      ) AS organizers_by_level
      GROUP BY level
      ORDER BY CASE level
        WHEN 'Debutante' THEN 1
        WHEN 'Super' THEN 2
        WHEN 'Experto' THEN 3
        WHEN 'Maestro' THEN 4
        WHEN 'Leyenda' THEN 5
        WHEN 'Inactivo' THEN 6
      END
    `)) as unknown as { level: OrganizerLevelFilter; count: number }[];

    return rows.reduce(
      (acc, { level, count }) => {
        acc[level] = count;
        return acc;
      },
      {} as Record<OrganizerLevelFilter, number>,
    );
  } catch (err) {
    console.error(err);
    return {} as Record<OrganizerLevelFilter, number>;
  }
}
