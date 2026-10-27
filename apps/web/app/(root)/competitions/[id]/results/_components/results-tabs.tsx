"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";

export type ResultsTab = {
  key: string;
  href: string;
  /** Pathname that marks the tab active (href may carry a query string). */
  path: string;
  label: string;
};

export function ResultsTabs({ tabs }: { tabs: ResultsTab[] }) {
  const pathname = usePathname() || "";
  const activeTab = tabs.find((tab) => pathname === tab.path)?.key;

  return (
    <Tabs value={activeTab} className="w-fit">
      <TabsList className="w-fit">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.key} value={tab.key} asChild>
            <Link href={tab.href}>{tab.label}</Link>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
