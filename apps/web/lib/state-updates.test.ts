import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@workspace/db", () => ({ db: {} }));

const { updateStateRanks, updateStateRecords } =
  await import("./state-updates");

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("BACKEND_URL", "https://backend.example/");
  vi.stubEnv("CRON_SECRET", "s3cret");
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("state updates", () => {
  it("posts to the single-state backend routes with the cron secret", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { success: true }));

    await updateStateRanks("JAL");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://backend.example/update-state-ranks/JAL",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer s3cret" }),
      }),
    );
  });

  it("returns the record counts and the state's members", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        success: true,
        personIds: ["2020AAAA01"],
        singleCount: 2,
        averageCount: 1,
      }),
    );

    await expect(updateStateRecords("JAL")).resolves.toEqual({
      personIds: ["2020AAAA01"],
      singleCount: 2,
      averageCount: 1,
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://backend.example/update-state-records/JAL",
    );
  });

  it("maps a 404 to Invalid stateId", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(404, { success: false, message: "Invalid stateId" }),
    );

    await expect(updateStateRanks("XXX")).rejects.toThrow("Invalid stateId");
  });

  it("surfaces backend errors", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, {
        success: false,
        message: "Error updating state records",
      }),
    );

    await expect(updateStateRecords("JAL")).rejects.toThrow(
      "Error updating state records",
    );
  });

  it("fails clearly when the backend isn't configured", async () => {
    vi.stubEnv("BACKEND_URL", "");

    await expect(updateStateRanks("JAL")).rejects.toThrow(
      "BACKEND_URL y CRON_SECRET deben estar configurados en el entorno.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
