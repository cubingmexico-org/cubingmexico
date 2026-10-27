import {
  ChartNoAxesColumnIncreasing,
  Medal,
  ChartBarBig,
  ChartColumnStacked,
  Sigma,
  SquareSigma,
  MapPinned,
  Map as MapIcon,
  Users,
  ClipboardList,
  ShieldCheck,
  IdCard,
  CircleHelp,
  Info,
  Hammer,
  Flame,
  BookOpen,
  Swords,
  Skull,
  ChartBar,
  Shapes,
  Award,
} from "lucide-react";
import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@workspace/ui/components/navigation-menu";
import { CubingMexico } from "@workspace/icons";
import { cn } from "@workspace/ui/lib/utils";
import { HeaderNavLink } from "./header-nav-link";
import { ResponsiveNavigationMenu } from "./responsive-navigation-menu";

const navItemClass = cn(
  navigationMenuTriggerStyle(),
  "bg-transparent text-white hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white data-[active=true]:bg-white/10 data-[state=open]:bg-white/10 data-[state=open]:text-white data-[state=open]:hover:bg-white/15 data-[state=open]:focus:bg-white/15",
);

const triggerClass = cn(
  "bg-transparent text-white hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white data-[active=true]:bg-white/10 data-[state=open]:bg-white/10 data-[state=open]:text-white data-[state=open]:hover:bg-white/15 data-[state=open]:focus:bg-white/15",
);

export function HeaderNavigationMenu() {
  return (
    <ResponsiveNavigationMenu>
      <NavigationMenuList className="flex-wrap">
        <NavigationMenuItem>
          <HeaderNavLink href="/competitions" className={navItemClass}>
            Competencias
          </HeaderNavLink>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <HeaderNavLink href="/teams" className={navItemClass}>
            Teams estatales
          </HeaderNavLink>
        </NavigationMenuItem>

        <NavigationMenuItem>
          <NavigationMenuTrigger className={triggerClass}>
            Resultados
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-62.5 gap-4">
              <li>
                <HeaderNavLink
                  href="/rankings/333/single"
                  linkClassName="flex-row items-center gap-2"
                >
                  <ChartNoAxesColumnIncreasing className="size-4" />
                  Rankings
                </HeaderNavLink>
                <HeaderNavLink
                  href="/records"
                  linkClassName="flex-row items-center gap-2"
                >
                  <Medal className="size-4" />
                  Récords
                </HeaderNavLink>
                <HeaderNavLink
                  href="/sor/single"
                  linkClassName="flex-row items-center gap-2"
                >
                  <Sigma className="size-4" />
                  Sum of Ranks
                </HeaderNavLink>
                <HeaderNavLink
                  href="/sor/single/teams"
                  linkClassName="flex-row items-center gap-2"
                >
                  <SquareSigma className="size-4" />
                  Sum of Ranks (Teams)
                </HeaderNavLink>
                <HeaderNavLink
                  href="/sosr/MEX/single"
                  linkClassName="flex-row items-center gap-2"
                >
                  <MapPinned className="size-4" />
                  Sum of State Ranks
                </HeaderNavLink>
                <HeaderNavLink
                  href="/kinch"
                  linkClassName="flex-row items-center gap-2"
                >
                  <ChartBarBig className="size-4" />
                  Kinch Ranks
                </HeaderNavLink>
                <HeaderNavLink
                  href="/kinch/MEX"
                  linkClassName="flex-row items-center gap-2"
                >
                  <MapIcon className="size-4" />
                  Kinch Ranks estatales
                </HeaderNavLink>
                <HeaderNavLink
                  href="/kinch/teams"
                  linkClassName="flex-row items-center gap-2"
                >
                  <ChartColumnStacked className="size-4" />
                  Kinch Ranks (Teams)
                </HeaderNavLink>
                <HeaderNavLink
                  href="/teams/compare"
                  linkClassName="flex-row items-center gap-2"
                >
                  <Swords className="size-4" />
                  Comparar teams
                </HeaderNavLink>
                <HeaderNavLink
                  href="/streaks"
                  linkClassName="flex-row items-center gap-2"
                >
                  <Flame className="size-4" />
                  Rachas de PRs
                </HeaderNavLink>
                <HeaderNavLink
                  href="/unofficial/rankings"
                  linkClassName="flex-row items-center gap-2"
                >
                  <Shapes className="size-4" />
                  Rankings no oficiales
                </HeaderNavLink>
                <HeaderNavLink
                  href="/unofficial/records"
                  linkClassName="flex-row items-center gap-2"
                >
                  <Award className="size-4" />
                  Récords no oficiales
                </HeaderNavLink>
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
                <HeaderNavLink
                  href="/persons"
                  linkClassName="flex-row items-center gap-2"
                >
                  <Users className="size-4" />
                  Competidores
                </HeaderNavLink>
                <HeaderNavLink
                  href="/persons/compare"
                  linkClassName="flex-row items-center gap-2"
                >
                  <Swords className="size-4" />
                  Comparar competidores
                </HeaderNavLink>
                <HeaderNavLink
                  href="/persons/nemesis"
                  linkClassName="flex-row items-center gap-2"
                >
                  <Skull className="size-4" />
                  Buscador de némesis
                </HeaderNavLink>
                <HeaderNavLink
                  href="/persons/nemesis/stats"
                  linkClassName="flex-row items-center gap-2"
                >
                  <ChartBar className="size-4" />
                  Estadísticas de némesis
                </HeaderNavLink>
                <HeaderNavLink
                  href="/organizers"
                  linkClassName="flex-row items-center gap-2"
                >
                  <ClipboardList className="size-4" />
                  Organizadores
                </HeaderNavLink>
                <HeaderNavLink
                  href="/delegates"
                  linkClassName="flex-row items-center gap-2"
                >
                  <ShieldCheck className="size-4" />
                  Delegados
                </HeaderNavLink>
                <HeaderNavLink
                  href="/members"
                  linkClassName="flex-row items-center gap-2"
                >
                  <IdCard className="size-4" />
                  Miembros (Sistema Mollerz)
                </HeaderNavLink>
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
                <HeaderNavLink
                  href="/about"
                  linkClassName="flex-row items-center gap-2"
                >
                  <Info className="size-4" />
                  Acerca de
                </HeaderNavLink>
                <HeaderNavLink
                  href="/faq"
                  linkClassName="flex-row items-center gap-2"
                >
                  <CircleHelp className="size-4" />
                  Preguntas frecuentes
                </HeaderNavLink>
                <HeaderNavLink
                  href="/logo"
                  linkClassName="flex-row items-center gap-2"
                >
                  <CubingMexico className="size-4" />
                  Logotipo
                </HeaderNavLink>
                <HeaderNavLink
                  href="/tools"
                  linkClassName="flex-row items-center gap-2"
                >
                  <Hammer className="size-4" />
                  Herramientas
                </HeaderNavLink>
                <HeaderNavLink
                  href="/docs"
                  linkClassName="flex-row items-center gap-2"
                >
                  <BookOpen className="size-4" />
                  API pública
                </HeaderNavLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </ResponsiveNavigationMenu>
  );
}
