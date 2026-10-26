import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { buttonVariants } from "@workspace/ui/components/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import { CalendarRange, MapPin, Settings, Swords, Users } from "lucide-react";
import type { getTeamInfo } from "../_lib/queries";
import { TeamTabsNav } from "./team-tabs-nav";

type Team = NonNullable<Awaited<ReturnType<typeof getTeamInfo>>>;

type TeamShellProps = {
  stateId: string;
  team: Team;
  totalMembers: number;
  canManage: boolean;
  /** Year the "Resumen anual" link opens, or null to hide the link. */
  summaryYear: number | null;
  children: ReactNode;
};

export function TeamShell({
  stateId,
  team,
  totalMembers,
  canManage,
  summaryYear,
  children,
}: TeamShellProps) {
  return (
    <>
      <div className="relative h-100 overflow-hidden bg-gray-200">
        <Image
          src={team.coverImage || "/placeholder.svg"}
          alt={`${team.name} cover`}
          className="h-full w-full object-cover"
          width={1200}
          height={400}
          priority
        />
        <div className="absolute right-0 bottom-0 left-0 bg-linear-to-t from-black/60 to-transparent p-4 sm:p-6">
          <div className="container mx-auto flex min-w-0 flex-col items-stretch gap-4 sm:flex-row sm:items-end sm:gap-6">
            <div className="flex min-w-0 w-full gap-4 sm:gap-6">
              <Avatar className="h-20 w-20 shrink-0 border-4 border-white sm:h-24 sm:w-24">
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
              <div className="mb-2 min-w-0 text-white">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold wrap-break-word sm:text-3xl">
                    {team.name}
                  </h1>
                  {!team.isActive ? (
                    <Badge
                      variant="secondary"
                      className="border-white/30 bg-black/40 text-white"
                    >
                      Inactivo
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-col items-start gap-2 text-sm text-white/90 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex min-w-0 items-center">
                    <MapPin className="mr-1 h-4 w-4 shrink-0" />
                    <span className="truncate">{team.state}</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="mr-1 h-4 w-4 shrink-0" />
                    {totalMembers} miembros
                  </div>
                  {team.founded ? (
                    <div className="flex items-center">
                      Desde{" "}
                      {team.founded.toLocaleDateString("es-ES", {
                        year: "numeric",
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex w-full flex-wrap justify-start gap-2 sm:ml-auto sm:w-auto sm:justify-end">
              {summaryYear !== null ? (
                <Link
                  className={cn(
                    buttonVariants({
                      variant: "secondary",
                      size: "default",
                    }),
                  )}
                  href={`/summary/team/${summaryYear}/${stateId}`}
                  prefetch={false}
                >
                  <CalendarRange /> Resumen anual
                </Link>
              ) : null}
              {canManage ? (
                <Link
                  className={cn(
                    buttonVariants({
                      variant: "default",
                      size: "default",
                    }),
                  )}
                  href={`/teams/${stateId}/manage`}
                  prefetch={false}
                >
                  <Settings />
                  Administrar Team
                </Link>
              ) : null}
              <Link
                className={cn(
                  buttonVariants({
                    variant: "ghost",
                    size: "default",
                  }),
                  "bg-black/20 text-white hover:bg-black/30 hover:text-white",
                )}
                href={`/teams/compare?a=${stateId}`}
                prefetch={false}
              >
                <Swords /> Comparar
              </Link>
              <Link
                className={cn(
                  buttonVariants({
                    variant: "ghost",
                    size: "default",
                  }),
                  "bg-black/20 text-white hover:bg-black/30 hover:text-white",
                )}
                href="/teams"
              >
                <Users /> Ver todos
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto min-w-0 px-4 py-8">
        <TeamTabsNav stateId={stateId} />

        {children}
      </div>
    </>
  );
}
