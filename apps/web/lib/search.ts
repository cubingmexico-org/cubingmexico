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

function unaccentLower(column: SQLWrapper): SQL {
  return sql`translate(
    lower(${column}),
    'áàäâãéèëêíìïîóòöôõúùüûñç',
    'aaaaaeeeeiiiiooooouuuunc'
  )`;
}

/** Accent-insensitive substring match (replaces `ilike(column, '%value%')`). */
export function accentInsensitiveContains(
  column: SQLWrapper,
  value: string,
): SQL {
  return sql`${unaccentLower(column)} LIKE ${`%${normalizeSearchText(value)}%`}`;
}
