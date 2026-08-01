"use cache";

import "server-only";
import { db } from "@workspace/db";
import { type Person, person, result, teamMember } from "@workspace/db/schema";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  sql,
} from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { type GetMembersSchema } from "../../_lib/validations";

export async function getMembersPageData(
  input: GetMembersSchema,
  stateId: string,
) {
  return Promise.all([
    getMembers(input, stateId),
    getMembersGenderCounts(stateId),
  ]);
}

async function getMembers(input: GetMembersSchema, stateId: Person["stateId"]) {
  cacheLife("days");
  cacheTag(`members-list-${stateId}`);

  try {
    const offset = (input.page - 1) * input.perPage;

    const where = and(
      eq(person.stateId, stateId!),
      input.name ? ilike(person.name, `%${input.name}%`) : undefined,
      input.gender.length > 0
        ? inArray(person.gender, input.gender)
        : undefined,
    );

    const orderBy =
      input.sort.length > 0
        ? input.sort.map((item) => {
            switch (item.id) {
              case "isAdmin":
                return item.desc
                  ? desc(teamMember.isAdmin)
                  : asc(teamMember.isAdmin);
              case "stateRecords":
                return item.desc
                  ? desc(sql`"state_records"`)
                  : asc(sql`"state_records"`);
              case "podiums":
                return item.desc ? desc(sql`"podiums"`) : asc(sql`"podiums"`);
              case "specialties":
                return item.desc
                  ? desc(teamMember.specialties)
                  : asc(teamMember.specialties);
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
          isAdmin: teamMember.isAdmin,
          podiums: count(
            sql`CASE 
                      WHEN ${result.roundTypeId} IN ('f', 'c') 
                      AND ${result.pos} IN (1, 2, 3) 
                      AND ${result.best} > 0 
                      THEN 1 
                    END`,
          ).as("podiums"),
          stateRecords: sql`(
                SELECT CAST((
                  (SELECT COUNT(*)
                    FROM ranks_single
                    WHERE person_id = ${person.wcaId}
                    AND state_rank = 1)
                  +
                  (SELECT COUNT(*)
                    FROM ranks_average
                    WHERE person_id = ${person.wcaId}
                    AND state_rank = 1)
                ) AS INTEGER) AS state_records
              )`.as("state_records"),
          specialties: teamMember.specialties,
        })
        .from(person)
        .leftJoin(teamMember, eq(person.wcaId, teamMember.personId))
        .innerJoin(result, eq(person.wcaId, result.personId))
        .limit(input.perPage)
        .offset(offset)
        .where(where)
        .groupBy(
          person.wcaId,
          person.name,
          person.gender,
          teamMember.isAdmin,
          teamMember.specialties,
        )
        .orderBy(...orderBy);

      const total = (await tx
        .select({
          count: count(),
        })
        .from(person)
        .leftJoin(teamMember, eq(person.wcaId, teamMember.personId))
        .where(where)
        .execute()
        .then((res) => res[0]?.count ?? 0)) as number;

      return {
        data,
        total,
      };
    });

    const pageCount = Math.ceil(total / input.perPage);
    return { data, pageCount };
  } catch (err) {
    console.error(err);
    return { data: [], pageCount: 0 };
  }
}

async function getMembersGenderCounts(stateId: Person["stateId"]) {
  cacheLife("days");
  cacheTag(`members-gender-count-${stateId}`);

  try {
    return await db
      .select({
        gender: person.gender,
        count: count(),
      })
      .from(person)
      .where(eq(person.stateId, stateId!))
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
