import { describe, expect, it } from "vitest";
import { cn } from "@workspace/ui/lib/utils";

describe("cn", () => {
  it("joins truthy class names and drops falsy ones", () => {
    expect(
      cn("px-2", false, undefined, null, "text-sm", { hidden: false }),
    ).toBe("px-2 text-sm");
  });

  it("lets later Tailwind classes override conflicting earlier ones", () => {
    expect(cn("px-2 py-1 text-sm", "px-4", { "text-lg": true })).toBe(
      "py-1 px-4 text-lg",
    );
  });
});
