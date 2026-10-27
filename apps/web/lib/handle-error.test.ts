import { describe, expect, it } from "vitest";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getErrorMessage } from "./handle-error";
import { unauthorizedError } from "@/test/session";

describe("getErrorMessage", () => {
  it("returns the message of application errors", () => {
    expect(getErrorMessage(new Error("Persona no encontrada"))).toBe(
      "Persona no encontrada",
    );
  });

  it("joins zod issues", () => {
    const result = z.object({ a: z.string() }).safeParse({ a: 1 });
    expect(getErrorMessage(result.error)).toContain("string");
  });

  it("rethrows Next.js control-flow errors", () => {
    const unauthorized = unauthorizedError();
    expect(() => getErrorMessage(unauthorized)).toThrow(unauthorized);

    let redirectError: unknown;
    try {
      redirect("/");
    } catch (err) {
      redirectError = err;
    }
    expect(() => getErrorMessage(redirectError)).toThrow(
      redirectError as Error,
    );
  });
});
