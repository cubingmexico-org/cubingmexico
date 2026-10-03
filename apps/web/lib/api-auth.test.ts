import { describe, expect, it } from "vitest";
import { unauthorizedResponse } from "./api-auth";

describe("unauthorizedResponse", () => {
  it("returns 401 without a session", async () => {
    const response = unauthorizedResponse(null);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      success: false,
      message: "Unauthorized",
    });
  });

  it("returns 403 for a signed-in user without permission", async () => {
    const response = unauthorizedResponse("2016SANT03");
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      success: false,
      message: "Forbidden",
    });
  });
});
