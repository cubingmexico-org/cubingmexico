import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sum of Ranks | Cubing México",
  description:
    "Sum of Ranks nacional: suma de tus posiciones en cada evento. Más bajo es mejor.",
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="grow container mx-auto px-4 py-8">{children}</main>;
}
