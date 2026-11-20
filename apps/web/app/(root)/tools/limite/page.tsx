import Link from "next/link";
import type { Metadata } from "next";
import { LimitCalculator } from "./_components/limit-calculator";

export const metadata: Metadata = {
  title: "Tiempo límite acumulativo | Cubing México",
  description:
    "Calcula cuánto tiempo te queda bajo un límite de tiempo acumulativo de la WCA. Escribe el límite total y el tiempo de cada intento.",
};

export default function Page(): React.JSX.Element {
  return (
    <main className="grow container mx-auto px-4 py-8">
      <p className="mb-4 text-sm text-muted-foreground">
        <Link
          href="/tools"
          className="underline underline-offset-2 hover:text-foreground"
        >
          ← Ver todas las herramientas
        </Link>
      </p>

      <h1 className="text-3xl font-bold mb-2">Tiempo límite acumulativo</h1>
      <p className="mb-8 text-muted-foreground">
        Escribe el límite total y el tiempo de cada intento para saber cuánto
        tiempo te queda.
      </p>

      <LimitCalculator />
    </main>
  );
}
