"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import { buttonVariants } from "@workspace/ui/components/button";

const NAV_ITEMS: {
  href: string;
  label: string;
  exact?: boolean;
}[] = [
  { href: "/admin", label: "Resumen", exact: true },
  { href: "/admin/ops", label: "Ops" },
  { href: "/admin/social", label: "Social" },
  { href: "/admin/people", label: "Personas" },
  { href: "/admin/competitions", label: "Competencias" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {NAV_ITEMS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              buttonVariants({
                variant: active ? "default" : "outline",
                size: "sm",
              }),
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
