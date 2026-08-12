import { CubingMexico } from "@workspace/icons";
import { buttonVariants } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Download } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Logotipo | Cubing México",
  description:
    "Encuentra el logotipo de Cubing México en diferentes formatos y resoluciones. Descarga el logotipo para su uso en eventos, redes sociales y más.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grow container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Logotipo de Cubing México
        </h1>

        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="bg-background p-8 rounded-lg border mb-6 flex justify-center">
              <CubingMexico className="size-128" />
            </div>

            <div className="flex justify-center gap-3 mb-6">
              <Link
                className={buttonVariants({ variant: "default" })}
                href="/logo.png"
              >
                <Download />
                Descargar PNG
              </Link>
              <Link
                className={buttonVariants({ variant: "outline" })}
                href="/logo.svg"
              >
                <Download />
                Descargar SVG
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mb-12 space-y-2">
          <h2 className="text-xl font-semibold mb-3">Créditos</h2>
          <p className="text-muted-foreground">
            Diseñado por{" "}
            <span className="font-medium">Sofia Celaya Álvarez</span> para
            Cubing México
          </p>
          <p>
            Este logo combina elementos culturales mexicanos con un cubo de
            Rubik, representando la identidad de la comunidad. La forma del logo
            se asemeja a un elote, un elemento culinario tradicionalmente
            mexicano que con su forma semicuadrada, simboliza esta fusión.
          </p>
          <p>
            Si deseas apoyar a la artista detrás del diseño, puedes conectarte
            con Sofia a través de sus redes sociales, que se proporcionan a
            continuación:
          </p>
          <Link
            className="text-2xl hover:underline text-green-500 hover:text-green-700"
            href="https://www.instagram.com/ad_chrofy"
          >
            AD Chrofy
          </Link>
          {children}
        </div>

        <div className="text-center">
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Volver al Inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
