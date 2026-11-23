"use client";

import { useEffect, useRef } from "react";
import type { GeoJSONProps } from "react-leaflet";
import type { Map } from "leaflet";
import { useTheme } from "next-themes";

import { getMapTileConfig } from "@/lib/map-tiles";

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

export interface LeafletMapLocation {
  id: string;
  name: string;
  stateId?: string | null;
  stateName: string | null;
  latitude: number | null;
  longitude: number | null;
}

/** Competition (or other) counts keyed by state id for choropleth fills. */
export type StateChoroplethCounts = Record<string, number>;

type FeatureProperties = { id?: string; name?: string; state_name?: string };

/** Log scale, so one dense state doesn't wash out the rest. */
function intensity(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  return Math.log1p(value) / Math.log1p(max);
}

export interface LeafletMapProps {
  posix: [number, number];
  zoom?: number;
  /** GeoJSON to render as a filled layer (e.g. state boundaries). */
  statesData?: GeoJSONProps["data"];
  /** Per-state counts; when set with statesData, renders a choropleth. */
  choroplethCounts?: StateChoroplethCounts;
  /** Point markers with optional popup text. */
  locations?: LeafletMapLocation[];
  /** Render a heat layer instead of individual markers. */
  heatmap?: boolean;
}

export function LeafletMap({
  posix,
  zoom = 5,
  statesData,
  choroplethCounts,
  locations = [],
  heatmap = false,
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Leaflet stamps _leaflet_id on the node; clear it before re-init
    const node = containerRef.current as HTMLDivElement & {
      _leaflet_id?: number;
    };
    delete node._leaflet_id;

    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Leaflet must load client-side
    const L = require("leaflet") as typeof import("leaflet");

    const map = L.map(containerRef.current).setView(posix, zoom);
    mapRef.current = map;

    const tiles = getMapTileConfig(resolvedTheme);
    L.tileLayer(tiles.url, {
      attribution: tiles.attribution,
      ...(tiles.subdomains ? { subdomains: tiles.subdomains } : {}),
    }).addTo(map);

    if (heatmap) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- leaflet.heat must load client-side
      const heat = require("leaflet.heat") as typeof import("leaflet.heat");
      const { HeatLayer } = heat;

      const points: [number, number, number][] = [];
      for (const { latitude, longitude } of locations) {
        if (latitude == null || longitude == null) continue;
        const lat = latitude / 1_000_000;
        const lng = longitude / 1_000_000;
        if (lat === 0 && lng === 0) continue;
        points.push([lat, lng, 1]);
      }

      // leaflet.heat ships Leaflet 2 typings; cast for our Leaflet 1.x map.
      map.addLayer(
        new HeatLayer(points, {
          radius: 25,
          blur: 15,
          maxZoom: 10,
        }) as unknown as import("leaflet").Layer,
      );
    } else if (!choroplethCounts) {
      for (const { name, stateName, latitude, longitude } of locations) {
        const lat = (latitude && latitude / 1000000) || 0;
        const lng = (longitude && longitude / 1000000) || 0;
        L.marker([lat, lng])
          .addTo(map)
          .bindPopup(`<b>${name}</b>${stateName ? `<br/>${stateName}` : ""}`);
      }
    }

    if (statesData) {
      const counts = choroplethCounts ?? {};
      const maxCount = Math.max(0, ...Object.values(counts));
      const useChoropleth = choroplethCounts != null;

      const geoJsonLayer = L.geoJSON(
        statesData as Parameters<typeof L.geoJSON>[0],
        useChoropleth
          ? {
              style: (feature) => {
                const id = (
                  feature?.properties as FeatureProperties | undefined
                )?.id;
                const value = id ? (counts[id] ?? 0) : 0;
                if (value === 0) {
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
                  fillOpacity: 0.2 + 0.7 * intensity(value, maxCount),
                };
              },
              onEachFeature: (feature, layer) => {
                const props = (feature.properties ?? {}) as FeatureProperties;
                const name = props.state_name ?? props.name;
                if (!name) return;
                const value = props.id ? (counts[props.id] ?? 0) : 0;
                const detail =
                  value === 0
                    ? "sin competencias"
                    : `${value} ${value === 1 ? "competencia" : "competencias"}`;
                layer.bindTooltip(`${name}: ${detail}`, {
                  sticky: true,
                  direction: "top",
                });
              },
            }
          : undefined,
      ).addTo(map);

      if (useChoropleth) {
        const bounds = geoJsonLayer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [12, 12] });
        }
      }
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [
    posix,
    zoom,
    statesData,
    choroplethCounts,
    locations,
    resolvedTheme,
    heatmap,
  ]);

  return (
    <div
      ref={containerRef}
      className="isolate z-0"
      style={{ height: "100%", width: "100%" }}
    />
  );
}
