import {
  createSearchParamsCache,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";
import { getFiltersStateParser, getSortingStateParser } from "@/lib/parsers";
import { person } from "@workspace/db/schema";
import { ResultAverage, ResultSingle } from "../_types";

export const searchSingleParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(10),
  sort: getSortingStateParser<ResultSingle>().withDefault([
    { id: "best", desc: false },
  ]),
  index: parseAsInteger.withDefault(1),
  name: parseAsString.withDefault(""),
  state: parseAsArrayOf(parseAsString).withDefault([]),
  gender: parseAsArrayOf(
    parseAsStringEnum(person.gender.enumValues),
  ).withDefault([]),
  asOf: parseAsString.withDefault(""),
  // advanced filter
  filters: getFiltersStateParser().withDefault([]),
  joinOperator: parseAsStringEnum(["and", "or"]).withDefault("and"),
});

export type GetResultSinglesSchema = Awaited<
  ReturnType<typeof searchSingleParamsCache.parse>
>;

export const searchAverageParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(10),
  sort: getSortingStateParser<ResultAverage>().withDefault([
    { id: "average", desc: false },
  ]),
  index: parseAsInteger.withDefault(1),
  name: parseAsString.withDefault(""),
  state: parseAsArrayOf(parseAsString).withDefault([]),
  gender: parseAsArrayOf(
    parseAsStringEnum(person.gender.enumValues),
  ).withDefault([]),
  asOf: parseAsString.withDefault(""),
  // advanced filter
  filters: getFiltersStateParser().withDefault([]),
  joinOperator: parseAsStringEnum(["and", "or"]).withDefault("and"),
});

export type GetResultAveragesSchema = Awaited<
  ReturnType<typeof searchAverageParamsCache.parse>
>;
