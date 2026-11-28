"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@workspace/ui/components/skeleton";

const Map = dynamic(
  () =>
    import("../../competitions/[id]/_components/map").then((mod) => mod.Map),
  {
    ssr: false,
    loading: () => <Skeleton className="aspect-video w-full rounded-lg" />,
  },
);

type GroupLocationMapProps = {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  label?: string | null;
  address?: string | null;
};

/** Leaflet pin map for a sponsor store (same stack as competition venue maps). */
export function GroupLocationMap({
  latitude,
  longitude,
  label,
  address,
}: GroupLocationMapProps) {
  if (
    latitude == null ||
    longitude == null ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  return (
    <div className="aspect-video overflow-hidden rounded-lg border bg-muted">
      <Map
        center={[latitude, longitude]}
        zoom={16}
        markers={[
          {
            id: "store",
            venue: label ?? undefined,
            address: address ?? undefined,
            latitude,
            longitude,
          },
        ]}
      />
    </div>
  );
}
