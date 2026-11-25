import { SiGithub } from "@icons-pack/react-simple-icons";
import { buttonVariants } from "@workspace/ui/components/button";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Herramientas | Cubing México",
  description:
    "Herramientas de Cubing México y de la comunidad para competidores y organizadores.",
};

function ToolLinks({
  siteHref,
  sourceHref,
  sourceLabel = "Código fuente",
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
        Sitio web
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
      <h1 className="text-3xl font-bold mb-4">Herramientas</h1>

      <p className="mb-4">
        Una selección de herramientas útiles para competidores y organizadores.
        No es una lista completa.
      </p>

      <p className="mb-8">
        Las hemos usado o recomendamos en la comunidad. Donde se pueda, dejamos
        enlace al sitio y al código fuente.
      </p>

      <h2 className="text-2xl font-bold mt-8 mb-4">De Cubing México</h2>
      <p className="mb-4">Hechas por nosotros.</p>

      <div className="border rounded-md mb-8">
        <div className="p-6 border-b">
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

        <div className="p-6 border-b last:border-b-0">
          <h3 className="text-xl font-semibold">Tiempo límite acumulativo</h3>
          <p className="my-2">
            Calcula cuánto tiempo te queda bajo un límite de tiempo acumulativo
            de la WCA a partir del límite total y cada intento.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Link
              href="/tools/limite"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Abrir
            </Link>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold mt-8 mb-4">Estadísticas</h2>
      <p className="mb-4">Para analizar resultados y puntajes.</p>

      <div className="border rounded-md mb-8">
        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold">Comp Kinchs</h3>
          <p className="my-2">
            Calcula y compara puntajes Kinch de competidores en eventos WCA.
          </p>
          <ToolLinks
            siteHref="https://comp-kinch.sylvermyst.com/"
            sourceHref="https://github.com/AlphaSheep/Comp-Kinch"
            sourceLabel="Código fuente (Brendan Gray)"
          />
        </div>

        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold">WCA Statistics</h3>
          <p className="my-2">
            Estadísticas a partir de la base de datos de la WCA.
          </p>
          <ToolLinks
            siteHref="https://statistics.worldcubeassociation.org"
            sourceHref="https://github.com/thewca/statistics"
            sourceLabel="Código fuente (WCA Software Team)"
          />
        </div>
      </div>

      <h2 className="text-2xl font-bold mt-8 mb-4">
        Organización de competencias
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
            sourceLabel="Código fuente (Jonatan Kłosko)"
          />
        </div>

        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold">Delegate Dashboard</h3>
          <p className="my-2">
            Panel externo de rondas y asignaciones. Útil como alternativa o
            referencia junto a Organización → Grupos.
          </p>
          <ToolLinks
            siteHref="https://delegate-dashboard.netlify.app/"
            sourceHref="https://github.com/coder13/delegateDashboard"
            sourceLabel="Código fuente (Caleb Hoover)"
          />
        </div>

        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold">Badgifier</h3>
          <p className="my-2">
            Credenciales para competidores y staff. Alternativa a Organización →
            Gafetes.
          </p>
          <ToolLinks
            siteHref="https://badgifier.dallasmcneil.com/"
            sourceHref="https://github.com/DallasMcNeil/Badgifier"
            sourceLabel="Código fuente (Dallas McNeil)"
          />
        </div>

        <div className="p-6">
          <h3 className="text-xl font-semibold">TNoodle (Scrambles)</h3>
          <p className="my-2">
            Generador oficial de mezclas WCA. Organización → Grupos puede
            enlazarlo en local; no lo reemplaza.
          </p>
          <ToolLinks
            siteHref="https://www.worldcubeassociation.org/regulations/scrambles/"
            sourceHref="https://github.com/thewca/tnoodle"
            sourceLabel="Código fuente (WCA Software Team)"
          />
        </div>
      </div>

      <div className="mt-12 bg-muted/50 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">¿Tienes una herramienta?</h2>
        <p className="mb-4">
          Si hiciste algo útil para el cubing y quieres que aparezca aquí,
          contáctanos.
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
