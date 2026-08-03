import { person } from "@workspace/db/schema";
import {
  createSearchParamsCache,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";

export const searchParamsCache = createSearchParamsCache({
  state: parseAsString.withDefault(""),
  gender: parseAsStringEnum(person.gender.enumValues),
});

export type GetRecordsSchema = Awaited<
  ReturnType<typeof searchParamsCache.parse>
>;
