import type { GeoJSONProps } from "react-leaflet";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import type { getStatesGeoJSON } from "@/db/queries";
import { TeamLocation } from "./team-location";

type StatesGeoJSON = Awaited<ReturnType<typeof getStatesGeoJSON>>;

export function TeamLocationCard({
  stateId,
  stateName,
  statesGeoJSON,
}: {
  stateId: string;
  stateName: string;
  statesGeoJSON: StatesGeoJSON;
}) {
  const stateFeature = statesGeoJSON?.features.find(
    (feature) => feature.properties.id === stateId,
  );
  const stateGeoJSON = stateFeature
    ? ({
        type: "FeatureCollection",
        features: [stateFeature],
      } as GeoJSONProps["data"])
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ubicación</CardTitle>
      </CardHeader>
      <CardContent>
        <TeamLocation
          stateId={stateId}
          stateName={stateName}
          statesData={stateGeoJSON}
        />
      </CardContent>
    </Card>
  );
}
