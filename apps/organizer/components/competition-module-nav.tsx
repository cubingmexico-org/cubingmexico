"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, ClipboardList, IdCard, Users } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { DESK_ENABLED, GROUPS_ENABLED } from "@/lib/constants";

const modules = [
  {
    id: "certificates",
    label: "Certificados",
    href: (competitionId: string) => `/certificates/${competitionId}`,
    icon: Award,
    match: "/certificates/",
    enabled: true,
  },
  {
    id: "badges",
    label: "Gafetes",
    href: (competitionId: string) => `/badges/${competitionId}`,
    icon: IdCard,
    match: "/badges/",
    enabled: true,
  },
  {
    id: "desk",
    label: "Mesa",
    href: (competitionId: string) => `/desk/${competitionId}`,
    icon: ClipboardList,
    match: "/desk/",
    enabled: DESK_ENABLED,
  },
  {
    id: "groups",
    label: "Grupos",
    href: (competitionId: string) => `/groups/${competitionId}`,
    icon: Users,
    match: "/groups/",
    enabled: GROUPS_ENABLED,
  },
] as const;

export function CompetitionModuleNav({
  competitionId,
}: {
  competitionId: string;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Módulos de la competencia"
      className="mb-6 flex flex-wrap gap-2 border-b pb-4"
    >
      {modules
        .filter((module) => module.enabled)
        .map((module) => {
          const active = pathname.startsWith(module.match);
          const Icon = module.icon;

          return (
            <Link
              key={module.id}
              href={module.href(competitionId)}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {module.label}
            </Link>
          );
        })}
    </nav>
  );
}
