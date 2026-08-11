"use client";

import dynamic from "next/dynamic";
import type { GeoJSONProps } from "react-leaflet";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { StateFlag } from "@/components/state-flag";

const TeamStateMap = dynamic(
  () => import("./team-state-map").then((mod) => mod.TeamStateMap),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> },
);

type TeamLocationProps = {
  stateId: string;
  stateName: string;
  statesData: GeoJSONProps["data"] | null;
};

export function TeamLocation({
  stateId,
  stateName,
  statesData,
}: TeamLocationProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center gap-2">
        <StateFlag
          stateId={stateId}
          stateName={stateName}
          size={112}
          className="h-20 w-auto max-w-36 rounded-sm shadow-sm"
        />
        <span className="text-sm font-medium">{stateName}</span>
      </div>

      <div className="h-48 overflow-hidden rounded-lg border">
        {statesData ? (
          <TeamStateMap statesData={statesData} />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
            No se pudo cargar el mapa del estado.
          </div>
        )}
      </div>
    </div>
  );
}
