import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Récords | Cubing México",
  description:
    "Encuentra los récords nacionales de speedcubing en México y descubre los mejores cuberos del país.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grow container mx-auto px-4 py-8">
      {children}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">
          Acerca de los Récords de la WCA
        </h2>
        <p className="mb-4">
          Los récords de la World Cube Association (WCA) son los tiempos más
          rápidos logrados para resolver varios rompecabezas en competencias
          oficiales de la WCA. Los récords se reconocen tanto para resoluciones
          individuales como para promedios en cada evento.
        </p>
        <p className="mb-4">
          Los récords mostrados en esta página representan los récords
          nacionales actuales de México. Estos tiempos muestran las increíbles
          habilidades de los speedcubers mexicanos en diferentes eventos de la
          WCA.
        </p>
        <p>
          Para obtener más información sobre las regulaciones y récords de la
          WCA, por favor visite el{" "}
          <Link
            href="https://www.worldcubeassociation.org/"
            className="text-link hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            sitio web oficial de la WCA
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
