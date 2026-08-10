"use cache";

import "server-only";
import { db } from "@workspace/db";
import {
  state,
  person,
  type State,
  delegate,
  competitionDelegate,
} from "@workspace/db/schema";
import {
  and,
  count,
  gt,
  eq,
  desc,
  asc,
  inArray,
  countDistinct,
} from "drizzle-orm";
import { accentInsensitiveContains } from "@/lib/search";
import { type GetDelegatesSchema } from "./validations";
import { cacheLife, cacheTag } from "next/cache";
import type { DelegateLevel } from "@/lib/delegate-level";

export async function getDelegates(input: GetDelegatesSchema) {
  cacheLife("days");
  cacheTag("delegates");

  try {
    const offset = (input.page - 1) * input.perPage;

    const where = and(
      input.name
        ? accentInsensitiveContains(person.name, input.name)
        : undefined,
      input.state.length > 0 ? inArray(state.name, input.state) : undefined,
      input.status.length > 0
        ? inArray(delegate.status, input.status)
        : undefined,
      input.gender.length > 0
        ? inArray(person.gender, input.gender)
        : undefined,
      input.level.length > 0 ? inArray(delegate.level, input.level) : undefined,
    );

    const orderBy =
      input.sort.length > 0
        ? input.sort.map((item) => {
            switch (item.id) {
              case "state":
                return item.desc ? desc(state.name) : asc(state.name);
              case "competitions":
                return item.desc
                  ? desc(countDistinct(competitionDelegate.competitionId))
                  : asc(countDistinct(competitionDelegate.competitionId));
              case "status":
                return item.desc ? desc(delegate.status) : asc(delegate.status);
              case "level":
                return item.desc ? desc(delegate.level) : asc(delegate.level);
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
          status: delegate.status,
          level: delegate.level,
          competitions: countDistinct(competitionDelegate.competitionId),
        })
        .from(delegate)
        .innerJoin(
          competitionDelegate,
          eq(delegate.id, competitionDelegate.delegateId),
        )
        .innerJoin(person, eq(delegate.personId, person.wcaId))
        .leftJoin(state, eq(person.stateId, state.id))
        .limit(input.perPage)
        .offset(offset)
        .where(where)
        .groupBy(person.wcaId, state.name, delegate.status, delegate.level)
        .orderBy(...orderBy);

      const total = (await tx
        .select({
          count: count(),
        })
        .from(delegate)
        .innerJoin(
          competitionDelegate,
          eq(delegate.id, competitionDelegate.delegateId),
        )
        .innerJoin(person, eq(delegate.personId, person.wcaId))
        .leftJoin(state, eq(person.stateId, state.id))
        .where(where)
        .groupBy(person.wcaId, state.name, delegate.status, delegate.level)
        .execute()
        .then((res) => res.length)) as number;

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

export async function getDelegatesStateCounts() {
  cacheLife("days");
  cacheTag("delegates-state-counts");

  try {
    return await db
      .select({
        state: state.name,
        count: count(),
      })
      .from(delegate)
      .innerJoin(person, eq(delegate.personId, person.wcaId))
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

export async function getDelegatesGenderCounts() {
  cacheLife("days");
  cacheTag("delegates-gender-counts");

  try {
    return await db
      .select({
        gender: person.gender,
        count: count(),
      })
      .from(delegate)
      .innerJoin(person, eq(delegate.personId, person.wcaId))
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

export async function getDelegateStatusCounts() {
  cacheLife("days");
  cacheTag("delegates-status-counts");

  try {
    return await db
      .select({
        status: delegate.status,
        count: count(),
      })
      .from(delegate)
      .groupBy(delegate.status)
      .having(gt(count(), 0))
      .orderBy(delegate.status)
      .then((res) =>
        res.reduce(
          (acc, { status, count }) => {
            if (!status) return acc;
            acc[status] = count;
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

export async function getDelegateLevelCounts() {
  cacheLife("days");
  cacheTag("delegates-level-counts");

  try {
    return await db
      .select({
        level: delegate.level,
        count: count(),
      })
      .from(delegate)
      .groupBy(delegate.level)
      .having(gt(count(), 0))
      .orderBy(delegate.level)
      .then((res) =>
        res.reduce(
          (acc, { level, count }) => {
            if (!level) return acc;
            acc[level] = count;
            return acc;
          },
          {} as Record<DelegateLevel, number>,
        ),
      );
  } catch (err) {
    console.error(err);
    return {} as Record<DelegateLevel, number>;
  }
}
