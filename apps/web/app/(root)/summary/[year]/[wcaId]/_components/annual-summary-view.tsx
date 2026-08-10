import Link from "next/link";
import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { cn } from "@workspace/ui/lib/utils";
import { formatAttemptValue } from "@/lib/utils";
import type { AnnualSummary } from "../_lib/queries";
import { getShareHighlights } from "../_lib/share-highlights";
import { SummaryShareButton } from "./summary-share-button";

function subjectPronoun(gender: AnnualSummary["person"]["gender"]): string {
  if (gender === "f") return "Ella";
  if (gender === "m") return "Él";
  return "La persona";
}

function formatSummaryDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function formatResultValue(eventId: string, value: number | null): string {
  if (value === null) return "—";
  return formatAttemptValue(eventId, value) ?? "—";
}

function formatImprovement(
  eventId: string,
  improvement: number | null,
  improvementPercent: number | null,
): string {
  if (improvement === null || improvementPercent === null) return "—";
  const abs = formatAttemptValue(eventId, improvement) ?? String(improvement);
  return `${abs} (${improvementPercent.toFixed(2)}%)`;
}

function championshipLabel(type: string): string {
  switch (type) {
    case "MX":
      return "Nacional";
    case "_North America":
      return "NAC";
    case "world":
      return "Mundial";
    default:
      return type;
  }
}

function objectPronoun(gender: AnnualSummary["person"]["gender"]): string {
  if (gender === "f") return "ella";
  if (gender === "m") return "él";
  return "esta persona";
}

type StatTone = "default" | "gold" | "silver" | "bronze";

function Stat({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: StatTone;
}) {
  return (
    <span
      className={cn(
        "inline-block font-bold text-[1.15em] leading-none mx-0.5",
        tone === "default" && "text-emerald-600 dark:text-emerald-400",
        tone === "gold" && "text-amber-500 dark:text-amber-400",
        tone === "silver" && "text-slate-500 dark:text-slate-300",
        tone === "bronze" && "text-yellow-700 dark:text-yellow-600",
      )}
    >
      {children}
    </span>
  );
}

function AccentCell({ children }: { children: ReactNode }) {
  return (
    <TableCell className="text-center font-semibold text-emerald-600 dark:text-emerald-400">
      {children}
    </TableCell>
  );
}

type Props = {
  summary: AnnualSummary;
};

