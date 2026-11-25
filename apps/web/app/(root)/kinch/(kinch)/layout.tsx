import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";

export const metadata: Metadata = {
  title: "Kinch Ranks | Cubing México",
  description:
    "Clasificación Kinch nacional: cada evento vale de 0 a 100 según qué tan cerca estés del récord nacional.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grow container mx-auto px-4 py-8">
      <div className="flex flex-col gap-4 mb-6">
        <PageHeading>Kinch Ranks nacionales</PageHeading>
        <p>
          En Kinch, cada evento se puntúa de 0 a 100 según qué tan cerca estás
          del{" "}
          <Link
            className="underline text-link hover:text-link/80"
            href="/records"
          >
            récord nacional (NR)
          </Link>{" "}
          con tu mejor resultado (PR). El total es el promedio de todos los
          eventos: sirve para comparar rendimiento general sin el sesgo del{" "}
          <Link
            className="underline text-link hover:text-link/80"
            href="/sor/single"
          >
            Sum of Ranks
          </Link>
          .
        </p>
      </div>
      <div className="grid gap-6">{children}</div>
    </main>
  );
}
