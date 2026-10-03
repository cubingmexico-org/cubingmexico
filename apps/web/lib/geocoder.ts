import type { Options } from "node-geocoder";
import NodeGeocoder from "node-geocoder";

const options: Options = {
  provider: "openstreetmap",
  fetch: fetch as unknown as Options["fetch"],
};

const geocoder = NodeGeocoder(options);

export async function getStateFromCoordinates(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  try {
    const res = await geocoder.reverse({ lat: latitude, lon: longitude });
    if (res.length > 0) {
      return res[0]?.state ?? "Ciudad de México";
    }
    return null;
  } catch {
    return null;
  }
}
