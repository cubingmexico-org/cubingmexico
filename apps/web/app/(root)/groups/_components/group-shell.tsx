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
import { PageHeading } from "@/components/page-heading";
import type { GroupKind } from "@workspace/db/schema";
import { buildCollectiveCompareHref } from "@/lib/collective-compare";
import { groupBasePath, groupKindLabel } from "@/lib/groups";
import { GroupTabsNav } from "./group-tabs-nav";

type GroupShellProps = {
  groupId: string;
  kind: GroupKind;
  name: string;
  image: string | null;
  coverImage: string | null;
  isActive: boolean;
  locationLabel: string | null;
  websiteUrl: string | null;
  totalMembers: number;
  hasRoster: boolean;
  founded: Date | null;
  canManage: boolean;
  /** Year the "Resumen anual" link opens, or null to hide the link. */
  summaryYear: number | null;
  children: ReactNode;
};

export function GroupShell({
  groupId,
  kind,
  name,
  image,
  coverImage,
  isActive,
  locationLabel,
  websiteUrl,
  totalMembers,
  hasRoster,
  founded,
  canManage,
  summaryYear,
  children,
}: GroupShellProps) {
  const basePath = groupBasePath(kind);

  return (
    <>
      <div className="relative h-100 overflow-hidden bg-gray-200">
        <Image
          src={coverImage || "/placeholder.svg"}
          alt={`${name} cover`}
          className="h-full w-full object-cover"
          width={1200}
          height={400}
          priority
        />
        <div className="absolute right-0 bottom-0 left-0 bg-linear-to-t from-black/60 to-transparent p-4 sm:p-6">
          <div className="container mx-auto flex min-w-0 flex-col items-stretch gap-4 sm:flex-row sm:items-end sm:gap-6">
            <div className="flex min-w-0 w-full gap-4 sm:gap-6">
              <Avatar className="h-20 w-20 shrink-0 border-4 border-white sm:h-24 sm:w-24">
                <AvatarImage src={image ?? undefined} alt={name} />
                <AvatarFallback>
                  {name
                    .split(" ")
                    .map((part) => part[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="mb-2 min-w-0 text-white">
                <div className="flex flex-wrap items-center gap-2">
                  <PageHeading className="wrap-break-word text-2xl text-white sm:text-3xl">
                    {name}
                  </PageHeading>
                  <Badge
                    variant="secondary"
                    className="border-white/30 bg-black/40 text-white"
                  >
                    {groupKindLabel(kind)}
                  </Badge>
                  {!isActive ? (
                    <Badge
                      variant="secondary"
                      className="border-white/30 bg-black/40 text-white"
                    >
                      Inactivo
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-col items-start gap-2 text-sm text-white/90 sm:flex-row sm:items-center sm:gap-4">
                  {locationLabel ? (
                    <div className="flex min-w-0 items-center">
                      <MapPin className="mr-1 h-4 w-4 shrink-0" />
                      <span className="truncate">{locationLabel}</span>
                    </div>
                  ) : null}
                  {hasRoster ? (
                    <div className="flex items-center">
                      <Users className="mr-1 h-4 w-4 shrink-0" />
                      {totalMembers} miembros
                    </div>
                  ) : null}
                  {founded ? (
                    <div className="flex items-center">
                      Desde{" "}
                      {founded.toLocaleDateString("es-ES", { year: "numeric" })}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex w-full flex-wrap justify-start gap-2 sm:ml-auto sm:w-auto sm:justify-end">
              {websiteUrl ? (
                <Link
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "default" }),
                  )}
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  prefetch={false}
                >
                  Sitio web
                </Link>
              ) : null}
              {canManage ? (
                <Link
                  className={cn(
                    buttonVariants({ variant: "default", size: "default" }),
                  )}
                  href={`${basePath}/${groupId}/manage`}
                  prefetch={false}
                >
                  <Settings />
                  Administrar
                </Link>
              ) : null}
              {kind === "community" && hasRoster && summaryYear !== null ? (
                <Link
                  className={cn(
                    buttonVariants({
                      variant: "ghost",
                      size: "default",
                    }),
                    "bg-black/20 text-white hover:bg-black/30 hover:text-white",
                  )}
                  href={`/summary/community/${summaryYear}/${groupId}`}
                  prefetch={false}
                >
                  <CalendarRange /> Resumen anual
                </Link>
              ) : null}
              {hasRoster ? (
                <Link
                  className={cn(
                    buttonVariants({
                      variant: "ghost",
                      size: "default",
                    }),
                    "bg-black/20 text-white hover:bg-black/30 hover:text-white",
                  )}
                  href={buildCollectiveCompareHref({ kind, id: groupId }, null)}
                  prefetch={false}
                >
                  <Swords /> Comparar
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
                href={basePath}
                prefetch={false}
              >
                <Users /> Ver todos
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className="container mx-auto min-w-0 px-4 py-8">
        <GroupTabsNav groupId={groupId} kind={kind} hasRoster={hasRoster} />
        {children}
      </div>
    </>
  );
}
