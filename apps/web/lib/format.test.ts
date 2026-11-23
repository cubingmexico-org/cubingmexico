import { describe, expect, it } from "vitest";
import { formatCityState } from "./format";

describe("formatCityState", () => {
  it("joins city and state when they differ", () => {
    expect(formatCityState("Tijuana", "Baja California")).toBe(
      "Tijuana, Baja California",
    );
  });

  it("omits state when city already ends with it", () => {
    expect(formatCityState("Tepic, Nayarit", "Nayarit")).toBe("Tepic, Nayarit");
    expect(formatCityState("Guadalajara, Jalisco", "Jalisco")).toBe(
      "Guadalajara, Jalisco",
    );
    expect(formatCityState("Morelia, Michoacán", "Michoacán")).toBe(
      "Morelia, Michoacán",
    );
  });

  it("omits state when city equals state", () => {
    expect(formatCityState("Ciudad de México", "Ciudad de México")).toBe(
      "Ciudad de México",
    );
  });

  it("handles empty values", () => {
    expect(formatCityState(null, null)).toBe("");
    expect(formatCityState("Tijuana", null)).toBe("Tijuana");
    expect(formatCityState(null, "Jalisco")).toBe("Jalisco");
    expect(formatCityState("  ", "  ")).toBe("");
  });
});
