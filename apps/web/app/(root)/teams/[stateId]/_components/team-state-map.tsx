"use client";

import { useEffect, useRef } from "react";
import type { GeoJSONProps } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import { useTheme } from "next-themes";

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

type TeamStateMapProps = {
  statesData: GeoJSONProps["data"];
};

export function TeamStateMap({ statesData }: TeamStateMapProps) {
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

    const tileUrl =
      resolvedTheme === "dark"
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    L.tileLayer(tileUrl, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const geoJsonLayer = L.geoJSON(
      statesData as Parameters<typeof L.geoJSON>[0],
      {
        style: {
          color: "#0f766e",
          weight: 2,
          opacity: 1,
          fillColor: "#14b8a6",
          fillOpacity: 0.55,
        },
      },
    ).addTo(map);

    const bounds = geoJsonLayer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 8 });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [statesData, resolvedTheme]);

  return <div ref={containerRef} className="h-full w-full" />;
}
