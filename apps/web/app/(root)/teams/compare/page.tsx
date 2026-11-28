import type { Metadata } from "next";
import { DeprecatedEventsSwitch } from "@/components/deprecated-events-switch";
import {
  collectiveRefsEqual,
  parseCollectiveRef,
  type CollectiveRef,
} from "@/lib/collective-compare";
import { eventScopeFromDeprecated } from "@/lib/official-events";
import { deprecatedParser } from "@/lib/search-params";
import { createSearchParamsCache } from "nuqs/server";
import { getGroupInfo } from "@/app/(root)/groups/_lib/queries";
import { getTeamInfo } from "../[stateId]/_lib/queries";
import { TeamComparePicker } from "./_components/team-compare-picker";
import { TeamCompareContent } from "./_components/team-compare-content";
import { getCollectiveCompareOptions } from "./_lib/queries";

const searchParamsCache = createSearchParamsCache({
  deprecated: deprecatedParser,
});

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function resolveCollective(ref: CollectiveRef | null) {
  if (!ref) return null;

  if (ref.kind === "team") {
    const info = await getTeamInfo(ref.id);
    return info ? { ref, name: info.name } : null;
  }

  const info = await getGroupInfo(ref.id);
  if (!info || info.kind !== ref.kind) return null;
  return { ref, name: info.name };
}

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const params = await searchParams;
  const [a, b] = await Promise.all([
    resolveCollective(parseCollectiveRef(params.a)),
    resolveCollective(parseCollectiveRef(params.b)),
  ]);

  const title =
    a && b
      ? `${a.name} vs ${b.name} | Cubing México`
      : "Comparar colectivos | Cubing México";

  return {
    title,
    description:
      "Compara resultados y enfrentamientos directos entre teams, comunidades y patrocinadores.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  const { deprecated } = searchParamsCache.parse(params);
  const aRef = parseCollectiveRef(params.a);
  const bRef = parseCollectiveRef(params.b);

  const [a, b, options] = await Promise.all([
    resolveCollective(aRef),
    resolveCollective(bRef),
    getCollectiveCompareOptions(),
  ]);

  let message: string | null = null;
  if ((params.a && !a) || (params.b && !b)) {
    message = "No encontramos uno de los colectivos seleccionados.";
  } else if (a && b && collectiveRefsEqual(a.ref, b.ref)) {
    message = "Selecciona dos colectivos distintos.";
  } else if (!a || !b) {
    message = "Selecciona dos colectivos para compararlos.";
  }

  return (
    <>
      <h1 className="text-center font-semibold text-2xl mb-6">
        Comparar colectivos
      </h1>
      <TeamComparePicker
        options={options}
        a={a?.ref ?? null}
        b={b?.ref ?? null}
      />
      {message || !a || !b ? (
        <p className="text-center text-muted-foreground mt-8">{message}</p>
      ) : (
        <>
          <div className="flex justify-center mb-6">
            <DeprecatedEventsSwitch />
          </div>
          <TeamCompareContent
            a={a.ref}
            b={b.ref}
            scope={eventScopeFromDeprecated(deprecated)}
          />
        </>
      )}
    </>
  );
}
