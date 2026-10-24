import {
  createSearchParamsCache,
  parseAsString,
  parseAsStringEnum,
} from "nuqs/server";

export const CC_RECORDS_SHOW_MODES = ["current", "history"] as const;

export const searchParamsCache = createSearchParamsCache({
  state: parseAsString.withDefault(""),
  event: parseAsString.withDefault(""),
  show: parseAsStringEnum([...CC_RECORDS_SHOW_MODES]).withDefault("current"),
});
