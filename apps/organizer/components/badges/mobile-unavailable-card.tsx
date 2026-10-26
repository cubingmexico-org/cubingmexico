import Link from "next/link";
import { Home, Settings } from "lucide-react";
import { buttonVariants } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";

export function MobileUnavailableCard({
  competitionName,
}: {
  competitionName: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Función no disponible en móvil
        </CardTitle>
        <CardDescription>
          El gestor de gafetes requiere una pantalla más grande
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Esta función está diseñada para ser utilizada en computadoras de
          escritorio o tabletas debido a la complejidad de la interfaz y las
          herramientas de diseño.
        </p>
        <p className="text-sm text-muted-foreground">
          Por favor, accede desde un dispositivo con una pantalla más grande
          para gestionar los gafetes de{" "}
          <span className="font-medium">{competitionName}</span>.
        </p>
        <Link
          href="/"
          className={buttonVariants({
            variant: "default",
            className: "w-full",
          })}
        >
          <Home />
          Volver al inicio
        </Link>
      </CardContent>
    </Card>
  );
}
