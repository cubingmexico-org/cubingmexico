export const MOLLERZ_SCOPES = ["world", "national"] as const;

export type MollerzScope = (typeof MOLLERZ_SCOPES)[number];
