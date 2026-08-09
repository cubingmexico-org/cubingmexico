"use client";

import Link from "next/link";
import {
  ChartNoAxesColumnIncreasing,
  Medal,
  ChartBarBig,
  PlusCircle,
  Users,
  CircleHelp,
  Info,
  Hammer,
  Flame,
} from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@workspace/ui/components/navigation-menu";
import { CubingMexico } from "@workspace/icons";
import { useIsMobile } from "@workspace/ui/hooks/use-mobile";
import { cn } from "@workspace/ui/lib/utils";

const navItemClass = cn(
  navigationMenuTriggerStyle(),
  "bg-transparent text-white hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white data-[active=true]:bg-white/10 data-[state=open]:bg-white/10 data-[state=open]:text-white data-[state=open]:hover:bg-white/15 data-[state=open]:focus:bg-white/15",
);

const triggerClass = cn(
  "bg-transparent text-white hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white data-[active=true]:bg-white/10 data-[state=open]:bg-white/10 data-[state=open]:text-white data-[state=open]:hover:bg-white/15 data-[state=open]:focus:bg-white/15",
);

export function HeaderNavigationMenu() {
  const isMobile = useIsMobile();

  return (
    <NavigationMenu viewport={isMobile}>
      <NavigationMenuList className="flex-wrap">
        <NavigationMenuItem>
          <NavigationMenuLink asChild className={navItemClass}>
            <Link href="/competitions">Competencias</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuLink asChild className={navItemClass}>
            <Link href="/teams">Teams estatales</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger className={triggerClass}>
            Resultados
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-62.5 gap-4">
              <li>
                <NavigationMenuLink asChild>
                  <Link
                    href="/rankings/333/single"
                    className="flex-row items-center gap-2"
                  >
                    <ChartNoAxesColumnIncreasing className="size-4" />
                    Rankings
                  </Link>
                </NavigationMenuLink>
                <NavigationMenuLink asChild>
                  <Link href="/records" className="flex-row items-center gap-2">
                    <Medal className="size-4" />
                    Récords
                  </Link>
                </NavigationMenuLink>
                <NavigationMenuLink asChild>
                  <Link
                    href="/sor/single"
                    className="flex-row items-center gap-2"
                  >
                    <PlusCircle className="size-4" />
                    Sum of Ranks
                  </Link>
                </NavigationMenuLink>
                <NavigationMenuLink asChild>
                  <Link
                    href="/sor/single/teams"
                    className="flex-row items-center gap-2"
                  >
                    <PlusCircle className="size-4" />
                    Sum of Ranks (Teams)
                  </Link>
                </NavigationMenuLink>
                <NavigationMenuLink asChild>
                  <Link
                    href="/sosr/MEX/single"
                    className="flex-row items-center gap-2"
                  >
                    <PlusCircle className="size-4" />
                    Sum of State Ranks
                  </Link>
                </NavigationMenuLink>
                <NavigationMenuLink asChild>
                  <Link href="/kinch" className="flex-row items-center gap-2">
                    <ChartBarBig className="size-4" />
                    Kinch Ranks
                  </Link>
                </NavigationMenuLink>
                <NavigationMenuLink asChild>
                  <Link
                    href="/kinch/MEX"
                    className="flex-row items-center gap-2"
                  >
                    <ChartBarBig className="size-4" />
                    Kinch Ranks estatales
                  </Link>
                </NavigationMenuLink>
                <NavigationMenuLink asChild>
                  <Link
                    href="/kinch/teams"
                    className="flex-row items-center gap-2"
                  >
                    <ChartBarBig className="size-4" />
                    Kinch Ranks (Teams)
                  </Link>
                </NavigationMenuLink>
                <NavigationMenuLink asChild>
                  <Link href="/streaks" className="flex-row items-center gap-2">
                    <Flame className="size-4" />
                    Rachas de PRs
                  </Link>
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger className={triggerClass}>
            Personas
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-62.5 gap-4">
              <li>
                <NavigationMenuLink asChild>
                  <Link href="/persons" className="flex-row items-center gap-2">
                    <Users className="size-4" />
                    Competidores
                  </Link>
                </NavigationMenuLink>
                <NavigationMenuLink asChild>
                  <Link
                    href="/organizers"
                    className="flex-row items-center gap-2"
                  >
                    <Users className="size-4" />
                    Organizadores
                  </Link>
                </NavigationMenuLink>
                <NavigationMenuLink asChild>
                  <Link
                    href="/delegates"
                    className="flex-row items-center gap-2"
                  >
                    <Users className="size-4" />
                    Delegados
                  </Link>
                </NavigationMenuLink>
                <NavigationMenuLink asChild>
                  <Link href="/members" className="flex-row items-center gap-2">
                    <Users className="size-4" />
                    Miembros (Sistema Mollerz)
                  </Link>
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger className={triggerClass}>
            Acerca de
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-62.5 gap-4">
              <li>
                <NavigationMenuLink asChild>
                  <Link href="/about" className="flex-row items-center gap-2">
                    <Info className="size-4" />
                    Acerca de
                  </Link>
                </NavigationMenuLink>
                <NavigationMenuLink asChild>
                  <Link href="/faq" className="flex-row items-center gap-2">
                    <CircleHelp className="size-4" />
                    Preguntas frecuentes
                  </Link>
                </NavigationMenuLink>
                <NavigationMenuLink asChild>
                  <Link href="/logo" className="flex-row items-center gap-2">
                    <CubingMexico className="size-4" />
                    Logotipo
                  </Link>
                </NavigationMenuLink>
                <NavigationMenuLink asChild>
                  <Link href="/tools" className="flex-row items-center gap-2">
                    <Hammer className="size-4" />
                    Herramientas
                  </Link>
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
