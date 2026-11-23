import { describe, expect, it } from "vitest";

import { filterStatesGeoJSON } from "./filter-states-geojson";

describe("filterStatesGeoJSON", () => {
  const statesData = {
    type: "FeatureCollection",
    features: [
      { type: "Feature", properties: { id: "JAL" }, geometry: null },
      { type: "Feature", properties: { id: "CMX" }, geometry: null },
      { type: "Feature", properties: { id: "NLE" }, geometry: null },
    ],
  };

  it("keeps only features whose id is allowed", () => {
    const filtered = filterStatesGeoJSON(statesData as never, ["JAL", "NLE"]);
    expect(filtered).toMatchObject({
      type: "FeatureCollection",
      features: [{ properties: { id: "JAL" } }, { properties: { id: "NLE" } }],
    });
  });

  it("returns undefined for empty or non-collection input", () => {
    expect(filterStatesGeoJSON(null, ["JAL"])).toBeUndefined();
    expect(
      filterStatesGeoJSON({ type: "Point" } as never, ["JAL"]),
    ).toBeUndefined();
  });
});
