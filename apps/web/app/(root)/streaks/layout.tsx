import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rachas de Récords Personales | Cubing México",
  description:
    "Ranking de rachas de competencias consecutivas con récords personales (single o promedio) de los speedcubers de México.",
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="grow container mx-auto px-4 py-8">{children}</main>;
}
