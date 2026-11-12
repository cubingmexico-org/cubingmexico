"use client";

import { useEffect, useRef } from "react";
import type { GeoJSONProps } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import { useTheme } from "next-themes";

import { getMapTileConfig } from "@/lib/map-tiles";

import "leaflet/dist/leaflet.css";

export type VisitorCounts = Record<string, { people: number; visits: number }>;

type FeatureProperties = { id?: string; state_name?: string };

/** Log scale, so one big neighbor doesn't wash out the rest. */
function intensity(people: number, maxPeople: number): number {
  if (people <= 0 || maxPeople <= 0) return 0;
  return Math.log1p(people) / Math.log1p(maxPeople);
}

export function TeamEventsVisitorsMap({
  statesData,
  counts,
  homeStateId,
}: {
  statesData: GeoJSONProps["data"];
  counts: VisitorCounts;
  homeStateId: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const node = containerRef.current as HTMLDivElement & {
      _leaflet_id?: number;
    };
    delete node._leaflet_id;

    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Leaflet must load client-side
    const L = require("leaflet") as typeof import("leaflet");

    const map = L.map(containerRef.current, {
      zoomControl: false,
      scrollWheelZoom: false,
      dragging: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      attributionControl: true,
    }).setView([23.6345, -102.5528], 5);

    mapRef.current = map;

    const tiles = getMapTileConfig(resolvedTheme);
    L.tileLayer(tiles.url, {
      attribution: tiles.attribution,
      ...(tiles.subdomains ? { subdomains: tiles.subdomains } : {}),
    }).addTo(map);

    const maxOutside = Math.max(
      0,
      ...Object.entries(counts)
        .filter(([id]) => id !== homeStateId)
        .map(([, c]) => c.people),
    );

    const geoJsonLayer = L.geoJSON(
      statesData as Parameters<typeof L.geoJSON>[0],
      {
        style: (feature) => {
          const id = (feature?.properties as FeatureProperties | undefined)?.id;
          if (id === homeStateId) {
            return {
              color: "#92400e",
              weight: 2.5,
              opacity: 1,
              fillColor: "#f59e0b",
              fillOpacity: 0.75,
            };
          }
          const people = id ? (counts[id]?.people ?? 0) : 0;
          if (people === 0) {
            return {
              color: "#94a3b8",
              weight: 1,
              opacity: 0.9,
              fillColor: "#cbd5e1",
              fillOpacity: 0.15,
            };
          }
          return {
            color: "#0f766e",
            weight: 1.25,
            opacity: 1,
            fillColor: "#0d9488",
            fillOpacity: 0.2 + 0.7 * intensity(people, maxOutside),
          };
        },
        onEachFeature: (feature, layer) => {
          const { id, state_name: name } = (feature.properties ??
            {}) as FeatureProperties;
          if (!name) return;
          const count = id ? counts[id] : undefined;
          const detail = count
            ? `${count.people} ${count.people === 1 ? "persona" : "personas"}, ${count.visits} ${count.visits === 1 ? "visita" : "visitas"}`
            : "sin competidores";
          layer.bindTooltip(
            `${name}${id === homeStateId ? " (local)" : ""}: ${detail}`,
            { sticky: true, direction: "top" },
          );
        },
      },
    ).addTo(map);

    const bounds = geoJsonLayer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [12, 12] });
    }

    requestAnimationFrame(() => {
      map.invalidateSize();
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [statesData, counts, homeStateId, resolvedTheme]);

  return (
    <div ref={containerRef} className="h-full w-full min-w-0 max-w-full" />
  );
}
