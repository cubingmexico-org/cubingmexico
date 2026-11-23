import { describe, expect, it } from "vitest";
import {
  formatLiveResultPlace,
  formatResultPlace,
  roundTypeLabel,
} from "./utils";

describe("roundTypeLabel dual", () => {
  it("appends (Dual) only when requested", () => {
    expect(roundTypeLabel("f")).toBe("Final");
    expect(roundTypeLabel("f", { dual: true })).toBe("Final (Dual)");
    expect(roundTypeLabel("1", { dual: true })).toBe("Primera ronda (Dual)");
    expect(roundTypeLabel("d", { dual: false })).toBe("Primera ronda");
  });
});

describe("formatResultPlace", () => {
  it("shows local (global) for dual rounds", () => {
    expect(formatResultPlace(2, 3, true)).toBe("2 (3)");
    expect(formatResultPlace(3, 3, true)).toBe("3 (3)");
  });

  it("shows a single place otherwise", () => {
    expect(formatResultPlace(2, 3, false)).toBe("2");
    expect(formatResultPlace(1, null, false)).toBe("1");
    expect(formatResultPlace(null)).toBe("—");
  });
});

describe("formatLiveResultPlace", () => {
  it("formats linked or differing ranks as dual", () => {
    expect(formatLiveResultPlace(2, 3)).toBe("2 (3)");
    expect(formatLiveResultPlace(2, 2, true)).toBe("2 (2)");
  });

  it("keeps a single number when ranks match and not linked", () => {
    expect(formatLiveResultPlace(1, 1)).toBe("1");
    expect(formatLiveResultPlace(null, 4)).toBe("4");
  });
});
