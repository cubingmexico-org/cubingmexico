import { createSearchParamsCache, parseAsString } from "nuqs/server";

export const searchParamsCache = createSearchParamsCache({
  state: parseAsString.withDefault(""),
  event: parseAsString.withDefault(""),
});
