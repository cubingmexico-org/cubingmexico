import { buttonVariants } from "@workspace/ui/components/button";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Teams | Cubing México",
  description: "Teams estatales de speedcubing en México.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grow container mx-auto px-4 py-8">
      {children}

      <div className="mt-12 bg-muted/50 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">¿Falta tu Team?</h2>
        <p className="mb-4">
          El registro no es automático: escríbenos y te ayudamos a dar de alta
          el Team de tu estado.
        </p>
        <div className="flex gap-4">
          <Link
            href="https://www.facebook.com/cubingmexico"
            target="_blank"
            className={buttonVariants({ variant: "default" })}
          >
            Contáctanos
          </Link>
        </div>
      </div>
    </main>
  );
}
