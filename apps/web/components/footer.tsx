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
import { DataSourcesNotice } from "./data-sources-notice";
import { cacheLife, cacheTag } from "next/cache";

async function FooterContent() {
  "use cache";
  cacheLife("days");
  cacheTag("site-footer");

  const currentYear = new Date().getFullYear();
  const [competitions, dataSourceDates] = await Promise.all([
    getLastCompetitionWithResults(),
    getDataSourceDates(),
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
            <p className="mt-2 text-sm text-white/50">
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

        <DataSourcesNotice
          className="mt-6 space-y-1 text-center text-xs text-white/45 sm:text-left [&_a]:text-brand-warm [&_a:hover]:text-white"
          wcaExportDate={dataSourceDates.wca}
          ccExportDate={dataSourceDates.cubingContests}
        />

        <p className="mt-4 text-center text-xs text-white/40 sm:text-left">
          Hecho con ❤️ por{" "}
          <Link
            href="https://www.worldcubeassociation.org/persons/2016TORO03"
            className="text-brand-warm hover:underline"
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
