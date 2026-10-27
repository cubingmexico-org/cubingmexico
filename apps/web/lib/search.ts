import { unaccentLower } from "@workspace/db/search-sql";
import { sql, type SQL, type SQLWrapper } from "drizzle-orm";

/** Lowercase and strip diacritics so "mexico" matches "México". */
export function normalizeSearchText(value: string | null | undefined): string {
  return value
    ? value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
    : "";
}

/** Escapes LIKE wildcards so user input matches literally (`\` is Postgres' default LIKE escape). */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

/** Accent-insensitive substring match (replaces `ilike(column, '%value%')`). */
export function accentInsensitiveContains(
  column: SQLWrapper,
  value: string,
): SQL {
  return sql`${unaccentLower(column)} LIKE ${`%${escapeLike(normalizeSearchText(value))}%`}`;
}
