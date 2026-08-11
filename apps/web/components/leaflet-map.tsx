"use client";

import { useEffect, useRef } from "react";
import type { GeoJSONProps } from "react-leaflet";
import type { Map } from "leaflet";
import { useTheme } from "next-themes";

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

export interface LeafletMapLocation {
  id: string;
  name: string;
  stateName: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface LeafletMapProps {
  posix: [number, number];
  zoom?: number;
  /** GeoJSON to render as a filled layer (e.g. state boundaries). */
  statesData?: GeoJSONProps["data"];
  /** Point markers with optional popup text. */
  locations?: LeafletMapLocation[];
}

export function LeafletMap({
  posix,
  zoom = 5,
  statesData,
  locations = [],
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

    const tileUrl =
      resolvedTheme === "dark"
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    L.tileLayer(tileUrl, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    for (const { name, stateName, latitude, longitude } of locations) {
      const lat = (latitude && latitude / 1000000) || 0;
      const lng = (longitude && longitude / 1000000) || 0;
      L.marker([lat, lng])
        .addTo(map)
        .bindPopup(`<b>${name}</b>${stateName ? `<br/>${stateName}` : ""}`);
    }

    if (statesData) {
      L.geoJSON(statesData as Parameters<typeof L.geoJSON>[0]).addTo(map);
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [posix, zoom, statesData, locations, resolvedTheme]);

  return <div ref={containerRef} style={{ height: "100%", width: "100%" }} />;
}
