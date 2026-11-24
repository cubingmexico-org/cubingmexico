import Link from "next/link";
import { Suspense } from "react";
import { HomeHero } from "@/components/home-hero";
import { HomeLiveBannerSection } from "@/components/home-live-banner-section";
import { HomeUpcomingCompetitions } from "@/components/home-upcoming-competitions";
import { HomeRecentRecords } from "@/components/home-recent-records";
import { HomeCommunityStats } from "@/components/home-community-stats";
import { HomeSponsors } from "@/components/home-sponsors";
import { getUpcomingCompetitions } from "@/app/(root)/competitions/_lib/queries";
import { getRecentNationalRecords } from "@/app/(root)/records/_lib/queries";
import {
  getNumberOfPersons,
  getNumberOfCompetitions,
} from "@/app/(root)/about/_lib/queries";
import { COMMUNITIES_PUBLICLY_RELEASED } from "@/lib/groups";

const shortcuts = [
  { href: "/rankings/333/single", label: "Rankings" },
  { href: "/records", label: "Récords" },
  { href: "/teams", label: "Teams" },
  ...(COMMUNITIES_PUBLICLY_RELEASED
    ? [{ href: "/communities", label: "Comunidades locales" }]
    : []),
  { href: "/kinch", label: "Kinch" },
  { href: "/live", label: "En vivo" },
];

export default async function Page() {
  const [upcomingCompetitions, recentRecords, persons, competitions] =
    await Promise.all([
      getUpcomingCompetitions(5),
      getRecentNationalRecords(5),
      getNumberOfPersons(),
      getNumberOfCompetitions(),
    ]);

  return (
    <main className="grow">
      <HomeHero />
      <Suspense fallback={null}>
        <HomeLiveBannerSection />
      </Suspense>

      <nav
        aria-label="Accesos rápidos"
        className="border-b border-border bg-card"
      >
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 sm:px-6">
          {shortcuts.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="shrink-0 px-3 py-2 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-brand"
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <div className="mx-auto grid max-w-7xl gap-0 lg:grid-cols-5">
        <div className="border-border lg:col-span-3 lg:border-r">
          <HomeUpcomingCompetitions competitions={upcomingCompetitions} />
        </div>
        <div className="lg:col-span-2">
          <HomeRecentRecords records={recentRecords} />
        </div>
      </div>

      <HomeCommunityStats persons={persons} competitions={competitions} />
      <HomeSponsors />
    </main>
  );
}
