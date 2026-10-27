import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { insertEvent } from "@/test/factories";
import {
  crossEventIds,
  DEPRECATED_EVENT_IDS,
  EVENT_SCOPES,
  SPECIALTY_EVENT_IDS,
} from "./constants";
import { crossEventIdsSql } from "./official-events";

beforeEach(async () => {
  for (const [index, id] of SPECIALTY_EVENT_IDS.entries()) {
    await insertEvent({ id, rank: (index + 1) * 10 });
  }
  for (const [index, id] of DEPRECATED_EVENT_IDS.entries()) {
    await insertEvent({ id, rank: 996 + index });
  }
  await insertEvent({ id: "333mbo", rank: 999 });
  await insertEvent({ id: "fto", rank: 810 });
});

describe("crossEventIdsSql", () => {
  it.each(EVENT_SCOPES)("matches the %s cross-event columns", async (scope) => {
    const rows = await db.execute<{ id: string }>(
      sql`SELECT id FROM events WHERE id IN ${crossEventIdsSql(scope)} ORDER BY rank`,
    );
    expect(rows.map((row) => row.id)).toEqual(crossEventIds(scope));
  });
});
