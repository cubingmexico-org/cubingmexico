"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import { useTheme } from "next-themes";
import React from "react";

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

/** small helper: accepts degrees or integer microdegrees and returns degrees */
function normalizeCoord(value?: number | null) {
  if (value == null) return 0;
  const abs = Math.abs(value);
  // microdegrees are typically > 180 in absolute value
  if (abs > 180) return value / 1_000_000;
  return value;
}

/** helper component to reset view when center/zoom change */
function ResetView({
  center,
  zoom,
}: {
  center: LatLngExpression;
  zoom?: number;
}) {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center, zoom ?? DEFAULTS.zoom);
  }, [map, center, zoom]);
  return null;
}

export function Map({
  center,
  zoom = DEFAULTS.zoom,
  markers = [],
  height = DEFAULTS.height,
}: MapProps) {
  const { resolvedTheme } = useTheme();

  const tileLayerUrl =
    resolvedTheme === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <div style={{ height, width: "100%" }}>
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
      >
        <ResetView center={center} zoom={zoom} />
        <TileLayer
          key={resolvedTheme}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={tileLayerUrl}
        />
        {markers.map(({ id, venue, address, latitude, longitude }) => {
          const lat = normalizeCoord(latitude);
          const lon = normalizeCoord(longitude);
          // skip invalid coordinates
          if (!isFinite(lat) || !isFinite(lon)) return null;
          return (
            <Marker key={id} position={[lat, lon] as LatLngExpression}>
              <Popup>
                <b>{venue}</b>
                <p>{address}</p>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
