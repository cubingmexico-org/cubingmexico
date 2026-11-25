import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Récords | Cubing México",
  description:
    "Récords nacionales (NR) de México en competencias oficiales de la WCA.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grow container mx-auto px-4 py-8">
      {children}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Sobre los récords</h2>
        <p className="mb-4">
          Aquí ves los récords nacionales actuales de México (single y average)
          en competencias oficiales de la WCA.
        </p>
        <p>
          El reglamento y la lista global están en el{" "}
          <Link
            href="https://www.worldcubeassociation.org/"
            className="underline text-link hover:text-link/80"
            target="_blank"
            rel="noopener noreferrer"
          >
            sitio de la WCA
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
