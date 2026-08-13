"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, IdCard } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

const modules = [
  {
    id: "certificates",
    label: "Certificados",
    href: (competitionId: string) => `/certificates/${competitionId}`,
    icon: Award,
    match: "/certificates/",
  },
  {
    id: "badges",
    label: "Gafetes",
    href: (competitionId: string) => `/badges/${competitionId}`,
    icon: IdCard,
    match: "/badges/",
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
      {modules.map((module) => {
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
