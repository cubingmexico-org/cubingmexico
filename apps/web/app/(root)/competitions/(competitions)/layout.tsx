import Link from "next/link";
import { PageHeading } from "@/components/page-heading";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="flex flex-col gap-4 mb-6">
        <PageHeading>Competencias oficiales de la WCA en México</PageHeading>
        <p>
          Listado de competencias oficiales de la{" "}
          <Link
            className="underline text-link hover:text-link/80"
            href="https://www.worldcubeassociation.org/"
          >
            World Cube Association
          </Link>{" "}
          en México: fechas, sedes y resultados. Filtra por estado o busca la
          que te queda cerca.
        </p>
      </div>
      {children}
    </>
  );
}
