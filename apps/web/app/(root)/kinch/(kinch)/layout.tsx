import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";

export const metadata: Metadata = {
  title: "Kinch Ranks | Cubing México",
  description:
    "Encuentra los mejores cuberos de México en cada evento de la WCA. Filtra por estado, género y más.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grow container mx-auto px-4 py-8">
      <div className="flex flex-col gap-4 mb-6">
        <PageHeading>Kinch Ranks nacionales</PageHeading>
        <p>
          Los Kinch Ranks son un sistema de clasificación innovador diseñado
          para evaluar la habilidad de un cubero en los 17 eventos oficiales de
          la WCA. Este sistema utiliza un enfoque único para calcular la
          puntuación de cada competidor en función de sus resultados en cada
          evento. Cada evento se puntúa en una escala del 0 al 100, considerando
          tanto los{" "}
          <Link
            className="text-muted-foreground hover:underline"
            href="/records"
          >
            récords nacionales (NR)
          </Link>{" "}
          como los récords personales (PR) de los competidores. A través de este
          enfoque, se busca equilibrar la clasificación entre todos los eventos,
          eliminando las desventajas percibidas en sistemas tradicionales como
          el{" "}
          <Link
            className="text-muted-foreground hover:underline"
            href="/sor/single"
          >
            SOR
          </Link>{" "}
          y promoviendo una visión más integral de las habilidades en la
          resolución de rompecabezas.
        </p>
      </div>
      <div className="grid gap-6">{children}</div>
    </main>
  );
}
