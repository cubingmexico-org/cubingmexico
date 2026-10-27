import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ userId: "2015ABCD01" as string | null }));
const updates = vi.hoisted(() => ({
  updateStateRanks: vi.fn(),
  updateStateRecords: vi.fn(),
}));

vi.mock("@/lib/team-auth", () => ({
  getSessionUserId: async () => session.userId,
  hasTeamPermission: async () => true,
}));
vi.mock("@/lib/cache-tags", () => ({
  invalidateAfterStateRecordsChange: vi.fn(),
}));
vi.mock("@/lib/state-updates", () => updates);

import { POST } from "./route";

const post = (body: string) =>
  POST(
    new Request("http://localhost/api/update-state-ranks", {
      method: "POST",
      body,
    }),
  );

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  updates.updateStateRanks.mockReset();
  updates.updateStateRecords.mockReset();
  vi.restoreAllMocks();
});

describe("POST /api/update-state-ranks", () => {
  it("rejects invalid JSON with a 400", async () => {
    expect((await post("not json")).status).toBe(400);
    expect(updates.updateStateRanks).not.toHaveBeenCalled();
  });

  it("rejects a missing or unknown stateId with a 400", async () => {
    for (const body of ["{}", '{"stateId":42}', '{"stateId":"XXX"}']) {
      expect((await post(body)).status).toBe(400);
    }
    expect(updates.updateStateRanks).not.toHaveBeenCalled();
  });

  it("recomputes ranks and records for a valid state", async () => {
    updates.updateStateRecords.mockResolvedValue({ personIds: [] });

    const response = await post('{"stateId":"JAL"}');

    expect(response.status).toBe(200);
    expect(updates.updateStateRanks).toHaveBeenCalledWith("JAL");
    expect(updates.updateStateRecords).toHaveBeenCalledWith("JAL");
  });

  it("returns a 500 when the backend fails", async () => {
    updates.updateStateRanks.mockRejectedValue(new Error("backend down"));

    expect((await post('{"stateId":"JAL"}')).status).toBe(500);
  });
});
