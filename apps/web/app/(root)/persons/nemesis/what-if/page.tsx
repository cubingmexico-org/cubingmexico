import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { getEvents, getPerson } from "@/db/queries";
import { parseWcaId } from "@/lib/wca-id";
import {
  applyWhatIfOverrides,
  hasOverrides,
  parseWhatIfParams,
} from "@/lib/attempt-input";
import {
  findNemesisReport,
  getNemesisReport,
  getPersonRecordValues,
} from "../../_lib/nemesis-queries";
import { NemesisPicker } from "../_components/nemesis-picker";
import { WhatIfForm } from "./_components/what-if-form";
import { WhatIfResults } from "./_components/what-if-results";

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
      ? `¿Y si...? Némesis de ${person.name ?? person.wcaId} | Cubing México`
      : "Simulador de némesis | Cubing México",
    description:
      "Cambia tus récords personales y descubre cómo cambiarían tus némesis.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function Page({ searchParams }: Props) {
  const params = await searchParams;
  const person = await resolvePerson(parseWcaId(params.id));

  return (
    <>
      <h1 className="text-center font-semibold text-2xl mb-2">
        Simulador de némesis
      </h1>
      <p className="text-center text-muted-foreground mb-6">
        ¿Y si mejoras tus tiempos? Cambia tus récords personales y descubre
        cuántos némesis te quedarían.
      </p>
      <NemesisPicker value={person} basePath="/persons/nemesis/what-if" />
      {params.id && !person ? (
        <p className="text-center text-muted-foreground">
          No encontramos al competidor seleccionado.
        </p>
      ) : person ? (
        <WhatIfContent
          wcaId={person.wcaId}
          name={person.name ?? person.wcaId}
          params={params}
        />
      ) : (
        <p className="text-center text-muted-foreground">
          Selecciona un competidor para simular sus némesis.
        </p>
      )}
    </>
  );
}

async function WhatIfContent({
  wcaId,
  name,
  params,
}: {
  wcaId: string;
  name: string;
  params: Record<string, string | string[] | undefined>;
}) {
  const [events, real] = await Promise.all([
    getEvents(),
    getPersonRecordValues(wcaId),
  ]);

  const overrides = parseWhatIfParams(
    params,
    events.map((event) => event.id),
  );
  const simulated = hasOverrides(overrides);

  const [baseline, hypothetical] = await Promise.all([
    getNemesisReport(wcaId),
    simulated
      ? findNemesisReport({
          ...applyWhatIfOverrides(real, overrides),
          excludeWcaId: wcaId,
        })
      : null,
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-center">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/persons/nemesis?id=${wcaId}`}>
            <ArrowLeft className="size-4" />
            Ver némesis reales
          </Link>
        </Button>
      </div>
      <WhatIfForm
        key={JSON.stringify(overrides)}
        wcaId={wcaId}
        events={events}
        real={real}
        overrides={overrides}
      />
      <WhatIfResults
        targetWcaId={wcaId}
        targetName={name}
        baseline={baseline}
        hypothetical={hypothetical}
      />
    </div>
  );
}
