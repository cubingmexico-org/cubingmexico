"use cache";

import "server-only";
import { db } from "@workspace/db";
import {
  competition,
  state,
  type State,
  event,
  type Event,
  competitionEvent,
  championship,
} from "@workspace/db/schema";
import {
  and,
  asc,
  count,
  desc,
  sql,
  gt,
  inArray,
  gte,
  lte,
  eq,
  lt,
} from "drizzle-orm";
import { accentInsensitiveContains } from "@/lib/search";
import { type GetCompetitionsSchema } from "./validations";
import { cacheLife, cacheTag } from "next/cache";

export async function getCompetitions(input: GetCompetitionsSchema) {
  cacheLife("days");
  cacheTag("competitions");

  try {
    const offset = (input.page - 1) * input.perPage;
    const fromDate = input.from ? new Date(input.from) : undefined;
    const toDate = input.to ? new Date(input.to) : undefined;

    const where = and(
      eq(competition.countryId, "Mexico"),
      input.name
        ? accentInsensitiveContains(competition.name, input.name)
        : undefined,
      input.state.length > 0 ? inArray(state.name, input.state) : undefined,
      input.events.length > 0 ? inArray(event.name, input.events) : undefined,
      input.status.length > 0
        ? inArray(
            sql`
            CASE
              WHEN ${competition.startDate} > NOW() THEN 'upcoming'
              WHEN ${competition.endDate} + INTERVAL '1 day' < NOW() THEN 'past'
              ELSE 'in_progress'
            END
          `,
            input.status,
          )
        : undefined,
      fromDate ? gte(competition.startDate, fromDate) : undefined,
      toDate ? lte(competition.endDate, toDate) : undefined,
    );

    const orderBy =
      input.sort.length > 0
        ? input.sort.map((item) => {
            switch (item.id) {
              case "state":
                return item.desc ? desc(state.name) : asc(state.name);
              case "events":
                return item.desc
                  ? desc(count(competitionEvent.eventId))
                  : asc(count(competitionEvent.eventId));
              case "startDate":
                return item.desc
                  ? desc(competition.startDate)
                  : asc(competition.startDate);
              case "endDate":
                return item.desc
                  ? desc(competition.endDate)
                  : asc(competition.endDate);
              case "status":
                return item.desc
                  ? desc(sql`
                        CASE
                          WHEN ${competition.startDate} > NOW() THEN 'upcoming'
                          WHEN ${competition.endDate} + INTERVAL '1 day' < NOW() THEN 'past'
                          ELSE 'in_progress'
                        END`)
                  : asc(
                      sql`
                        CASE
                          WHEN ${competition.startDate} > NOW() THEN 'upcoming'
                          WHEN ${competition.endDate} + INTERVAL '1 day' < NOW() THEN 'past'
                          ELSE 'in_progress'
                        END`,
                    );
              case "isChampionship":
                return item.desc
                  ? desc(championship.competitionId)
                  : asc(championship.competitionId);
              default:
                return item.desc
                  ? desc(competition[item.id])
                  : asc(competition[item.id]);
            }
          })
        : [asc(competition.startDate)];

    const { data, total } = await db.transaction(async (tx) => {
      const data = await tx
        .select({
          id: competition.id,
          name: competition.name,
          state: state.name,
          startDate: competition.startDate,
          endDate: competition.endDate,
          events: sql`array_agg(${event.id} ORDER BY ${event.rank})`.as(
            "events",
          ),
          status: sql`
                CASE
                  WHEN ${competition.startDate} > NOW() THEN 'upcoming'
                  WHEN ${competition.endDate} + INTERVAL '1 day' < NOW() THEN 'past'
                  ELSE 'in_progress'
                END
              `.as("status"),
          isChampionship: sql`
                CASE
                  WHEN ${championship.competitionId} IS NOT NULL THEN true
                  ELSE false
                END
              `.as("isChampionship"),
        })
        .from(competition)
        .leftJoin(state, eq(competition.stateId, state.id))
        .leftJoin(
          competitionEvent,
          eq(competition.id, competitionEvent.competitionId),
        )
        .leftJoin(event, eq(competitionEvent.eventId, event.id))
        .leftJoin(championship, eq(competition.id, championship.competitionId))
        .limit(input.perPage)
        .offset(offset)
        .where(where)
        .groupBy(
          competition.id,
          state.name,
          competition.startDate,
          competition.endDate,
          championship.competitionId,
        )
        .orderBy(...orderBy);

      const total = (await tx
        .select({
          count: sql`COUNT(DISTINCT ${competition.id})`.as("count"),
        })
        .from(competition)
        .leftJoin(state, eq(competition.stateId, state.id))
        .leftJoin(
          competitionEvent,
          eq(competition.id, competitionEvent.competitionId),
        )
        .leftJoin(event, eq(competitionEvent.eventId, event.id))
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

export async function getCompetitionsStateCounts() {
  cacheLife("days");
  cacheTag("competitions-state-counts");

  try {
    return await db
      .select({
        state: state.name,
        count: count(),
      })
      .from(competition)
      .innerJoin(state, eq(competition.stateId, state.id))
      .groupBy(state.name)
      .having(gt(count(), 0))
      .orderBy(state.name)
      .then((res) =>
        res.reduce(
          (acc, { state, count }) => {
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

export async function getCompetitionsEventCounts() {
  cacheLife("days");
  cacheTag("competitions-event-counts");

  try {
    return await db
      .select({
        event: event.name,
        count: count(),
      })
      .from(competitionEvent)
      .innerJoin(event, eq(competitionEvent.eventId, event.id))
      .innerJoin(
        competition,
        eq(competitionEvent.competitionId, competition.id),
      )
      .where(and(eq(competition.countryId, "Mexico"), lt(event.rank, 200)))
      .groupBy(event.name, event.rank)
      .having(gt(count(), 0))
      .orderBy(event.rank) // Changed to order by event.rank
      .then((res) =>
        res.reduce(
          (acc, { event, count }) => {
            acc[event] = count;
            return acc;
          },
          {} as Record<Event["name"], number>,
        ),
      );
  } catch (err) {
    console.error(err);
    return {} as Record<Event["name"], number>;
  }
}

export async function getCompetitionsStatusCounts() {
  cacheLife("days");
  cacheTag("competitions-status-counts");

  try {
    return await db
      .select({
        status: sql`
              CASE
                WHEN ${competition.startDate} > NOW() THEN 'upcoming'
                WHEN ${competition.endDate} + INTERVAL '1 day' < NOW() THEN 'past'
                ELSE 'in_progress'
              END
            `.as("status"),
        count: count(),
      })
      .from(competition)
      .where(eq(competition.countryId, "Mexico"))
      .groupBy(sql`status`)
      .having(gt(count(), 0))
      .orderBy(sql`status`)
      .then((res) =>
        res.reduce(
          (acc, { status, count }) => {
            acc[status as "past" | "in_progress" | "upcoming"] = count;
            return acc;
          },
          {} as Record<"past" | "in_progress" | "upcoming", number>,
        ),
      );
  } catch (err) {
    console.error(err);
    return {} as Record<"past" | "in_progress" | "upcoming", number>;
  }
}

export async function getCompetitionsLocations(input: GetCompetitionsSchema) {
  cacheLife("days");
  cacheTag("competitions-locations");

  try {
    const fromDate = input.from ? new Date(input.from) : undefined;
    const toDate = input.to ? new Date(input.to) : undefined;

    const where = and(
      eq(competition.countryId, "Mexico"),
      input.name
        ? accentInsensitiveContains(competition.name, input.name)
        : undefined,
      input.state.length > 0 ? inArray(state.name, input.state) : undefined,
      input.events.length > 0 ? inArray(event.name, input.events) : undefined,
      input.status.length > 0
        ? inArray(
            sql`
            CASE
              WHEN ${competition.startDate} > NOW() THEN 'upcoming'
              WHEN ${competition.endDate} + INTERVAL '1 day' < NOW() THEN 'past'
              ELSE 'in_progress'
            END
          `,
            input.status,
          )
        : undefined,
      fromDate ? gte(competition.startDate, fromDate) : undefined,
      toDate ? lte(competition.endDate, toDate) : undefined,
    );

    const data = await db
      .select({
        id: competition.id,
        name: competition.name,
        stateId: competition.stateId,
        stateName: state.name,
        latitude: competition.latitudeMicrodegrees,
        longitude: competition.longitudeMicrodegrees,
      })
      .from(competition)
      .leftJoin(state, eq(competition.stateId, state.id))
      .where(where)
      .groupBy(
        competition.id,
        state.name,
        competition.latitudeMicrodegrees,
        competition.longitudeMicrodegrees,
      );

    return data;
  } catch (err) {
    console.error(err);
    return [];
  }
}
