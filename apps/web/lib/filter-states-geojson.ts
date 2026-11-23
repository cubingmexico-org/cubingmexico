import type { GeoJSONProps } from "react-leaflet";

type FeatureProperties = { id?: string; name?: string; state_name?: string };

type StatesFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{ properties?: FeatureProperties | null }>;
};

/** Keep only state polygons whose `properties.id` is in `stateIds`. */
export function filterStatesGeoJSON(
  statesData: GeoJSONProps["data"] | null | undefined,
  stateIds: Iterable<string>,
): GeoJSONProps["data"] | undefined {
  if (!statesData || typeof statesData !== "object") return undefined;
  if (!("features" in statesData) || !Array.isArray(statesData.features)) {
    return undefined;
  }

  const collection = statesData as StatesFeatureCollection;
  const allowed = new Set(stateIds);
  return {
    ...collection,
    type: "FeatureCollection",
    features: collection.features.filter((feature) => {
      const id = feature.properties?.id;
      return id != null && allowed.has(id);
    }),
  } as GeoJSONProps["data"];
}
