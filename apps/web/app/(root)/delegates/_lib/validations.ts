import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";
import { getFiltersStateParser, getSortingStateParser } from "@/lib/parsers";
import type { Person } from "../_types";
import { delegate, person } from "@workspace/db/schema";

export const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(10),
  sort: getSortingStateParser<Person>().withDefault([
    { id: "name", desc: false },
  ]),
  name: parseAsString.withDefault(""),
  state: parseAsArrayOf(parseAsString).withDefault([]),
  gender: parseAsArrayOf(
    parseAsStringEnum(person.gender.enumValues),
  ).withDefault([]),
  status: parseAsArrayOf(
    parseAsStringEnum(delegate.status.enumValues),
  ).withDefault([]),
  level: parseAsArrayOf(
    parseAsStringEnum(delegate.level.enumValues),
  ).withDefault([]),
  // advanced filter
  filters: getFiltersStateParser().withDefault([]),
  joinOperator: parseAsStringEnum(["and", "or"]).withDefault("and"),
});

export type GetDelegatesSchema = Awaited<
  ReturnType<typeof searchParamsCache.parse>
>;
