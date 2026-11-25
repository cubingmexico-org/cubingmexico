import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acerca de | Cubing México",
  description:
    "Rankings estatales, récords, Teams y el calendario WCA de México, con datos de la World Cube Association.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grow container mx-auto px-4 py-8">
      <h1 className="text-center text-4xl pb-4 font-semibold">
        Acerca de Cubing México
      </h1>
      <p className="pb-2">
        Cubing México es un sitio de la comunidad de speedcubing en México. Aquí
        puedes ver rankings estatales, récords, Teams, resultados en vivo y el
        calendario de competencias oficiales.
      </p>
      <p className="pb-2">
        Los datos vienen de la{" "}
        <Link
          className="hover:underline text-accent-foreground"
          href="https://www.worldcubeassociation.org"
        >
          World Cube Association
        </Link>
        , que organiza las competencias oficiales y sus eventos. La idea es
        simple: tener a la mano lo que pasa en el speedcubing mexicano y
        celebrar lo que logran los competidores del país.
      </p>
      {children}
      <Image
        alt="Competidores de speedcubing"
        className="w-full object-cover object-center rounded mt-4"
        height={900}
        src="/competidores.jpg"
        width={1080}
        priority
      />
    </main>
  );
}
