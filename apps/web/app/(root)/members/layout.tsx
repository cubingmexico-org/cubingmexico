import { buttonVariants } from "@workspace/ui/components/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@workspace/ui/components/card";
import {
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  Table,
} from "@workspace/ui/components/table";
import { ExternalLink, Medal } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Miembros | Cubing México",
  description:
    "Directorio de miembros Mollerz mexicanos de la WCA y sus niveles de reconocimiento.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grow container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            Sistema de Membresías Mollerz
          </h1>
          <p className="text-muted-foreground">
            Un sistema alternativo de reconocimiento para speedcubers basado en
            sus logros
          </p>
        </div>
        <Link
          className={buttonVariants({ variant: "outline" })}
          href="https://sam596.github.io/WCA-Stats/mollerzmembership/Bronze"
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink />
          Ver sistema original
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>¿Qué es el Sistema de Membresías Mollerz?</CardTitle>
            <CardDescription>
              Una forma alternativa de reconocer logros en speedcubing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              El Sistema de Membresías Mollerz es una vista alternativa de un
              sistema de &quot;membresía&quot; para la WCA, ideado originalmente
              por{" "}
              <Link
                href="https://www.worldcubeassociation.org/persons/2011MOLL01"
                className="hover:underline text-muted-foreground"
                target="_blank"
              >
                James Molloy
              </Link>
              . Este sistema reconoce diferentes niveles de logros en el
              speedcubing, desde completar todos los eventos (Bronce) hasta
              ganar todos los eventos (Diamante).
            </p>
            <p className="mb-4">
              A diferencia de los rankings tradicionales que pueden estar
              sesgados por región o evento, este sistema reconoce la
              versatilidad, consistencia y excelencia en múltiples disciplinas.
            </p>
            <p>
              El sistema está diseñado para ser inclusivo y motivador,
              ofreciendo metas claras para speedcubers de todos los niveles,
              desde principiantes hasta competidores de élite.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cómo funciona</CardTitle>
            <CardDescription>
              Progresión a través de los niveles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              El sistema comienza con el nivel Bronce, que requiere tener al
              menos un resultado en cada uno de los 17 eventos oficiales de la
              WCA. Esto demuestra versatilidad y un interés en todos los
              aspectos del speedcubing.
            </p>
            <p className="mb-4">
              A partir de ahí, los niveles avanzan progresivamente:
            </p>
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-amber-200 p-1 rounded-full">
                  <Medal className="h-4 w-4 text-amber-600" />
                </div>
                <span className="font-semibold">
                  Bronce → Plata → Oro → Platino → Ópalo → Diamante
                </span>
              </div>
            </div>
            <p className="mb-4">
              Obtienes un nivel cada vez que completas cualquiera de los
              siguientes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li className="font-medium">
                Promedios en todos los eventos de speedsolving (No BLD/FMC)
              </li>
              <li className="font-medium">Medias en FMC/BLD</li>
              <li className="font-medium">Podio en un campeonato mundial</li>
              <li className="font-medium">Récord mundial</li>
              <li className="font-medium">
                Todos los eventos de la WCA ganados
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Todos los miembros</CardTitle>
            <CardDescription>
              Lista completa de speedcubers mexicanos en el sistema Mollerz
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid">
              <div className="w-full overflow-auto">
                <div className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Nivel</TableHead>
                        <TableHead>Todos los eventos</TableHead>
                        <TableHead>Promedios Speedsolving</TableHead>
                        <TableHead>Medias BLD/FMC</TableHead>
                        <TableHead>Podio WC</TableHead>
                        <TableHead>WR</TableHead>
                        <TableHead>Eventos ganados</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>{children}</TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
