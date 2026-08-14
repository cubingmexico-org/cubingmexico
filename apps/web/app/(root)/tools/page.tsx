import { SiGithub } from "@icons-pack/react-simple-icons";
import { buttonVariants } from "@workspace/ui/components/button";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Herramientas | Cubing México",
  description:
    "Encuentra herramientas útiles para speedcubers y organizadores de competencias. Explora Organización (certificados y gafetes), visualizadores de mezclas y más.",
};

function ToolLinks({
  siteHref,
  sourceHref,
  sourceLabel = "Código Fuente",
}: {
  siteHref: string;
  sourceHref: string;
  sourceLabel?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2 mt-4">
      <Link
        href={siteHref}
        className={buttonVariants({ variant: "outline", size: "sm" })}
        target="_blank"
        rel="noopener noreferrer"
      >
        <ExternalLink />
        Sitio Web
      </Link>
      <Link
        href={sourceHref}
        className={buttonVariants({ variant: "outline", size: "sm" })}
        target="_blank"
        rel="noopener noreferrer"
      >
        <SiGithub />
        {sourceLabel}
      </Link>
    </div>
  );
}

export default function Page(): React.JSX.Element {
  return (
    <main className="grow container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4">
        Herramientas Externas para Cubing
      </h1>

      <p className="mb-4">
        Esta página contiene una lista no exhaustiva de herramientas que pueden
        ser útiles para speedcubers y organizadores de competencias.
      </p>

      <p className="mb-8">
        Todas las herramientas en esta lista han sido utilizadas por la
        comunidad de speedcubing y son recomendadas por Cubing México. Para cada
        herramienta, se incluyen enlaces al sitio web, guía de uso (cuando está
        disponible) y repositorio de código fuente.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4">
        Herramientas de Cubing México
      </h2>
      <p className="mb-4">
        Herramientas desarrolladas por el equipo de Cubing México.
      </p>

      <div className="border rounded-md mb-8">
        <div className="p-6 border-b last:border-b-0">
          <h3 className="text-xl font-semibold">Organización</h3>
          <p className="my-2">
            Suite de Cubing México para organizadores: certificados y gafetes
            para competencias WCA.
          </p>
          <ToolLinks
            siteHref="https://certificados.cubingmexico.net"
            sourceHref="https://github.com/cubingmexico-org/cubingmexico/tree/development/apps/organizer"
          />
        </div>
      </div>

      <h2 className="text-2xl font-bold mt-8 mb-4">
        Herramientas para Estadísticas
      </h2>
      <p className="mb-4">
        Herramientas para analizar y visualizar estadísticas de speedcubing.
      </p>

      <div className="border rounded-md mb-8">
        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold">Comp Kinchs</h3>
          <p className="my-2">
            Calcula y compara puntajes Kinch de competidores en eventos WCA.
          </p>
          <ToolLinks
            siteHref="https://comp-kinch.sylvermyst.com/"
            sourceHref="https://github.com/AlphaSheep/Comp-Kinch"
            sourceLabel="Código Fuente (Brendan Gray)"
          />
        </div>

        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold">WCA Statistics</h3>
          <p className="my-2">
            Colección de estadísticas interesantes basadas en la base de datos
            de la WCA.
          </p>
          <ToolLinks
            siteHref="https://statistics.worldcubeassociation.org"
            sourceHref="https://github.com/thewca/statistics"
            sourceLabel="Código Fuente (WCA Software Team)"
          />
        </div>
      </div>

      <h2 className="text-2xl font-bold mt-8 mb-4">
        Herramientas para Organización de Competencias
      </h2>
      <p className="mb-4">
        Alternativas externas. Para certificados y gafetes de Cubing México usa{" "}
        <Link
          href="https://certificados.cubingmexico.net"
          className="underline underline-offset-2"
          target="_blank"
          rel="noopener noreferrer"
        >
          Organización
        </Link>
        .
      </p>

      <div className="border rounded-md mb-8">
        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold">Groupifier</h3>
          <p className="my-2">
            Herramienta externa para crear grupos, asignar tareas e imprimir
            scorecards en competencias WCA.
          </p>
          <ToolLinks
            siteHref="https://groupifier.jonatanklosko.com"
            sourceHref="https://github.com/jonatanklosko/groupifier"
            sourceLabel="Código Fuente (Jonatan Kłosko)"
          />
        </div>

        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold">Delegate Dashboard</h3>
          <p className="my-2">
            Panel externo orientado a rondas y asignaciones (inspiración UX de
            Organización → Grupos). Útil como alternativa o referencia.
          </p>
          <ToolLinks
            siteHref="https://delegate-dashboard.netlify.app/"
            sourceHref="https://github.com/coder13/delegateDashboard"
            sourceLabel="Código Fuente (Caleb Hoover)"
          />
        </div>

        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold">Badgifier</h3>
          <p className="my-2">
            Genera credenciales para competidores y staff de competencias.
            Alternativa a Organización → Gafetes.
          </p>
          <ToolLinks
            siteHref="https://badgifier.dallasmcneil.com/"
            sourceHref="https://github.com/DallasMcNeil/Badgifier"
            sourceLabel="Código Fuente (Dallas McNeil)"
          />
        </div>

        <div className="p-6">
          <h3 className="text-xl font-semibold">TNoodle (Scrambles)</h3>
          <p className="my-2">
            Programa oficial de mezclas para competencias WCA. Organización →
            Grupos exporta metadatos y enlaza a TNoodle local; no reemplaza el
            generador.
          </p>
          <ToolLinks
            siteHref="https://www.worldcubeassociation.org/regulations/scrambles/"
            sourceHref="https://github.com/thewca/tnoodle"
            sourceLabel="Código Fuente (WCA Software Team)"
          />
        </div>
      </div>

      <div className="mt-12 bg-muted/50 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">¿Tienes una herramienta?</h2>
        <p className="mb-4">
          Si has desarrollado una herramienta relacionada con el cubing y te
          gustaría que aparezca en esta página, contáctanos. Apoyamos a los
          desarrolladores de la comunidad y nos encantaría mostrar tu trabajo.
        </p>
        <div className="flex gap-4">
          <Link
            href="https://www.facebook.com/cubingmexico"
            className={buttonVariants({ variant: "default" })}
          >
            Contactar
          </Link>
          <Link
            href="https://github.com/cubingmexico-org"
            className={buttonVariants({ variant: "outline" })}
            target="_blank"
            rel="noopener noreferrer"
          >
            <SiGithub />
            GitHub
          </Link>
        </div>
      </div>
    </main>
  );
}
