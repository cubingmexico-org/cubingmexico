import "server-only";
import { person, state } from "@workspace/db/schema";
import { and, inArray } from "drizzle-orm";
import { accentInsensitiveContains } from "@/lib/search";

export function personFilterWhere(input: {
  name: string;
  state: string[];
  gender: ("m" | "f" | "o")[];
}) {
  return and(
    input.name ? accentInsensitiveContains(person.name, input.name) : undefined,
    input.state.length > 0 ? inArray(state.name, input.state) : undefined,
    input.gender.length > 0 ? inArray(person.gender, input.gender) : undefined,
  );
}

export function countsByKey<K extends string>(
  rows: { key: K | null; count: number }[],
): Record<K, number> {
  return rows.reduce(
    (acc, { key, count }) => {
      if (!key) return acc;
      acc[key] = count;
      return acc;
    },
    {} as Record<K, number>,
  );
}
