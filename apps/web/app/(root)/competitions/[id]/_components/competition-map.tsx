"use client";

import dynamic from "next/dynamic";
import type { LatLngExpression } from "leaflet";
import { Skeleton } from "@workspace/ui/components/skeleton";

const Map = dynamic(() => import("./map").then((mod) => mod.Map), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full" />,
});

interface MarkerItem {
  id: string;
  venue?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export function CompetitionMap({
  center,
  markers,
}: {
  center: LatLngExpression;
  markers: MarkerItem[];
}) {
  return <Map center={center} markers={markers} />;
}
