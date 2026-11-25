import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sum of Ranks de Teams | Cubing México",
  description:
    "Sum of Ranks por Team: suma las mejores posiciones de sus miembros en cada evento.",
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="grow container mx-auto px-4 py-8">{children}</main>;
}
