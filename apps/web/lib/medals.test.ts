import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import {
  medalEligibleSqlR,
  medalTierCountsFromMergedSql,
  mergedPodiumOrderSql,
  mergedPodiumRowsSql,
} from "./medals";

const dialect = new PgDialect();

function sqlText(value: Parameters<PgDialect["sqlToQuery"]>[0]): string {
  return dialect.sqlToQuery(value).sql;
}

describe("medal SQL helpers", () => {
  it("builds dual-aware eligibility SQL", () => {
    const text = sqlText(medalEligibleSqlR());
    expect(text).toContain("global_pos");
    expect(text).toContain("is_dual");
    expect(text).toContain("_medal_dual_final");
  });

  it("orders merged dual rows by format sort_by", () => {
    const text = sqlText(mergedPodiumOrderSql());
    expect(text).toContain("sort_by");
    expect(text).toContain("average");
    expect(text).toContain("best");
  });

  it("counts medal tiers from merged rows", () => {
    const tiers = medalTierCountsFromMergedSql();
    expect(sqlText(tiers.gold)).toContain("global_pos = 1");
    expect(sqlText(tiers.bronze)).toContain("global_pos = 3");
  });

  it("wraps eligibility in a partitioned subquery", () => {
    const text = sqlText(mergedPodiumRowsSql());
    expect(text).toContain("ROW_NUMBER()");
    expect(text).toContain(
      "PARTITION BY r.competition_id, r.event_id, r.person_id",
    );
  });
});
