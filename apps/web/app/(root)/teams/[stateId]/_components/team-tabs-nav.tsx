"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";

const TABS = [
  { key: "overview", suffix: "", label: "Resumen" },
  { key: "members", suffix: "/members", label: "Miembros" },
  { key: "competitions", suffix: "/competitions", label: "Competencias" },
  { key: "statistics", suffix: "/statistics", label: "Estadísticas" },
] as const;

function tabClass(isActive: boolean) {
  return cn(
    "inline-flex h-9 shrink-0 items-center justify-center rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors",
    isActive
      ? "bg-background text-foreground shadow-sm"
      : "text-muted-foreground hover:text-foreground",
  );
}

/** Team section tabs; hidden on the manage pages. */
export function TeamTabsNav({ stateId }: { stateId: string }) {
  const pathname = usePathname();
  const basePath = `/teams/${stateId}`;

  if (pathname.startsWith(`${basePath}/manage`)) return null;

  const activeTab = pathname.endsWith(`${basePath}/members`)
    ? "members"
    : pathname.endsWith(`${basePath}/competitions`)
      ? "competitions"
      : pathname.endsWith(`${basePath}/statistics`)
        ? "statistics"
        : pathname === basePath || pathname === `${basePath}/`
          ? "overview"
          : null;

  return (
    <div className="mb-8 w-full min-w-0 overflow-x-auto">
      <div className="inline-flex min-w-full items-center justify-start gap-2 rounded-lg bg-muted p-1">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            className={tabClass(activeTab === tab.key)}
            href={`${basePath}${tab.suffix}`}
            prefetch="auto"
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
