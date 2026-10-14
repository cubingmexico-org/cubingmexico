import { parseAsBoolean } from "nuqs/server";

/** `?deprecated=true` adds deprecated events (333ft, magic, ...) to counts and ranks. */
export const deprecatedParser = parseAsBoolean.withDefault(false);
