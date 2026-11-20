import { describe, expect, it } from "vitest";
import {
  digitsToCentiseconds,
  formatDigitTime,
  formatDigitsDisplay,
  remainingCentiseconds,
  sanitizeDigitInput,
} from "@/lib/digit-time";

describe("digitsToCentiseconds", () => {
  it("returns null for empty input", () => {
    expect(digitsToCentiseconds("")).toBeNull();
  });

  it("parses digit-pad times from the right", () => {
    expect(digitsToCentiseconds("4534")).toBe(4534);
    expect(digitsToCentiseconds("23454")).toBe(15454);
    expect(digitsToCentiseconds("50000")).toBe(30000);
    expect(digitsToCentiseconds("1")).toBe(1);
    expect(digitsToCentiseconds("12")).toBe(12);
    expect(digitsToCentiseconds("123")).toBe(123);
  });

  it("rejects seconds ≥ 60", () => {
    expect(digitsToCentiseconds("99999")).toBe("invalid");
    expect(digitsToCentiseconds("16000")).toBe("invalid");
  });

  it("rejects non-digit input", () => {
    expect(digitsToCentiseconds("12a")).toBe("invalid");
    expect(digitsToCentiseconds("1.23")).toBe("invalid");
  });
});

describe("formatDigitsDisplay", () => {
  it("formats digit strings including invalid seconds", () => {
    expect(formatDigitsDisplay("")).toBe("");
    expect(formatDigitsDisplay("4534")).toBe("45.34");
    expect(formatDigitsDisplay("23454")).toBe("2:34.54");
    expect(formatDigitsDisplay("50000")).toBe("5:00.00");
    expect(formatDigitsDisplay("99999")).toBe("9:99.99");
  });
});

describe("sanitizeDigitInput", () => {
  it("keeps digits only and caps length", () => {
    expect(sanitizeDigitInput("12a3")).toBe("123");
    expect(sanitizeDigitInput("123456789")).toBe("12345678");
  });
});

describe("formatDigitTime", () => {
  it("formats like formatTime", () => {
    expect(formatDigitTime(4534)).toBe("45.34");
    expect(formatDigitTime(15454)).toBe("2:34.54");
    expect(formatDigitTime(30000)).toBe("5:00.00");
  });
});

describe("remainingCentiseconds", () => {
  it("returns null when limit is empty or invalid", () => {
    expect(remainingCentiseconds("", ["4534"])).toBeNull();
    expect(remainingCentiseconds("99999", ["4534"])).toBeNull();
  });

  it("sums filled attempts and ignores empty ones", () => {
    // 5:00.00 − 1:23.45 − 1:54.32 = 1:42.23 (10223 cs)
    expect(remainingCentiseconds("50000", ["12345", "15432", ""])).toBe(10223);
  });

  it("clamps remaining below zero to 0", () => {
    // 5:00.00 − 1:23.45 − 1:54.32 − 3:00.00 < 0
    expect(remainingCentiseconds("50000", ["12345", "15432", "30000"])).toBe(0);
  });

  it("returns null when an attempt is invalid", () => {
    expect(remainingCentiseconds("50000", ["99999"])).toBeNull();
  });
});