export function AnnualSummaryView({ summary }: Props) {
  const {
    person,
    year,
    availableYears,
    competitionCount,
    roundCount,
    eventCount,
    firstCompetitionDate,
    lastCompetitionDate,
    podiums,
    records,
    championshipPodiums,
    prStreak,
    solves,
    personalBests,
    cubers,
    states,
    travelKm,
    rankProgress,
    kinchSor,
    mollerz,
    staff,
  } = summary;

  const pronoun = subjectPronoun(person.gender);
  const displayName = person.name ?? person.wcaId;
  const prevYearLabel = `≤${year - 1}`;
  const recordsTotal = records.wr + records.nar + records.nr + records.sr;
  const staffTotal = staff.organized.length + staff.delegated.length;
  const shareData = {
    name: displayName,
    wcaId: person.wcaId,
    year,
    highlights: getShareHighlights(summary),
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      <div className="text-center space-y-3">
        <h1 className="text-2xl sm:text-3xl font-bold">
          <Link href={`/persons/${person.wcaId}`} className="hover:underline">
            {displayName}
          </Link>
          {` — Resumen anual `}
          <Stat>{year}</Stat>
        </h1>
        <nav
          aria-label="Años disponibles"
          className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm"
        >
          <span className="text-muted-foreground">Año</span>
          {availableYears.map((availableYear) =>
            availableYear === year ? (
              <span
                key={availableYear}
                className="font-semibold text-emerald-600 dark:text-emerald-400"
              >
                {availableYear}
              </span>
            ) : (
              <Link
                key={availableYear}
                href={`/summary/${availableYear}/${person.wcaId}`}
                className="text-primary hover:underline"
              >
                {availableYear}
              </Link>
            ),
          )}
        </nav>
        {shareData.highlights.length > 0 && (
          <div className="flex justify-center pt-1">
            <SummaryShareButton data={shareData} />
          </div>
        )}
        <p className="text-muted-foreground text-sm sm:text-base">
          En el año <Stat>{year}</Stat>, {displayName} compitió en{" "}
          <Stat>{competitionCount}</Stat>{" "}
          {competitionCount === 1 ? "competencia" : "competencias"} y{" "}
          <Stat>{roundCount}</Stat> {roundCount === 1 ? "ronda" : "rondas"} a
          través de <Stat>{eventCount}</Stat>{" "}
          {eventCount === 1 ? "evento" : "eventos"}, del{" "}
          <Stat>{formatSummaryDate(firstCompetitionDate)}</Stat> al{" "}
          <Stat>{formatSummaryDate(lastCompetitionDate)}</Stat>.
        </p>
      </div>

      {podiums.total > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Podios</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            {pronoun} estuvo en el podio <Stat>{podiums.total}</Stat>{" "}
            {podiums.total === 1 ? "vez" : "veces"} en{" "}
            <Stat>{podiums.events}</Stat>{" "}
            {podiums.events === 1 ? "evento" : "eventos"}, con{" "}
            <Stat tone="gold">{podiums.gold}</Stat>{" "}
            {podiums.gold === 1 ? "oro" : "oros"},{" "}
            <Stat tone="silver">{podiums.silver}</Stat>{" "}
            {podiums.silver === 1 ? "plata" : "platas"} y{" "}
            <Stat tone="bronze">{podiums.bronze}</Stat>{" "}
            {podiums.bronze === 1 ? "bronce" : "bronces"}.
          </p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead className="text-center">Oro</TableHead>
                  <TableHead className="text-center">Plata</TableHead>
                  <TableHead className="text-center">Bronce</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {podiums.byEvent.map((row) => (
                  <TableRow key={row.eventId}>
                    <TableCell>
                      <span className={`cubing-icon event-${row.eventId}`} />
                      <span className="ml-2">{row.eventName}</span>
                    </TableCell>
                    <TableCell className="text-center font-semibold text-amber-500 dark:text-amber-400">
                      {row.gold || ""}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-slate-500 dark:text-slate-300">
                      {row.silver || ""}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-yellow-700 dark:text-yellow-600">
                      {row.bronze || ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {recordsTotal > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Récords</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            {pronoun} consiguió <Stat>{records.wr}</Stat> WR,{" "}
            <Stat>{records.nar}</Stat> NAR, <Stat>{records.nr}</Stat> NR y{" "}
            <Stat>{records.sr}</Stat> SR.
          </p>
          {records.byEventSr.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead className="text-center">SR single</TableHead>
                    <TableHead className="text-center">SR average</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.byEventSr.map((row) => (
                    <TableRow key={row.eventId}>
                      <TableCell>
                        <span className={`cubing-icon event-${row.eventId}`} />
                        <span className="ml-2">{row.eventName}</span>
                      </TableCell>
                      <AccentCell>{row.single || ""}</AccentCell>
                      <AccentCell>{row.average || ""}</AccentCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      )}

      {championshipPodiums.total > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Podios en campeonatos</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            {pronoun} subió al podio <Stat>{championshipPodiums.total}</Stat>{" "}
            {championshipPodiums.total === 1 ? "vez" : "veces"} en campeonatos:
            <Stat>{championshipPodiums.mx}</Stat> nacional
            {championshipPodiums.mx === 1 ? "" : "es"},{" "}
            <Stat>{championshipPodiums.nac}</Stat> NAC y{" "}
            <Stat>{championshipPodiums.world}</Stat> mundial
            {championshipPodiums.world === 1 ? "" : "es"}.
          </p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campeonato</TableHead>
                  <TableHead>Competencia</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead className="text-center">Posición</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {championshipPodiums.rows.map((row, index) => (
                  <TableRow
                    key={`${row.competitionName}-${row.eventId}-${index}`}
                  >
                    <TableCell>
                      {championshipLabel(row.championshipType)}
                    </TableCell>
                    <TableCell>{row.competitionName}</TableCell>
                    <TableCell>
                      <span className={`cubing-icon event-${row.eventId}`} />
                      <span className="ml-2">{row.eventName}</span>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-center font-semibold",
                        row.position === 1 &&
                          "text-amber-500 dark:text-amber-400",
                        row.position === 2 &&
                          "text-slate-500 dark:text-slate-300",
                        row.position === 3 &&
                          "text-yellow-700 dark:text-yellow-600",
                      )}
                    >
                      {row.position}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {prStreak && prStreak.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Racha de PRs</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            La racha más larga de competencias consecutivas con PR en {year} fue
            de <Stat>{prStreak.length}</Stat>{" "}
            {prStreak.length === 1 ? "competencia" : "competencias"}.
          </p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Competencia</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prStreak.competitions.map((comp, index) => (
                  <TableRow key={comp.competitionId}>
                    <AccentCell>{index + 1}</AccentCell>
                    <TableCell>
                      <Link
                        href={`/competitions/${comp.competitionId}`}
                        className="hover:underline"
                      >
                        {comp.competitionName}
                      </Link>
                    </TableCell>
                    <TableCell>{formatSummaryDate(comp.startDate)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Resoluciones / Intentos</h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          {pronoun} intentó <Stat>{solves.totalAttempts}</Stat>{" "}
          {solves.totalAttempts === 1 ? "resolución" : "resoluciones"} y
          completó <Stat>{solves.totalSolves}</Stat>.
        </p>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Evento</TableHead>
                <TableHead className="text-center">Resoluciones</TableHead>
                <TableHead className="text-center">Intentos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {solves.byEvent.map((row) => (
                <TableRow key={row.eventId}>
                  <TableCell>
                    <span className={`cubing-icon event-${row.eventId}`} />
                    <span className="ml-2">{row.eventName}</span>
                  </TableCell>
                  <AccentCell>{row.solves}</AccentCell>
                  <AccentCell>{row.attempts}</AccentCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {personalBests.totalBreaks > 0 && (
        <section className="space-y-4">
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Marcas personales</h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              {pronoun} mejoró su marca personal{" "}
              <Stat>{personalBests.totalBreaks}</Stat>{" "}
              {personalBests.totalBreaks === 1 ? "vez" : "veces"} en{" "}
              <Stat>{personalBests.events}</Stat>{" "}
              {personalBests.events === 1 ? "evento" : "eventos"}, con{" "}
              <Stat>{personalBests.singleBreaks}</Stat>{" "}
              {personalBests.singleBreaks === 1 ? "single" : "singles"} y{" "}
              <Stat>{personalBests.averageBreaks}</Stat>{" "}
              {personalBests.averageBreaks === 1 ? "average" : "averages"}.
            </p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead className="text-center">Veces</TableHead>
                    <TableHead className="text-center">Single</TableHead>
                    <TableHead className="text-center">Average</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {personalBests.byEvent.map((row) => (
                    <TableRow key={row.eventId}>
                      <TableCell>
                        <span className={`cubing-icon event-${row.eventId}`} />
                        <span className="ml-2">{row.eventName}</span>
                      </TableCell>
                      <AccentCell>{row.times}</AccentCell>
                      <AccentCell>{row.single}</AccentCell>
                      <AccentCell>{row.average}</AccentCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {personalBests.singleImprovements.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Mejoras de single</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Evento</TableHead>
                      <TableHead className="text-center">
                        {prevYearLabel}
                      </TableHead>
                      <TableHead className="text-center">{year}</TableHead>
                      <TableHead className="text-center">Mejora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {personalBests.singleImprovements.map((row) => (
                      <TableRow key={row.eventId}>
                        <TableCell>
                          <span
                            className={`cubing-icon event-${row.eventId}`}
                          />
                          <span className="ml-2">{row.eventName}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          {formatResultValue(row.eventId, row.before)}
                        </TableCell>
                        <AccentCell>
                          {formatResultValue(row.eventId, row.during)}
                        </AccentCell>
                        <AccentCell>
                          {formatImprovement(
                            row.eventId,
                            row.improvement,
                            row.improvementPercent,
                          )}
                        </AccentCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {personalBests.averageImprovements.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Mejoras de average</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Evento</TableHead>
                      <TableHead className="text-center">
                        {prevYearLabel}
                      </TableHead>
                      <TableHead className="text-center">{year}</TableHead>
                      <TableHead className="text-center">Mejora</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {personalBests.averageImprovements.map((row) => (
                      <TableRow key={row.eventId}>
                        <TableCell>
                          <span
                            className={`cubing-icon event-${row.eventId}`}
                          />
                          <span className="ml-2">{row.eventName}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          {formatResultValue(row.eventId, row.before)}
                        </TableCell>
                        <AccentCell>
                          {formatResultValue(row.eventId, row.during)}
                        </AccentCell>
                        <AccentCell>
                          {formatImprovement(
                            row.eventId,
                            row.improvement,
                            row.improvementPercent,
                          )}
                        </AccentCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </section>
      )}

      {cubers.total > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Cuberos</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            {pronoun} coincidió con <Stat>{cubers.total}</Stat>{" "}
            {cubers.total === 1 ? "cubero mexicano" : "cuberos mexicanos"},{" "}
            <Stat>{cubers.repeated}</Stat> de{" "}
            {cubers.repeated === 1
              ? "los cuales compitió"
              : "los cuales compitieron"}{" "}
            con {objectPronoun(person.gender)} más de una vez. Solo se cuentan
            cuberos mexicanos.
          </p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Persona</TableHead>
                  <TableHead className="text-center">
                    Competencias compartidas
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cubers.topShared.map((row) => (
                  <TableRow key={row.wcaId}>
                    <TableCell>
                      <Link
                        href={`/persons/${row.wcaId}`}
                        className="hover:underline"
                      >
                        {row.name ?? row.wcaId}
                      </Link>
                    </TableCell>
                    <AccentCell>{row.sharedCompetitions}</AccentCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {cubers.teammates.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Compañeros de team</h3>
              <p className="text-muted-foreground text-sm sm:text-base">
                De su team estatal, coincidió más veces con:
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Persona</TableHead>
                      <TableHead className="text-center">
                        Competencias compartidas
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cubers.teammates.map((row) => (
                      <TableRow key={row.wcaId}>
                        <TableCell>
                          <Link
                            href={`/persons/${row.wcaId}`}
                            className="hover:underline"
                          >
                            {row.name ?? row.wcaId}
                          </Link>
                        </TableCell>
                        <AccentCell>{row.sharedCompetitions}</AccentCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Competencias compartidas</TableHead>
                  <TableHead className="text-center">Competidores</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cubers.distribution.map((row) => (
                  <TableRow key={row.sharedCompetitions}>
                    <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {row.sharedCompetitions}
                    </TableCell>
                    <AccentCell>{row.competitors}</AccentCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  <AccentCell>{cubers.total}</AccentCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {states.visits.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Estados</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            {pronoun} compitió en <Stat>{states.visits.length}</Stat>{" "}
            {states.visits.length === 1 ? "estado" : "estados"}
            {states.firstTime.length > 0 && (
              <>
                , de los cuales <Stat>{states.firstTime.length}</Stat>{" "}
                {states.firstTime.length === 1 ? "fue nuevo" : "fueron nuevos"}
              </>
            )}
            .
          </p>
          {states.firstTime.length > 0 && (
            <p className="text-muted-foreground text-sm">
              Estados nuevos:{" "}
              {states.firstTime.map((s) => s.stateName).join(", ")}.
            </p>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Veces</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {states.visits.map((row) => (
                  <TableRow key={row.stateId}>
                    <TableCell>{row.stateName}</TableCell>
                    <AccentCell>{row.times}</AccentCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {travelKm !== null && travelKm > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Kilómetros</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Entre competencias consecutivas de {year}, {pronoun.toLowerCase()}{" "}
            recorrió aproximadamente{" "}
            <Stat>{travelKm.toLocaleString("es-MX")}</Stat> km (distancia en
            línea recta).
          </p>
        </section>
      )}

      {rankProgress.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Rankings</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Eventos donde mejoró su lugar NR y/o SR durante {year}.
          </p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead className="text-center">Tipo</TableHead>
                  <TableHead className="text-center">
                    NR {prevYearLabel}
                  </TableHead>
                  <TableHead className="text-center">NR {year}</TableHead>
                  <TableHead className="text-center">
                    SR {prevYearLabel}
                  </TableHead>
                  <TableHead className="text-center">SR {year}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankProgress.map((row) => (
                  <TableRow key={`${row.eventId}-${row.type}`}>
                    <TableCell>
                      <span className={`cubing-icon event-${row.eventId}`} />
                      <span className="ml-2">{row.eventName}</span>
                    </TableCell>
                    <TableCell className="text-center capitalize">
                      {row.type}
                    </TableCell>
                    <TableCell className="text-center">
                      {row.nrBefore ?? "—"}
                    </TableCell>
                    <AccentCell>{row.nrAfter ?? "—"}</AccentCell>
                    <TableCell className="text-center">
                      {row.srBefore ?? "—"}
                    </TableCell>
                    <AccentCell>{row.srAfter ?? "—"}</AccentCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Kinch y Sum of Ranks</h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          Comparación de puntajes al inicio y al final de {year} (no es el lugar
          nacional).
        </p>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Métrica</TableHead>
                <TableHead className="text-center">{prevYearLabel}</TableHead>
                <TableHead className="text-center">{year}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Kinch overall</TableCell>
                <TableCell className="text-center">
                  {kinchSor.kinchBefore.toFixed(2)}
                </TableCell>
                <AccentCell>{kinchSor.kinchAfter.toFixed(2)}</AccentCell>
              </TableRow>
              <TableRow>
                <TableCell>Sum of Ranks (single)</TableCell>
                <TableCell className="text-center">
                  {kinchSor.sorSingleBefore}
                </TableCell>
                <AccentCell>{kinchSor.sorSingleAfter}</AccentCell>
              </TableRow>
              <TableRow>
                <TableCell>Sum of Ranks (average)</TableCell>
                <TableCell className="text-center">
                  {kinchSor.sorAverageBefore}
                </TableCell>
                <AccentCell>{kinchSor.sorAverageAfter}</AccentCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>

      {mollerz && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Sistema Mollerz</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Nivel {prevYearLabel}: <Stat>{mollerz.tierBefore ?? "—"}</Stat>
            {" → "}
            {year}: <Stat>{mollerz.tierAfter ?? "—"}</Stat>
            {mollerz.tierBefore !== mollerz.tierAfter &&
              mollerz.tierAfter !== null && <> (subió de nivel en {year})</>}
            .
          </p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Condición</TableHead>
                  <TableHead className="text-center">{prevYearLabel}</TableHead>
                  <TableHead className="text-center">{year}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Averages de speedsolving</TableCell>
                  <TableCell className="text-center">
                    {mollerz.conditionsBefore?.numberOfSpeedsolvingAverages ??
                      "—"}
                    /12
                  </TableCell>
                  <AccentCell>
                    {mollerz.conditionsAfter.numberOfSpeedsolvingAverages}/12
                  </AccentCell>
                </TableRow>
                <TableRow>
                  <TableCell>Means BLD/FMC</TableCell>
                  <TableCell className="text-center">
                    {mollerz.conditionsBefore?.numberOfBLDFMCMeans ?? "—"}/4
                  </TableCell>
                  <AccentCell>
                    {mollerz.conditionsAfter.numberOfBLDFMCMeans}/4
                  </AccentCell>
                </TableRow>
                <TableRow>
                  <TableCell>WR</TableCell>
                  <TableCell className="text-center">
                    {mollerz.conditionsBefore
                      ? mollerz.conditionsBefore.hasWorldRecord
                        ? "Sí"
                        : "No"
                      : "—"}
                  </TableCell>
                  <AccentCell>
                    {mollerz.conditionsAfter.hasWorldRecord ? "Sí" : "No"}
                  </AccentCell>
                </TableRow>
                <TableRow>
                  <TableCell>Podio Mundial</TableCell>
                  <TableCell className="text-center">
                    {mollerz.conditionsBefore
                      ? mollerz.conditionsBefore.hasWorldChampionshipPodium
                        ? "Sí"
                        : "No"
                      : "—"}
                  </TableCell>
                  <AccentCell>
                    {mollerz.conditionsAfter.hasWorldChampionshipPodium
                      ? "Sí"
                      : "No"}
                  </AccentCell>
                </TableRow>
                <TableRow>
                  <TableCell>Eventos ganados</TableCell>
                  <TableCell className="text-center">
                    {mollerz.conditionsBefore?.eventsWon ?? "—"}/17
                  </TableCell>
                  <AccentCell>
                    {mollerz.conditionsAfter.eventsWon}/17
                  </AccentCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {staffTotal > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Organización</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            {pronoun} organizó <Stat>{staff.organized.length}</Stat>{" "}
            {staff.organized.length === 1 ? "competencia" : "competencias"} y
            delegó <Stat>{staff.delegated.length}</Stat>.
          </p>
          {staff.organized.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Organizadas</h3>
              <ul className="list-disc list-inside text-sm space-y-1">
                {staff.organized.map((comp) => (
                  <li key={comp.id}>
                    <Link
                      href={`/competitions/${comp.id}`}
                      className="hover:underline"
                    >
                      {comp.name}
                    </Link>
                    {comp.stateName || comp.cityName
                      ? ` — ${[comp.cityName, comp.stateName].filter(Boolean).join(", ")}`
                      : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {staff.delegated.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Delegadas</h3>
              <ul className="list-disc list-inside text-sm space-y-1">
                {staff.delegated.map((comp) => (
                  <li key={comp.id}>
                    <Link
                      href={`/competitions/${comp.id}`}
                      className="hover:underline"
                    >
                      {comp.name}
                    </Link>
                    {comp.stateName || comp.cityName
                      ? ` — ${[comp.cityName, comp.stateName].filter(Boolean).join(", ")}`
                      : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
