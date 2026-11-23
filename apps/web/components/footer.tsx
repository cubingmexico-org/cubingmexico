import {
  SiDiscord,
  SiFacebook,
  SiGithub,
  SiInstagram,
} from "@icons-pack/react-simple-icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { Clock, Trophy } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import {
  getDataSourceDates,
  getLastCompetitionWithResults,
} from "@/db/queries";
import { getPublicitySponsors } from "@/app/(root)/groups/_lib/queries";
import { groupHref } from "@/lib/groups";
import { DataSourcesNotice } from "./data-sources-notice";
import { cacheLife, cacheTag } from "next/cache";

async function FooterContent() {
  "use cache";
  cacheLife("days");
  cacheTag("site-footer");
  cacheTag("groups-publicity");

  const currentYear = new Date().getFullYear();
  const [competitions, dataSourceDates, sponsors] = await Promise.all([
    getLastCompetitionWithResults(),
    getDataSourceDates(),
    getPublicitySponsors(),
  ]);

  return (
    <footer className="mt-auto bg-chrome text-white/70">
      <div className="h-1 bg-brand" aria-hidden />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              className="inline-flex items-center gap-2 font-display text-lg font-semibold tracking-wide text-white uppercase"
              href="https://github.com/cubingmexico-org"
            >
              <SiGithub className="size-5" />
              Cubing México
            </Link>
            <p className="mt-2 text-sm text-white/70">
              © {currentYear} Cubing México
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="https://facebook.com/cubingmexico"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 transition-colors hover:text-white"
            >
              <SiFacebook className="h-5 w-5" />
            </Link>
            <Link
              href="https://instagram.com/cubingmexico"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 transition-colors hover:text-white"
            >
              <SiInstagram className="h-5 w-5" />
            </Link>
            <Link
              href="https://discord.gg/N9KcpWngz7"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 transition-colors hover:text-white"
            >
              <SiDiscord className="h-5 w-5" />
            </Link>
            <ThemeToggle className="text-white" />
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-2 text-sm sm:items-start">
          <span className="flex items-center gap-1.5 text-white/60">
            <Trophy className="h-4 w-4 shrink-0" />
            Último: {competitions.lastCompetitionWithResults[0]?.name}
          </span>
          {competitions.competitionsWithNoResults.length > 0 ? (
            <Tooltip>
              <TooltipTrigger>
                <span className="flex items-center gap-1.5 text-white/60">
                  <Clock className="h-4 w-4 shrink-0" />
                  Resultados pendientes (
                  {competitions.competitionsWithNoResults.length})
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {competitions.competitionsWithNoResults.map((competition) => (
                  <p key={competition.name}>{competition.name}</p>
                ))}
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>

        {sponsors.length > 0 ? (
          <div className="mt-6 border-t border-white/10 pt-4">
            <p className="mb-2 text-center text-xs uppercase tracking-wide text-white/50 sm:text-left">
              Patrocinadores
            </p>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm sm:justify-start">
              {sponsors.map((sponsor) => (
                <Link
                  key={sponsor.id}
                  href={sponsor.websiteUrl || groupHref("sponsor", sponsor.id)}
                  className="text-white/70 underline-offset-2 hover:text-white hover:underline"
                  {...(sponsor.websiteUrl
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  {sponsor.name}
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <DataSourcesNotice
          className="mt-6 space-y-1 text-center text-xs text-white/70 sm:text-left [&_a]:text-white [&_a:hover]:text-white/90"
          wcaExportDate={dataSourceDates.wca}
          ccExportDate={dataSourceDates.cubingContests}
        />

        <p className="mt-4 text-center text-xs text-white/70 sm:text-left">
          Hecho con ❤️ por{" "}
          <Link
            href="https://www.worldcubeassociation.org/persons/2016TORO03"
            className="text-white underline hover:text-white/90"
            target="_blank"
            rel="noopener noreferrer"
          >
            Leonardo Sánchez Del Toro
          </Link>
        </p>
      </div>
    </footer>
  );
}

export function Footer() {
  return <FooterContent />;
}
