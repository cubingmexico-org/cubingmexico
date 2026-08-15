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
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import { CalendarRange, MapPin, Settings, Users } from "lucide-react";
import type { getTeamInfo } from "../_lib/queries";
import {
  canShowAnnualSummaryLinks,
  getDefaultSummaryYear,
} from "@/app/(root)/summary/_lib/summary-year";

type Team = NonNullable<Awaited<ReturnType<typeof getTeamInfo>>>;

type TeamShellProps = {
  stateId: string;
  team: Team;
  totalMembers: number;
  canManage: boolean;
  isSuperadmin?: boolean;
  children: ReactNode;
};

export function TeamShell({
  stateId,
  team,
  totalMembers,
  canManage,
  isSuperadmin = false,
  children,
}: TeamShellProps) {
  const pathname = usePathname();
  const summaryYear = getDefaultSummaryYear();
  const showAnnualSummary = canShowAnnualSummaryLinks(isSuperadmin);
  const basePath = `/teams/${stateId}`;
  const isManage = pathname.startsWith(`${basePath}/manage`);

  const activeTab = pathname.endsWith(`${basePath}/members`)
    ? "members"
    : pathname.endsWith(`${basePath}/competitions`)
      ? "competitions"
      : pathname.endsWith(`${basePath}/statistics`)
        ? "statistics"
        : pathname === basePath || pathname === `${basePath}/`
          ? "overview"
          : null;

  const tabClass = (isActive: boolean) =>
    cn(
      "inline-flex h-9 shrink-0 items-center justify-center rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors",
      isActive
        ? "bg-background text-foreground shadow-sm"
        : "text-muted-foreground hover:text-foreground",
    );

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
              {showAnnualSummary ? (
                <Link
                  className={cn(
                    buttonVariants({
                      variant: "secondary",
                      size: "default",
                    }),
                  )}
                  href={`/summary/team/${summaryYear}/${stateId}`}
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
                href="/teams"
              >
                <Users /> Ver todos
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto min-w-0 px-4 py-8">
        {!isManage ? (
          <div className="mb-8 w-full min-w-0 overflow-x-auto">
            <div className="inline-flex min-w-full items-center justify-start gap-2 rounded-lg bg-muted p-1">
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
          </div>
        ) : null}

        {children}
      </div>
    </>
  );
}
