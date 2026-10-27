"use client";

import type { ReactNode } from "react";
import { NavigationMenu } from "@workspace/ui/components/navigation-menu";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";

/** Navigation menu that only uses the shared viewport on mobile. */
export function ResponsiveNavigationMenu({
  children,
}: {
  children: ReactNode;
}) {
  const isMobile = useIsMobile();
  return <NavigationMenu viewport={isMobile}>{children}</NavigationMenu>;
}
