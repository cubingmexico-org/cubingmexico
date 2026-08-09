export type RankRecord = {
  personId: string;
  eventId: string;
};

/** Assign 1-based state ranks in the given order (already sorted by country rank). */
export function assignSequentialRanks(
  records: RankRecord[],
): (RankRecord & { stateRank: number })[] {
  return records.map((record, index) => ({
    ...record,
    stateRank: index + 1,
  }));
}
