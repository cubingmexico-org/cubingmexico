import { sql, type SQL, type SQLWrapper } from "drizzle-orm";

/**
 * Lowercases and strips Spanish diacritics in SQL. The site search queries and
 * the trigram indexes in `schema.ts` both use this, so Postgres can match the
 * query expression to the indexed one.
 */
export function unaccentLower(column: SQLWrapper): SQL {
  return sql`translate(lower(${column}), 'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc')`;
}
