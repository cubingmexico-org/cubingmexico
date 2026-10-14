import { event } from "@workspace/db/schema";
import { between, lt, or, sql, type SQL, type SQLWrapper } from "drizzle-orm";
import {
  DEPRECATED_EVENT_IDS,
  DEPRECATED_EVENT_MAX_RANK,
  DEPRECATED_EVENT_MIN_RANK,
  OFFICIAL_EVENT_MAX_RANK,
  type EventScope,
} from "@/lib/constants";

/** For queries that already join `events`. */
export const isOfficialEvent: SQL = lt(event.rank, OFFICIAL_EVENT_MAX_RANK);

/** Parenthesized subquery of official event ids, for raw SQL. */
export const officialEventIdsSql: SQL = sql`(SELECT id FROM events WHERE rank < ${OFFICIAL_EVENT_MAX_RANK})`;

export function inOfficialEvents(column: SQLWrapper): SQL {
  return sql`${column} IN ${officialEventIdsSql}`;
}

export function eventScopeFromDeprecated(
  includeDeprecated: boolean,
): EventScope {
  return includeDeprecated ? "all" : "official";
}

/** For queries that already join `events`. */
export function eventScopeFilter(scope: EventScope): SQL {
  if (scope === "official") return isOfficialEvent;
  return or(
    lt(event.rank, OFFICIAL_EVENT_MAX_RANK),
    between(event.rank, DEPRECATED_EVENT_MIN_RANK, DEPRECATED_EVENT_MAX_RANK),
  )!;
}

/** Parenthesized subquery of the scope's event ids, for raw SQL. */
export function eventIdsSql(scope: EventScope): SQL {
  if (scope === "official") return officialEventIdsSql;
  return sql`(SELECT id FROM events WHERE rank < ${OFFICIAL_EVENT_MAX_RANK} OR rank BETWEEN ${DEPRECATED_EVENT_MIN_RANK} AND ${DEPRECATED_EVENT_MAX_RANK})`;
}

export function inScopeEvents(column: SQLWrapper, scope: EventScope): SQL {
  return sql`${column} IN ${eventIdsSql(scope)}`;
}

/** Event ids with a column in cross-event tables: like `eventIdsSql`, minus 333mbo. */
export function crossEventIdsSql(scope: EventScope): SQL {
  if (scope === "official") return officialEventIdsSql;
  return sql`(SELECT id FROM events WHERE rank < ${OFFICIAL_EVENT_MAX_RANK} OR id IN (${sql.join(
    DEPRECATED_EVENT_IDS.map((id) => sql`${id}`),
    sql`, `,
  )}))`;
}
