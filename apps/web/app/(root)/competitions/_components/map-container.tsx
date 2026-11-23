"use client";

import type { GeoJSONProps } from "react-leaflet";
import { Skeleton } from "@workspace/ui/components/skeleton";
import dynamic from "next/dynamic";
import { useState } from "react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import type { LeafletMapLocation } from "@/components/leaflet-map";

const LeafletMap = dynamic(
  () => import("@/components/leaflet-map").then((mod) => mod.LeafletMap),
  { ssr: false, loading: () => <Skeleton className="w-full h-full" /> },
);

type MapView = "locations" | "states" | "heatmap";

export function MapContainer({
  locations,
  statesData,
}: {
  locations: LeafletMapLocation[];
  statesData: GeoJSONProps["data"];
}) {
  const [view, setView] = useState<MapView>("locations");

  return (
    <div className="bg-white-700 mx-auto my-5 w-[98%]">
      <div className="flex gap-2 items-center justify-start mb-2">
        <ToggleGroup
          type="single"
          variant="outline"
          aria-label="Vista del mapa"
          value={view}
          onValueChange={(value) => {
            if (value) setView(value as MapView);
          }}
        >
          <ToggleGroupItem value="locations">Ubicaciones</ToggleGroupItem>
          <ToggleGroupItem value="states">Estados</ToggleGroupItem>
          <ToggleGroupItem value="heatmap">Mapa de calor</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="h-120">
        <LeafletMap
          posix={[23.9345, -102.5528]}
          locations={view === "states" ? [] : locations}
          statesData={view === "states" ? statesData : undefined}
          heatmap={view === "heatmap"}
        />
      </div>
    </div>
  );
}
