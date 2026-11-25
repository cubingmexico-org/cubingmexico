import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";

export const metadata: Metadata = {
  title: "Kinch Ranks de Teams | Cubing México",
  description:
    "Kinch por Team: el mejor resultado de cada miembro, comparado con el récord nacional.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grow container mx-auto px-4 py-8">
      <div className="flex flex-col gap-4 mb-6">
        <PageHeading>Kinch Ranks de Teams</PageHeading>
        <p>
          Para cada evento se toma el mejor resultado de un miembro del Team y
          se compara con el mejor resultado nacional. 100% significa empatar o
          superar ese referente; un porcentaje más bajo indica más distancia.
        </p>
      </div>
      {children}
    </main>
  );
}
