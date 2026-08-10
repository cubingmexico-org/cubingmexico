import { person } from "@workspace/db/schema";
import {
  createSearchParamsCache,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";
import { SHOW_MODES } from "./show-modes";

export { SHOW_MODES, type ShowMode } from "./show-modes";

export const searchParamsCache = createSearchParamsCache({
  state: parseAsString.withDefault(""),
  gender: parseAsStringEnum(person.gender.enumValues),
  event: parseAsString.withDefault(""),
  show: parseAsStringEnum([...SHOW_MODES]).withDefault("mixed"),
});

export type GetRecordsSchema = Awaited<
  ReturnType<typeof searchParamsCache.parse>
>;
