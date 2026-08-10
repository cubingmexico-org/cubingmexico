import { AMS_ORGANIZER_EXPERIENCE_TABLE_URL } from "@/lib/organizer-level";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Organizadores | Cubing México",
  description:
    "Directorio de organizadores mexicanos de la WCA con niveles de experiencia según la tabla de la Asociación Mexicana de Speedcubing (AMS).",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grow container mx-auto px-4 py-8">
      <div className="flex flex-col gap-4 mb-6">
        <h1 className="text-3xl font-bold">Organizadores</h1>
        <p className="text-muted-foreground">
          Directorio de todos los organizadores de competencias de la WCA en
          México. El nivel de experiencia (Debutante, Super, Experto, Maestro,
          Leyenda) se calcula según la{" "}
          <span className="text-foreground">
            Tabla de Experiencia del Organizador
          </span>{" "}
          de la{" "}
          <span className="text-foreground">
            Asociación Mexicana de Speedcubing (AMS)
          </span>
          , usando el número de competencias organizadas en los últimos 2 años.
          Quienes no hayan organizado en ese periodo aparecen como Inactivo.{" "}
          <Link
            href={AMS_ORGANIZER_EXPERIENCE_TABLE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-4 hover:text-primary/80"
          >
            Ver tabla oficial (AMS)
          </Link>
          .
        </p>
      </div>
      <div className="grid gap-6">{children}</div>
    </main>
  );
}
