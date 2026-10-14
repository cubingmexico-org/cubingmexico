import { event } from "@workspace/db/schema";
import { lt, sql, type SQL, type SQLWrapper } from "drizzle-orm";
import { OFFICIAL_EVENT_MAX_RANK } from "@/lib/constants";

/** For queries that already join `events`. */
export const isOfficialEvent: SQL = lt(event.rank, OFFICIAL_EVENT_MAX_RANK);

/** Parenthesized subquery of official event ids, for raw SQL. */
export const officialEventIdsSql: SQL = sql`(SELECT id FROM events WHERE rank < ${OFFICIAL_EVENT_MAX_RANK})`;

export function inOfficialEvents(column: SQLWrapper): SQL {
  return sql`${column} IN ${officialEventIdsSql}`;
}
