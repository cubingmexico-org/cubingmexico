"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { NavigationMenuLink } from "@workspace/ui/components/navigation-menu";

/**
 * NavigationMenuLink's `asChild` slot needs a real element child. Building the
 * Link here keeps it from arriving as a lazy reference from the server payload.
 */
export function HeaderNavLink({
  href,
  className,
  linkClassName,
  children,
}: {
  href: string;
  className?: string;
  linkClassName?: string;
  children: ReactNode;
}) {
  return (
    <NavigationMenuLink asChild className={className}>
      <Link href={href} className={linkClassName}>
        {children}
      </Link>
    </NavigationMenuLink>
  );
}
