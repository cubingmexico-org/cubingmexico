"use client";

import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@workspace/ui/components/card";
import { Lock, RefreshCw } from "lucide-react";
import { SignIn } from "@/components/auth-components";

export default function CustomUnauthorized(): React.JSX.Element {
  return (
    <main className="grow flex items-center justify-center">
      <div className="container max-w-3xl px-4 py-16">
        <Card className="border-red-200 dark:border-red-600 shadow-lg">
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
              Tu sesión terminó
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              Vuelve a iniciar sesión con tu cuenta de la World Cube Association
              para continuar.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Tu sesión pudo expirar o necesitas autenticarte de nuevo para ver
              esta sección.
            </p>

            <div className="bg-amber-50 border border-amber-200 dark:border-amber-600 dark:bg-amber-900 rounded-lg p-4 mt-6 text-left">
              <h3 className="font-semibold text-amber-800 dark:text-white mb-2">
                ¿Qué hago ahora?
              </h3>
              <ul className="list-disc list-inside text-sm text-amber-700 dark:text-white space-y-1">
                <li>Inicia sesión otra vez con tu cuenta WCA</li>
                <li>Verifica que estés usando la cuenta correcta</li>
                <li>Si el problema continúa, vuelve a cargar la página</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 justify-center pt-2">
            <SignIn />
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <a href="/sign-in">
                <RefreshCw className="mr-2 h-5 w-5" />
                Ir a la página de acceso
              </a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
