"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { GeoJSONProps } from "react-leaflet";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { StateLabel } from "@/components/state-flag";
import type { getStatesGeoJSON } from "@/db/queries";
import type { StateVisitors } from "../_lib/queries";
import { formatShare } from "../_lib/format";
import type { VisitorCounts } from "./team-events-visitors-map";

const TeamEventsVisitorsMap = dynamic(
  () =>
    import("./team-events-visitors-map").then(
      (mod) => mod.TeamEventsVisitorsMap,
    ),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> },
);

const TOP_ORIGINS = 8;

type StatesGeoJSON = Awaited<ReturnType<typeof getStatesGeoJSON>>;

export function TeamEventsVisitors({
  visitors,
  stateId,
  stateName,
  statesGeoJSON,
}: {
  visitors: StateVisitors;
  stateId: string;
  stateName: string;
  statesGeoJSON: StatesGeoJSON;
}) {
  const stateNames = useMemo(
    () =>
      new Map(
        (statesGeoJSON?.features ?? []).map((f) => [
          f.properties.id,
          (f.properties as { state_name?: string }).state_name ??
            f.properties.name,
        ]),
      ),
    [statesGeoJSON],
  );
  const counts = useMemo<VisitorCounts>(
    () =>
      Object.fromEntries(
        visitors.origins
          .filter((o) => o.stateId !== null)
          .map((o) => [o.stateId, { people: o.people, visits: o.visits }]),
      ),
    [visitors],
  );

  if (visitors.totalPeople === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {stateName} no organizó competencias en este periodo
      </p>
    );
  }

  const outside = visitors.origins.filter(
    (o) => o.stateId !== null && o.stateId !== stateId,
  );
  const local = visitors.origins.find((o) => o.stateId === stateId);
  const unknown = visitors.origins.find((o) => o.stateId === null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {formatShare(visitors.outsidePeople / visitors.totalPeople)} de los{" "}
        {visitors.totalPeople} competidores en las competencias de {stateName}{" "}
        vienen de otros estados. Solo se cuentan competidores mexicanos.
      </p>
      <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="h-80 w-full min-w-0 overflow-hidden rounded-lg border">
          {statesGeoJSON ? (
            <TeamEventsVisitorsMap
              statesData={statesGeoJSON as GeoJSONProps["data"]}
              counts={counts}
              homeStateId={stateId}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
              No se pudo cargar el mapa de estados.
            </div>
          )}
        </div>
        <div className="space-y-3 text-sm">
          {outside.length === 0 ? (
            <p className="text-muted-foreground">
              Nadie de otros estados en este periodo
            </p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {outside.slice(0, TOP_ORIGINS).map((o) => (
                <li
                  key={o.stateId}
                  className="flex items-center justify-between gap-3 px-3 py-2"
                >
                  <StateLabel
                    stateId={o.stateId}
                    stateName={stateNames.get(o.stateId!) ?? o.stateId}
                    className="min-w-0"
                    nameClassName="truncate"
                  />
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {o.people} {o.people === 1 ? "persona" : "personas"} ·{" "}
                    {o.visits} {o.visits === 1 ? "visita" : "visitas"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground">
            {local?.people ?? 0} locales
            {unknown ? ` · ${unknown.people} sin estado registrado` : ""}
            {outside.length > TOP_ORIGINS
              ? ` · ${outside.length - TOP_ORIGINS} estados más en el mapa`
              : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
