import type { Metadata } from "next";
import { getPerson } from "@/db/queries";
import { parseWcaId } from "@/lib/wca-id";
import { ComparePicker } from "./_components/compare-picker";
import { CompareContent } from "./_components/compare-content";
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
  const [a, b] = await Promise.all([
    resolvePerson(parseWcaId(params.a)),
    resolvePerson(parseWcaId(params.b)),
  ]);

  const title =
    a && b
      ? `${a.name ?? a.wcaId} vs ${b.name ?? b.wcaId} | Cubing México`
      : "Comparar competidores | Cubing México";

  return {
    title,
    description:
      "Compara resultados y enfrentamientos directos entre dos competidores.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  const aId = parseWcaId(params.a);
  const bId = parseWcaId(params.b);
  const { deprecated } = searchParamsCache.parse(params);

  const [a, b] = await Promise.all([resolvePerson(aId), resolvePerson(bId)]);

  let message: string | null = null;
  if ((params.a && !a) || (params.b && !b)) {
    message = "No encontramos a uno de los competidores seleccionados.";
  } else if (a && b && a.wcaId === b.wcaId) {
    message = "Selecciona dos competidores distintos.";
  } else if (!a || !b) {
    message = "Selecciona dos competidores para compararlos.";
  }

  return (
    <>
      <h1 className="text-center font-semibold text-2xl mb-6">
        Comparar competidores
      </h1>
      <ComparePicker a={a} b={b} />
      {message || !a || !b ? (
        <p className="text-center text-muted-foreground mt-8">{message}</p>
      ) : (
        <>
          <div className="flex justify-center mb-6">
            <DeprecatedEventsSwitch />
          </div>
          <CompareContent
            a={a.wcaId}
            b={b.wcaId}
            scope={eventScopeFromDeprecated(deprecated)}
          />
        </>
      )}
    </>
  );
}
