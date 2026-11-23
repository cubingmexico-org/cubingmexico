"use client";

import { useEffect, useRef } from "react";
import type { LatLngExpression, Map as LeafletMapType } from "leaflet";
import { useTheme } from "next-themes";

import { getMapTileConfig } from "@/lib/map-tiles";

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

interface MarkerItem {
  id: string;
  venue?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface MapProps {
  center: LatLngExpression;
  zoom?: number;
  markers?: MarkerItem[];
  height?: string | number;
}

const DEFAULTS = {
  zoom: 13,
  height: "100%",
};

/** Accepts degrees or integer microdegrees and returns degrees. */
function normalizeCoord(value?: number | null) {
  if (value == null) return 0;
  const abs = Math.abs(value);
  if (abs > 180) return value / 1_000_000;
  return value;
}

function toLatLng(center: LatLngExpression): [number, number] {
  if (Array.isArray(center)) {
    return [Number(center[0]), Number(center[1])];
  }
  const point = center as { lat: number; lng: number };
  return [point.lat, point.lng];
}

export function Map({
  center,
  zoom = DEFAULTS.zoom,
  markers = [],
  height = DEFAULTS.height,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMapType | null>(null);
  const { resolvedTheme } = useTheme();
  const [lat, lng] = toLatLng(center);
  // Stable dep so parent re-renders with a new markers array don't remount the map
  const markersKey = JSON.stringify(markers);

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

    const map = L.map(containerRef.current).setView([lat, lng], zoom);
    mapRef.current = map;

    const tiles = getMapTileConfig(resolvedTheme);
    L.tileLayer(tiles.url, {
      attribution: tiles.attribution,
      ...(tiles.subdomains ? { subdomains: tiles.subdomains } : {}),
    }).addTo(map);

    const parsedMarkers = JSON.parse(markersKey) as MarkerItem[];
    for (const { venue, address, latitude, longitude } of parsedMarkers) {
      const markerLat = normalizeCoord(latitude);
      const markerLng = normalizeCoord(longitude);
      if (!Number.isFinite(markerLat) || !Number.isFinite(markerLng)) continue;

      const popupParts = [
        venue ? `<b>${venue}</b>` : "",
        address ? `<p>${address}</p>` : "",
      ].filter(Boolean);
      const marker = L.marker([markerLat, markerLng]).addTo(map);
      const popupHtml = popupParts.join("");
      if (popupHtml) {
        marker.bindPopup(popupHtml);
      }
    }

    return () => {
      map.remove();
      mapRef.current = null;
      delete node._leaflet_id;
    };
  }, [lat, lng, zoom, markersKey, resolvedTheme]);

  return (
    <div
      ref={containerRef}
      className="isolate z-0"
      style={{ height, width: "100%" }}
    />
  );
}
