"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@workspace/ui/components/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { ScrollArea, ScrollBar } from "@workspace/ui/components/scroll-area";
import { cn } from "@workspace/ui/lib/utils";
import { MapPin, Settings, Users } from "lucide-react";
import type { getTeamInfo } from "../_lib/queries";
import { StateLabel } from "@/components/state-flag";

type Team = NonNullable<Awaited<ReturnType<typeof getTeamInfo>>>;

type TeamShellProps = {
  stateId: string;
  team: Team;
  totalMembers: number;
  canManage: boolean;
  children: ReactNode;
};

export function TeamShell({
  stateId,
  team,
  totalMembers,
  canManage,
  children,
}: TeamShellProps) {
  const pathname = usePathname();

  const activeTab = pathname.endsWith(`/teams/${stateId}/members`)
    ? "members"
    : pathname.endsWith(`/teams/${stateId}/competitions`)
      ? "competitions"
      : pathname.endsWith(`/teams/${stateId}/statistics`)
        ? "statistics"
        : "overview";

  const tabClass = (isActive: boolean) =>
    cn(
      "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors",
      isActive
        ? "bg-background text-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground",
    );

  return (
    <>
      <div className="relative h-100 bg-gray-200">
        <Image
          src={team.coverImage || "/placeholder.svg"}
          alt={`${team.name} cover`}
          className="h-full w-full object-cover"
          width={1200}
          height={400}
          priority
        />
        <div className="absolute right-0 bottom-0 left-0 bg-linear-to-t from-black/60 to-transparent p-6">
          <div className="container mx-auto flex flex-col items-end gap-6 sm:flex-row">
            <div className="flex w-full gap-6">
              <Avatar className="h-24 w-24 border-4 border-white">
                <AvatarImage
                  src={team.image ?? undefined}
                  alt={team.name ?? undefined}
                />
                <AvatarFallback>
                  {team.name
                    ?.split(" ")
                    .map((name) => name[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="mb-2 text-white">
                <h1 className="text-3xl font-bold">{team.name}</h1>
                <div className="mt-2 flex flex-col items-start gap-2 sm:flex-row sm:gap-4">
                  <div className="flex items-center">
                    <MapPin className="mr-1 h-4 w-4" />
                    <StateLabel stateId={stateId} stateName={team.state} />
                  </div>
                  <div className="flex items-center">
                    <Users className="mr-1 h-4 w-4" />
                    {totalMembers} miembros
                  </div>
                  {team.founded ? (
                    <div className="flex items-center">
                      <span className="mr-1">•</span>
                      Desde{" "}
                      {team.founded.toLocaleDateString("es-ES", {
                        year: "numeric",
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="ml-auto flex gap-2">
              <Link
                className={cn(
                  buttonVariants({
                    variant: "secondary",
                    size: "default",
                  }),
                )}
                href="/teams"
              >
                <Users /> Ver todos los Teams
              </Link>
              {canManage ? (
                <Link
                  className={cn(
                    buttonVariants({
                      variant: "default",
                      size: "default",
                    }),
                  )}
                  href={`/teams/${stateId}/manage`}
                >
                  <Settings />
                  Administrar Team
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <ScrollArea className="max-w-screen">
          <div className="mb-8 inline-flex w-full items-center justify-start gap-2 rounded-lg bg-muted p-1">
            <Link
              className={tabClass(activeTab === "overview")}
              href={`/teams/${stateId}`}
            >
              Resumen
            </Link>
            <Link
              className={tabClass(activeTab === "members")}
              href={`/teams/${stateId}/members`}
            >
              Miembros
            </Link>
            <Link
              className={tabClass(activeTab === "competitions")}
              href={`/teams/${stateId}/competitions`}
            >
              Competencias
            </Link>
            <Link
              className={tabClass(activeTab === "statistics")}
              href={`/teams/${stateId}/statistics`}
            >
              Estadísticas
            </Link>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {children}
      </div>
    </>
  );
}
