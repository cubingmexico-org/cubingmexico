import { createSearchParamsCache, parseAsStringEnum } from "nuqs/server";
import { MOLLERZ_SCOPES } from "./scopes";

export { MOLLERZ_SCOPES, type MollerzScope } from "./scopes";

export const searchParamsCache = createSearchParamsCache({
  scope: parseAsStringEnum([...MOLLERZ_SCOPES]).withDefault("world"),
});
