import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { Home, RotateCcw } from "lucide-react";
import { BackButton } from "@/components/back-button";

export default function NotFound() {
  return (
    <main className="grow flex items-center justify-center">
      <div className="container max-w-3xl px-4 py-16 text-center">
        <div className="mb-8 relative">
          <div className="flex justify-center">
            <div className="relative w-40 h-40 md:w-56 md:h-56">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="grid grid-cols-3 gap-2 rotate-12 scale-110">
                  {[...Array(9)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-8 h-8 md:w-12 md:h-12 rounded-md ${
                        [0, 2, 6, 8].includes(i)
                          ? "bg-amber-500"
                          : [1, 3, 5, 7].includes(i)
                            ? "bg-brand"
                            : "bg-background border-2 border-border"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <h1 className="text-6xl md:text-8xl font-bold mt-4">404</h1>
        </div>

        <h2 className="text-2xl md:text-3xl font-bold mb-4">
          ¡Página no encontrada!
        </h2>
        <p className="text-lg text-muted-foreground mb-8">
          Parece que este cubo está sin resolver. La página que estás buscando
          no existe o ha sido movida.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg">
            <Link href="/">
              <Home />
              Volver al inicio
            </Link>
          </Button>
          <BackButton variant="outline" size="lg">
            <RotateCcw />
            Regresar
          </BackButton>
        </div>
      </div>
    </main>
  );
}
