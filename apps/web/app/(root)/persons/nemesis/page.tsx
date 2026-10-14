import type { Metadata } from "next";
import Link from "next/link";
import { ChartBar, Sparkles } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { getPerson } from "@/db/queries";
import { parseWcaId } from "@/lib/wca-id";
import { getNemesisReport, getNemesizedReport } from "../_lib/nemesis-queries";
import { NemesesList } from "../_components/nemeses-list";
import { NemesizedList } from "../_components/nemesized-list";
import { NemesisPicker } from "./_components/nemesis-picker";
import { DeprecatedEventsSwitch } from "@/components/deprecated-events-switch";
import { eventScopeFromDeprecated } from "@/lib/official-events";
import { deprecatedParser } from "@/lib/search-params";
import { createSearchParamsCache } from "nuqs/server";

const searchParamsCache = createSearchParamsCache({
  deprecated: deprecatedParser,
});

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function resolvePerson(wcaId: string | null) {
  if (!wcaId) return null;
  const person = await getPerson(wcaId);
  return person ? { wcaId, name: person.name } : null;
}

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const params = await searchParams;
  const person = await resolvePerson(parseWcaId(params.id));

  return {
    title: person
      ? `Némesis de ${person.name ?? person.wcaId} | Cubing México`
      : "Buscador de némesis | Cubing México",
    description:
      "Encuentra a los competidores que te superan en todos tus eventos.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  const person = await resolvePerson(parseWcaId(params.id));
  const { deprecated } = searchParamsCache.parse(params);
  const scope = eventScopeFromDeprecated(deprecated);
  const [report, nemesized] = person
    ? await Promise.all([
        getNemesisReport(person.wcaId, scope),
        getNemesizedReport(person.wcaId, scope),
      ])
    : [null, null];

  return (
    <>
      <h1 className="text-center font-semibold text-2xl mb-2">
        Buscador de némesis
      </h1>
      <p className="text-center text-muted-foreground mb-6">
        Tu némesis es alguien que te supera en single y en average en todos los
        eventos en los que has competido.
      </p>
      <div className="flex justify-center mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/persons/nemesis/stats">
            <ChartBar className="size-4" />
            Ver estadísticas de némesis
          </Link>
        </Button>
      </div>
      <NemesisPicker value={person} />
      <div className="flex justify-center mb-6">
        <DeprecatedEventsSwitch />
      </div>
      {params.id && !person ? (
        <p className="text-center text-muted-foreground">
          No encontramos al competidor seleccionado.
        </p>
      ) : person && report && nemesized ? (
        <div className="flex flex-col gap-8">
          <div className="flex justify-center">
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/persons/nemesis/what-if?id=${person.wcaId}${deprecated ? "&deprecated=true" : ""}`}
                prefetch={false}
              >
                <Sparkles className="size-4" />
                ¿Y si...?
              </Link>
            </Button>
          </div>
          <NemesesList
            targetWcaId={person.wcaId}
            targetName={person.name ?? person.wcaId}
            report={report}
          />
          <NemesizedList
            targetWcaId={person.wcaId}
            targetName={person.name ?? person.wcaId}
            report={nemesized}
          />
        </div>
      ) : (
        <p className="text-center text-muted-foreground">
          Selecciona un competidor para ver sus némesis.
        </p>
      )}
    </>
  );
}
