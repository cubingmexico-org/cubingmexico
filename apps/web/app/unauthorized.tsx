"use client";

import { Button, buttonVariants } from "@workspace/ui/components/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { Home, ArrowLeft, Mail, Lock } from "lucide-react";
import Link from "next/link";
import { BackButton } from "@/components/back-button";

export default function CustomUnauthorized(): React.JSX.Element {
  return (
    <main className="grow flex items-center justify-center">
      <div className="container max-w-3xl px-4 py-16">
        <Card className="border-red-200 dark:border-red-600">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-6">
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="grid grid-cols-3 gap-1 rotate-12 scale-110">
                    {[...Array(9)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-8 h-8 rounded-md ${
                          [0, 2, 6, 8].includes(i)
                            ? "bg-red-400 dark:bg-red-600"
                            : [1, 3, 5, 7].includes(i)
                              ? "bg-red-300 dark:bg-red-500"
                              : "bg-white border-2 border-gray-300 dark:border-gray-600"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-center mb-4">
              <Lock className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="text-2xl md:text-3xl font-bold text-red-700 dark:text-red-400">
              Acceso Denegado
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              No tienes permiso para acceder a esta página.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Esta página requiere permisos especiales o que inicies sesión con
              una cuenta autorizada.
            </p>

            <div className="bg-amber-50 border border-amber-200 dark:border-amber-600 dark:bg-amber-900 rounded-lg p-4 mt-6 text-left">
              <h3 className="font-semibold text-amber-800 dark:text-white mb-2">
                ¿Por qué estoy viendo esto?
              </h3>
              <ul className="list-disc list-inside text-sm text-amber-700 dark:text-white space-y-1">
                <li>No has iniciado sesión en tu cuenta</li>
                <li>Tu cuenta no tiene los permisos necesarios</li>
                <li>Estás intentando acceder a contenido restringido</li>
                <li>Tu sesión ha expirado</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              className={cn(
                buttonVariants({ variant: "outline" }),
                "w-full sm:w-auto",
              )}
              href="/"
            >
              <Home className="mr-2 h-5 w-5" />
              Ir al Inicio
            </Link>
            <BackButton variant="ghost" className="w-full sm:w-auto">
              <ArrowLeft className="mr-2 h-5 w-5" />
              Regresar
            </BackButton>
          </CardFooter>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            ¿Crees que deberías tener acceso a esta página?
          </p>
          <Button
            asChild
            variant="link"
            className="text-blue-600 dark:text-blue-400"
          >
            <Link
              href="https://www.facebook.com/cubingmexico"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Mail />
              Contacta al desarrollador
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
