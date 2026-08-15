/** Coarse parent tags registered alongside event/state-scoped readers. */
export const COARSE_RANK_TAGS = [
  "ranks-single",
  "ranks-average",
  "results-single",
  "results-average",
  "kinch-ranks",
  "kinch-ranks-state",
  "kinch-ranks-teams-data",
  "records",
  "sor-single",
  "sor-average",
  "streak-ranks",
] as const;

export function stateMemberTags(stateId: string): string[] {
  return [
    `members-list-${stateId}`,
    `members-gender-count-${stateId}`,
    `total-members-${stateId}`,
    `team-top-members-${stateId}`,
    `team-podiums-${stateId}`,
    `single-national-records-${stateId}`,
    `average-national-records-${stateId}`,
    `sosr-${stateId}-single`,
    `sosr-${stateId}-average`,
    `sosr-state-${stateId}`,
  ];
}

export function tagsAfterStateRanksChange(stateId: string): string[] {
  return [
    ...COARSE_RANK_TAGS,
    ...stateMemberTags(stateId),
    "persons-without-state",
    "kinch-ranks-state-counts",
    "kinch-ranks-gender-counts",
    "sor-state-counts-single",
    "sor-state-counts-average",
    "sor-gender-counts-single",
    "sor-gender-counts-average",
    "sor-teams-single",
    "sor-teams-average",
    "streak-ranks-state-counts",
    "streak-ranks-gender-counts",
  ];
}

/** Person-scoped cache tags affected when historical SR markers change. */
export function personStateRecordTags(personIds: string[]): string[] {
  return personIds.flatMap((wcaId) => [
    `person-page-${wcaId}`,
    `person-data-${wcaId}`,
    `person-record-history-${wcaId}`,
  ]);
}
