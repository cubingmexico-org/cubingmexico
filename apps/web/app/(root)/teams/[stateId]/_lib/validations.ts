import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";
import { getFiltersStateParser, getSortingStateParser } from "@/lib/parsers";
import type { Member } from "../_types";
import { person } from "@workspace/db/schema";

export const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(10),
  sort: getSortingStateParser<Member>().withDefault([
    { id: "name", desc: false },
  ]),
  name: parseAsString.withDefault(""),
  gender: parseAsArrayOf(
    parseAsStringEnum(person.gender.enumValues),
  ).withDefault([]),
  specialties: parseAsArrayOf(parseAsString).withDefault([]),
  // advanced filter
  filters: getFiltersStateParser().withDefault([]),
  joinOperator: parseAsStringEnum(["and", "or"]).withDefault("and"),
});

export type GetMembersSchema = Awaited<
  ReturnType<typeof searchParamsCache.parse>
>;
