import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sum of State Ranks | Cubing México",
  description:
    "Sum of State Ranks: suma tus posiciones en el ranking estatal de cada evento.",
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="grow container mx-auto px-4 py-8">{children}</main>;
}
