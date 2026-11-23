"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import type { GroupKind } from "@workspace/db/schema";
import { groupBasePath } from "@/lib/groups";

const TABS = [
  { key: "overview", suffix: "", label: "Resumen" },
  { key: "members", suffix: "/members", label: "Miembros" },
  { key: "rankings", suffix: "/rankings/333/single", label: "Rankings" },
] as const;

function tabClass(isActive: boolean) {
  return cn(
    "inline-flex h-9 shrink-0 items-center justify-center rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors",
    isActive
      ? "bg-background text-brand shadow-sm ring-1 ring-brand/30"
      : "text-muted-foreground hover:text-foreground",
  );
}

export function GroupTabsNav({
  groupId,
  kind,
}: {
  groupId: string;
  kind: GroupKind;
}) {
  const pathname = usePathname();
  const basePath = `${groupBasePath(kind)}/${groupId}`;

  if (pathname.startsWith(`${basePath}/manage`)) return null;

  const activeTab = pathname.includes(`${basePath}/members`)
    ? "members"
    : pathname.includes(`${basePath}/rankings`)
      ? "rankings"
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
