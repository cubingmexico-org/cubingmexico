"use client";

import { SiFacebook, SiInstagram } from "@icons-pack/react-simple-icons";
import {
  Stat,
  StatDescription,
  StatLabel,
  StatValue,
} from "@workspace/ui/components/stat";
import { type SocialPostStats } from "./social-types";

export function SocialStatsGrid({
  tab,
  stats,
  pendingCount,
}: {
  tab: "pendientes" | "historial";
  stats: SocialPostStats;
  pendingCount: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Stat>
        <StatLabel>Publicaciones</StatLabel>
        <StatValue className="tabular-nums">{stats.total}</StatValue>
        <StatDescription>Total en `social_posts`</StatDescription>
      </Stat>
      <Stat>
        <StatLabel>Pendientes</StatLabel>
        <StatValue className="tabular-nums">
          {tab === "pendientes" ? pendingCount : "—"}
        </StatValue>
        <StatDescription>Faltan Facebook y/o Instagram</StatDescription>
      </Stat>
      <Stat>
        <StatLabel>Competencias</StatLabel>
        <StatValue className="tabular-nums">{stats.competitions}</StatValue>
        <StatDescription>Con al menos un post</StatDescription>
      </Stat>
      <Stat>
        <StatLabel>Por plataforma</StatLabel>
        <StatValue className="flex items-center gap-2 tabular-nums">
          <span>{stats.facebook}</span>
          <span className="text-muted-foreground text-xl font-normal">/</span>
          <span>{stats.instagram}</span>
        </StatValue>
        <StatDescription className="flex items-center gap-1.5">
          <SiFacebook className="size-3.5" />
          Facebook
          <span className="text-muted-foreground">/</span>
          <SiInstagram className="size-3.5" />
          Instagram
        </StatDescription>
      </Stat>
    </div>
  );
}
