import type { Metadata } from "next";
import { getTeams } from "../(teams)/_lib/queries";
import { getTeamInfo } from "../[stateId]/_lib/queries";
import { TeamComparePicker } from "./_components/team-compare-picker";
import { TeamCompareContent } from "./_components/team-compare-content";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function parseTeamId(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = raw?.trim().toUpperCase();
  return id && /^[A-Z]{2,3}$/.test(id) ? id : null;
}

async function resolveTeam(stateId: string | null) {
  if (!stateId) return null;
  const info = await getTeamInfo(stateId);
  return info ? { stateId, name: info.name } : null;
}

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const params = await searchParams;
  const [a, b] = await Promise.all([
    resolveTeam(parseTeamId(params.a)),
    resolveTeam(parseTeamId(params.b)),
  ]);

  const title =
    a && b
      ? `${a.name} vs ${b.name} | Cubing México`
      : "Comparar teams | Cubing México";

  return {
    title,
    description:
      "Compara resultados y enfrentamientos directos entre dos teams estatales.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  const [a, b, teams] = await Promise.all([
    resolveTeam(parseTeamId(params.a)),
    resolveTeam(parseTeamId(params.b)),
    getTeams(),
  ]);

  let message: string | null = null;
  if ((params.a && !a) || (params.b && !b)) {
    message = "No encontramos uno de los teams seleccionados.";
  } else if (a && b && a.stateId === b.stateId) {
    message = "Selecciona dos teams distintos.";
  } else if (!a || !b) {
    message = "Selecciona dos teams para compararlos.";
  }

  return (
    <>
      <h1 className="text-center font-semibold text-2xl mb-6">
        Comparar teams
      </h1>
      <TeamComparePicker
        teams={teams.map((team) => ({
          id: team.id,
          name: team.name,
          image: team.image,
        }))}
        a={a?.stateId ?? null}
        b={b?.stateId ?? null}
      />
      {message || !a || !b ? (
        <p className="text-center text-muted-foreground mt-8">{message}</p>
      ) : (
        <TeamCompareContent a={a.stateId} b={b.stateId} />
      )}
    </>
  );
}
