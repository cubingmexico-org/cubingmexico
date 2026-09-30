import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { getPerson } from "@/db/queries";
import { parseWcaId } from "@/lib/wca-id";
import { getNemesisReport } from "../_lib/nemesis-queries";
import { NemesesList } from "../_components/nemeses-list";
import { NemesisPicker } from "./_components/nemesis-picker";

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
  const report = person ? await getNemesisReport(person.wcaId) : null;

  return (
    <>
      <h1 className="text-center font-semibold text-2xl mb-2">
        Buscador de némesis
      </h1>
      <p className="text-center text-muted-foreground mb-6">
        Tu némesis es alguien que te supera en single y en average en todos los
        eventos en los que has competido.
      </p>
      <NemesisPicker value={person} />
      {params.id && !person ? (
        <p className="text-center text-muted-foreground">
          No encontramos al competidor seleccionado.
        </p>
      ) : person && report ? (
        <div className="flex flex-col gap-4">
          <div className="flex justify-center">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/persons/nemesis/what-if?id=${person.wcaId}`}>
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
        </div>
      ) : (
        <p className="text-center text-muted-foreground">
          Selecciona un competidor para ver sus némesis.
        </p>
      )}
    </>
  );
}
