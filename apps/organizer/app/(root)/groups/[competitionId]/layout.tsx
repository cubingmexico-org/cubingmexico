import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GROUPS_ENABLED } from "@/lib/constants";

interface LayoutProps {
  children: React.ReactNode;
}

export async function generateMetadata(): Promise<Metadata> {
  if (!GROUPS_ENABLED) {
    return {
      title: "No encontrado | Organización - Cubing México",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: "Grupos | Organización - Cubing México",
    description:
      "Asignación de grupos y voluntarios de competencias WCA - Cubing México",
  };
}

export default function Layout({ children }: LayoutProps) {
  if (!GROUPS_ENABLED) {
    notFound();
  }

  return <main className="container mx-auto px-4 py-8">{children}</main>;
}
