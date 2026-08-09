"use client";

import { useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { GeoJSONProps } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import { useTheme } from "next-themes";

import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

import type { Team } from "./teams";
import { useRouter } from "next/navigation";

function normalizeText(value: string | null | undefined) {
  return value
    ? value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
    : "";
}

interface TeamsStateMapProps {
  teams: Team[];
  statesData: GeoJSONProps["data"] | null;
  selectedState: string | null;
  onTeamSelect: (teamId: string) => void;
}

function getFeatureStateName(feature: {
  properties?: Record<string, unknown>;
}) {
  const properties = feature.properties ?? {};
  const stateName = properties.state_name;

  if (typeof stateName === "string" && stateName.length > 0) {
    return stateName;
  }

  const fallbackName = properties.name;
  if (typeof fallbackName === "string" && fallbackName.length > 0) {
    return fallbackName;
  }

  const fallbackId = properties.id;
  if (typeof fallbackId === "string" && fallbackId.length > 0) {
    return fallbackId;
  }

  return null;
}

function getTeamForState(teams: Team[], stateName: string | null) {
  if (!stateName) return null;

  const normalizedStateName = normalizeText(stateName);
  return (
    teams.find((team) => normalizeText(team.state) === normalizedStateName) ??
    null
  );
}

function getFeatureStyle({
  teams,
  feature,
  selectedState,
  hovered,
}: {
  teams: Team[];
  feature: { properties?: Record<string, unknown> };
  selectedState: string | null;
  hovered?: boolean;
}) {
  const stateName = getFeatureStateName(feature);
  const team = getTeamForState(teams, stateName);
  const isSelected =
    Boolean(selectedState && stateName) &&
    normalizeText(selectedState) === normalizeText(stateName);
  const hasTeam = Boolean(team);

  if (isSelected) {
    return {
      color: "#083344",
      weight: 2.5,
      opacity: 1,
      fillColor: hovered ? "#0891b2" : "#14b8a6",
      fillOpacity: 0.88,
    };
  }

  if (hasTeam) {
    return {
      color: hovered ? "#0f766e" : "#ffffff",
      weight: hovered ? 2 : 1.25,
      opacity: 1,
      fillColor: hovered ? "#2dd4bf" : "#5eead4",
      fillOpacity: hovered ? 0.8 : 0.64,
    };
  }

  return {
    color: "#94a3b8",
    weight: hovered ? 1.5 : 1,
    opacity: 0.9,
    fillColor: "#cbd5e1",
    fillOpacity: hovered ? 0.32 : 0.18,
  };
}

export function TeamsStateMap({
  teams,
  statesData,
  selectedState,
  onTeamSelect,
}: TeamsStateMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const { theme } = useTheme();
  const router = useRouter();

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
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView([23.6345, -102.5528], 5);

    mapRef.current = map;

    const tileUrl =
      theme === "dark"
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    L.tileLayer(tileUrl, {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    if (!statesData) {
      return () => {
        map.remove();
        mapRef.current = null;
      };
    }

    const geoJsonLayer = L.geoJSON(
      statesData as Parameters<typeof L.geoJSON>[0],
      {
        style: (feature) =>
          getFeatureStyle({
            teams,
            feature: feature as { properties?: Record<string, unknown> },
            selectedState,
          }),
        onEachFeature: (feature, layer) => {
          const stateName = getFeatureStateName({
            properties: feature.properties as Record<string, unknown>,
          });
          const team = getTeamForState(teams, stateName);
          let popupRoot: Root | null = null;

          if (stateName) {
            layer.bindTooltip(stateName, {
              sticky: true,
              direction: "center",
            });
          }

          if (team) {
            const popupContainer = document.createElement("div");
            popupContainer.className = "min-w-[320px]";

            layer.bindPopup(popupContainer, {
              maxWidth: 420,
              className: "team-state-popup",
            });

            layer.on("popupopen", (event) => {
              popupRoot ??= createRoot(popupContainer);
              popupRoot.render(
                <div className="p-3 max-w-xs">
                  <div className="flex flex-col items-center gap-3 text-center">
                    {team.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={team.image}
                        alt={team.name}
                        className="w-32 h-32 rounded-md object-cover"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-md bg-slate-200" />
                    )}

                    <div className="flex-1">
                      <h3 className="text-sm font-semibold">{team.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {team.state}
                      </p>
                    </div>
                  </div>

                  {team.description && (
                    <p className="mt-2 text-sm text-slate-700">
                      {team.description}
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                    <div>
                      <div>{team.members} miembros</div>
                      {team.founded && (
                        <div>
                          Fundado: {new Date(team.founded).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <button
                      className="ml-4 px-3 py-1 rounded bg-teal-600 text-white text-sm hover:bg-teal-700 transition-colors hover:cursor-pointer"
                      onClick={() => {
                        router.push(`/teams/${team.id}`);
                      }}
                    >
                      Ver Team
                    </button>
                  </div>
                </div>,
              );

              requestAnimationFrame(() => {
                const popupElement = event.popup.getElement();

                if (!popupElement) {
                  return;
                }

                const popupRect = popupElement.getBoundingClientRect();
                const mapRect = map.getContainer().getBoundingClientRect();
                const offsetX =
                  popupRect.left +
                  popupRect.width / 2 -
                  (mapRect.left + mapRect.width / 2);
                const offsetY =
                  popupRect.top +
                  popupRect.height / 2 -
                  (mapRect.top + mapRect.height / 2);

                map.panBy([offsetX, offsetY], {
                  animate: true,
                });
              });
            });

            layer.on("popupclose", () => {
              popupRoot?.unmount();
              popupRoot = null;
            });
          }
        },
      },
    ).addTo(map);

    const bounds = geoJsonLayer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [24, 24] });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onTeamSelect, selectedState, statesData, teams, theme, router]);

  if (!statesData) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        No se pudo cargar el mapa de estados.
      </div>
    );
  }

  return <div ref={containerRef} className="h-full w-full" />;
}
