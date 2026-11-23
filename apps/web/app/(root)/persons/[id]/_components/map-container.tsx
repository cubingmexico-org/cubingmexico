"use client";

import type { GeoJSONProps } from "react-leaflet";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import {
  filterStatesGeoJSON,
  type LeafletMapLocation,
  type StateChoroplethCounts,
} from "@/components/leaflet-map";

const LeafletMap = dynamic(
  () => import("@/components/leaflet-map").then((mod) => mod.LeafletMap),
  { ssr: false, loading: () => <Skeleton className="w-full h-full" /> },
);

type MapView = "locations" | "states" | "choropleth" | "heatmap";

function hasCoordinates(location: LeafletMapLocation) {
  return (location.latitude ?? 0) !== 0 && (location.longitude ?? 0) !== 0;
}

export function MapContainer({
  locations,
  statesData,
}: {
  locations: LeafletMapLocation[];
  statesData: GeoJSONProps["data"] | null;
}) {
  const [view, setView] = useState<MapView>("locations");

  const choroplethCounts = useMemo<StateChoroplethCounts>(() => {
    const counts: StateChoroplethCounts = {};
    for (const { stateId } of locations) {
      if (!stateId) continue;
      counts[stateId] = (counts[stateId] ?? 0) + 1;
    }
    return counts;
  }, [locations]);

  const mappableLocations = useMemo(
    () => locations.filter(hasCoordinates),
    [locations],
  );

  const filteredStatesData = useMemo(
    () => filterStatesGeoJSON(statesData, Object.keys(choroplethCounts)),
    [statesData, choroplethCounts],
  );

  const showStates = view === "states" || view === "choropleth";

  return (
    <div className="bg-white-700 mx-auto my-5 w-[98%]">
      <div className="mb-2 max-w-full overflow-x-auto">
        <ToggleGroup
          type="single"
          variant="outline"
          aria-label="Vista del mapa"
          value={view}
          onValueChange={(value) => {
            if (value) setView(value as MapView);
          }}
          className="flex-nowrap"
        >
          <ToggleGroupItem value="locations" className="flex-none px-3">
            Ubicaciones
          </ToggleGroupItem>
          <ToggleGroupItem value="states" className="flex-none px-3">
            Estados
          </ToggleGroupItem>
          <ToggleGroupItem value="choropleth" className="flex-none px-3">
            Coropleta
          </ToggleGroupItem>
          <ToggleGroupItem value="heatmap" className="flex-none px-3">
            Mapa de calor
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="h-120">
        <LeafletMap
          posix={[23.9345, -102.5528]}
          locations={showStates ? [] : mappableLocations}
          statesData={showStates ? filteredStatesData : undefined}
          choroplethCounts={
            view === "choropleth" ? choroplethCounts : undefined
          }
          heatmap={view === "heatmap"}
        />
      </div>
    </div>
  );
}
