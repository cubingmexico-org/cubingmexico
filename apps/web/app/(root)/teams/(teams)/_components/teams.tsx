"use client";

import { useState } from "react";
import type { GeoJSONProps } from "react-leaflet";
import dynamic from "next/dynamic";
import { Input } from "@workspace/ui/components/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { Search } from "lucide-react";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { normalizeSearchText } from "@/lib/search";
import { TeamCard } from "./team-card";

const TeamsStateMap = dynamic(
  () => import("./teams-state-map").then((mod) => mod.TeamsStateMap),
  { ssr: false, loading: () => <Skeleton className="h-full w-full" /> },
);

export interface Team {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  coverImage: string | null;
  state: string;
  founded: Date | null;
  isActive: boolean;
  members: number;
}

export function Teams({
  teams,
  statesData,
}: {
  teams: Team[];
  statesData: GeoJSONProps["data"] | null;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [view, setView] = useState<"cards" | "map">("cards");

  const normalizedSearch = normalizeSearchText(searchQuery);

  const filteredTeams = teams.filter((team) => {
    const matchesSearch =
      normalizeSearchText(team.name).includes(normalizedSearch) ||
      normalizeSearchText(team.state).includes(normalizedSearch);
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "active" && team.isActive) ||
      (activeTab === "inactive" && !team.isActive);
    return matchesSearch && matchesTab;
  });

  const emptyState = (
    <div className="col-span-full text-center">
      <p className="text-muted-foreground">
        No se encontraron resultados para tu búsqueda.
      </p>
      <p className="text-muted-foreground py-4">
        Intenta ajustar tu búsqueda o verifica la ortografía.
      </p>
      <p className="text-muted-foreground">
        Si no encuentras lo que buscas, considera crear un nuevo Team.
      </p>
    </div>
  );

  return (
    <>
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="text-3xl font-bold">Teams estatales</h1>
        <p className="text-muted-foreground">
          Descubre y conecta con los Teams de speedcubers en México
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative w-full md:w-75">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar Teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <Tabs
          value={activeTab}
          className="w-full md:w-auto"
          onValueChange={setActiveTab}
        >
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="active">Activos</TabsTrigger>
            <TabsTrigger value="inactive">Inactivos</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs
        value={view}
        onValueChange={(value) => setView(value as "cards" | "map")}
      >
        <TabsList className="mb-6">
          <TabsTrigger value="cards">Tarjetas</TabsTrigger>
          <TabsTrigger value="map">Mapa</TabsTrigger>
        </TabsList>

        <TabsContent value="cards">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTeams.map((team) => (
              <TeamCard
                key={team.id}
                id={team.id}
                name={team.name}
                description={team.description}
                image={team.image}
                coverImage={team.coverImage}
                state={team.state}
                founded={team.founded}
                isActive={team.isActive}
                members={team.members}
              />
            ))}
            {filteredTeams.length === 0 && emptyState}
          </div>
        </TabsContent>

        <TabsContent value="map">
          <div className="h-152 overflow-hidden rounded-2xl">
            <TeamsStateMap
              teams={filteredTeams}
              statesData={statesData}
              selectedState={null}
              onTeamSelect={() => {}}
            />
          </div>
          {filteredTeams.length === 0 && (
            <div className="mt-4 text-center">{emptyState}</div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}
