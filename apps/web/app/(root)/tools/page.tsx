import { GitHub } from "@workspace/icons";
import { buttonVariants } from "@workspace/ui/components/button";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Herramientas | Cubing México",
  description:
    "Encuentra herramientas útiles para speedcubers y organizadores de competencias. Explora generadores de certificados, visualizadores de mezclas y más.",
};

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
        <div className="p-6 border-b">
          <h3 className="text-xl font-semibold">Generador de Certificados</h3>
          <p className="my-2">
            Genera certificados personalizados para competencias WCA en México.
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            <Link
              href="https://certificados.cubingmexico.net"
              className={buttonVariants({ variant: "outline", size: "sm" })}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink />
              Sitio Web
            </Link>

            <Link
              href="https://github.com/cubingmexico-org/cubingmexico"
              className={buttonVariants({ variant: "outline", size: "sm" })}
              target="_blank"
              rel="noopener noreferrer"
            >
              <GitHub />
              Código Fuente
            </Link>
          </div>
        </div>
      </div>

      {/* <h2 className="text-2xl font-bold mt-8 mb-4">Herramientas de Desarrolladores Mexicanos</h2>
        <p className="mb-4">Herramientas creadas por desarrolladores de la comunidad mexicana de speedcubing.</p>

        <div className="border rounded-md mb-8">
          <div className="p-6 border-b">
            <h3 className="text-xl font-semibold">CubingMX Stats</h3>
            <p className="my-2">Estadísticas detalladas de speedcubers mexicanos y análisis de competencias.</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="https://stats.cubingmx.org" target="_blank" rel="noopener noreferrer">
                  <ExternalLink />
                  Sitio Web
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="https://github.com/carlosmendez/cubingmx-stats" target="_blank" rel="noopener noreferrer">
                  <GitHub />
                  Código Fuente
                </Link>
              </Button>
            </div>
          </div>

          <div className="p-6 border-b">
            <h3 className="text-xl font-semibold">MX Cubing Calendar</h3>
            <p className="my-2">Calendario interactivo de competencias en México con notificaciones.</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="https://calendar.mxcubing.net" target="_blank" rel="noopener noreferrer">
                  <ExternalLink />
                  Sitio Web
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="https://github.com/anarodriguez/mx-cubing-calendar" target="_blank" rel="noopener noreferrer">
                  <GitHub />
                  Código Fuente (Ana Rodríguez)
                </Link>
              </Button>
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-xl font-semibold">Scramble Visualizer MX</h3>
            <p className="my-2">Visualizador de mezclas con soporte para todos los puzzles oficiales de la WCA.</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="https://scramble.mxcubing.net" target="_blank" rel="noopener noreferrer">
                  <ExternalLink />
                  Sitio Web
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="https://github.com/migueltorres/scramble-visualizer" target="_blank" rel="noopener noreferrer">
                  <GitHub />
                  Código Fuente (Miguel Torres)
                </Link>
              </Button>
            </div>
          </div>
        </div> */}

      {/* <h2 className="text-2xl font-bold mt-8 mb-4">Herramientas para Estadísticas</h2>
        <p className="mb-4">Herramientas para analizar y visualizar estadísticas de speedcubing.</p>

        <div className="border rounded-md mb-8">
          <div className="p-6 border-b">
            <h3 className="text-xl font-semibold">Comp Kinchs</h3>
            <p className="my-2">Calcula y compara puntajes Kinch de competidores en eventos WCA.</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="https://comp-kinch.sylvermyst.com/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink />
                  Sitio Web
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="https://github.com/DanielEgdal/comp-kinchs" target="_blank" rel="noopener noreferrer">
                  <GitHub />
                  Código Fuente (Daniel Wallin)
                </Link>
              </Button>
            </div>
          </div>

          <div className="p-6 border-b">
            <h3 className="text-xl font-semibold">WCA Statistics</h3>
            <p className="my-2">Colección de estadísticas interesantes basadas en la base de datos de la WCA.</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="https://statistics.worldcubeassociation.org" target="_blank" rel="noopener noreferrer">
                  <ExternalLink />
                  Sitio Web
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="https://github.com/thewca/statistics" target="_blank" rel="noopener noreferrer">
                  <GitHub />
                  Código Fuente (WCA Statistics Team)
                </Link>
              </Button>
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-xl font-semibold">Cubing Time Machine</h3>
            <p className="my-2">Explora cómo han evolucionado los récords a lo largo del tiempo.</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="https://timemachine.cubing.net" target="_blank" rel="noopener noreferrer">
                  <ExternalLink />
                  Sitio Web
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link
                  href="https://github.com/sebastianotronto/cubing-time-machine"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <GitHub />
                  Código Fuente (Sebastiano Tronto)
                </Link>
              </Button>
            </div>
          </div>
        </div> */}

      {/* <h2 className="text-2xl font-bold mt-8 mb-4">Herramientas para Organización de Competencias</h2>
        <p className="mb-4">Herramientas útiles para organizar competencias WCA.</p>

        <div className="border rounded-md mb-8">
          <div className="p-6 border-b">
            <h3 className="text-xl font-semibold">Groupifier</h3>
            <p className="my-2">Herramienta para crear grupos y asignar tareas en competencias WCA.</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="https://groupifier.jonatanklosko.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink />
                  Sitio Web
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="https://github.com/jonatanklosko/groupifier" target="_blank" rel="noopener noreferrer">
                  <GitHub />
                  Código Fuente (Jonatan Kłosko)
                </Link>
              </Button>
            </div>
          </div>

          <div className="p-6 border-b">
            <h3 className="text-xl font-semibold">Badgifier</h3>
            <p className="my-2">Genera credenciales para competidores y staff de competencias.</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="outline" size="sm" asChild>
                <Link href="https://badgifier.cubing.net" target="_blank" rel="noopener noreferrer">
                  <ExternalLink />
                  Sitio Web
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="https://github.com/jonatanklosko/badgifier" target="_blank" rel="noopener noreferrer">
                  <GitHub />
                  Código Fuente (Jonatan Kłosko)
                </Link>
              </Button>
            </div>
          </div>

          <div className="p-6">
            <h3 className="text-xl font-semibold">TNoodle (Scrambles)</h3>
            <p className="my-2">
              Programa oficial de mezclas para competencias WCA. Permite generar mezclas para todos los eventos
              oficiales.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="outline" size="sm" asChild>
                <Link
                  href="https://www.worldcubeassociation.org/regulations/scrambles/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink />
                  Sitio Web
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="https://github.com/thewca/tnoodle" target="_blank" rel="noopener noreferrer">
                  <GitHub />
                  Código Fuente (WCA Software Team)
                </Link>
              </Button>
            </div>
          </div>
        </div> */}

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
            <GitHub />
            GitHub
          </Link>
        </div>
      </div>
    </main>
  );
}
