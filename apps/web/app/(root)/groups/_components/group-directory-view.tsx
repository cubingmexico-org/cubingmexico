"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@workspace/ui/components/input";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { PageHeading } from "@/components/page-heading";
import { SponsorsSupportNotice } from "@/components/sponsors-support-notice";
import { normalizeSearchText } from "@/lib/search";
import type { GroupKind } from "@workspace/db/schema";
import { groupKindPluralLabel } from "@/lib/groups";
import { GroupCard } from "./group-card";

export type DirectoryGroup = {
  id: string;
  kind: GroupKind;
  name: string;
  description: string | null;
  image: string | null;
  coverImage: string | null;
  subtitle: string | null;
  founded: Date | null;
  isActive: boolean;
  members: number;
};

export function GroupDirectoryView({
  kind,
  groups,
}: {
  kind: GroupKind;
  groups: DirectoryGroup[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const title = groupKindPluralLabel(kind);
  const normalizedSearch = normalizeSearchText(searchQuery);

  const filtered = groups.filter((group) => {
    const matchesSearch =
      normalizeSearchText(group.name).includes(normalizedSearch) ||
      normalizeSearchText(group.subtitle ?? "").includes(normalizedSearch);
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "active" && group.isActive) ||
      (activeTab === "inactive" && !group.isActive);
    return matchesSearch && matchesTab;
  });

  return (
    <main className="container mx-auto grow px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-4">
        <PageHeading>{title}</PageHeading>
        {kind === "community" ? (
          <p className="text-muted-foreground">
            Descubre y conecta con comunidades locales de speedcubing
          </p>
        ) : (
          <SponsorsSupportNotice className="text-muted-foreground [&_a]:text-brand" />
        )}
      </div>

      <div className="mb-6 flex flex-col gap-4 md:flex-row">
        <div className="relative w-full md:w-75">
          <Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Buscar ${title.toLowerCase()}...`}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-8"
          />
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          aria-label={`Filtrar ${title.toLowerCase()}`}
          value={activeTab}
          className="w-full md:w-auto"
          onValueChange={(value) => {
            if (value) setActiveTab(value);
          }}
        >
          <ToggleGroupItem value="all">Todos</ToggleGroupItem>
          <ToggleGroupItem value="active">Activos</ToggleGroupItem>
          <ToggleGroupItem value="inactive">Inactivos</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center">
          <p className="text-muted-foreground">
            No se encontraron resultados para tu búsqueda.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <GroupCard
              key={item.id}
              id={item.id}
              kind={item.kind}
              name={item.name}
              description={item.description}
              image={item.image}
              coverImage={item.coverImage}
              subtitle={item.subtitle}
              founded={item.founded}
              isActive={item.isActive}
              members={item.members}
            />
          ))}
        </div>
      )}
    </main>
  );
}
