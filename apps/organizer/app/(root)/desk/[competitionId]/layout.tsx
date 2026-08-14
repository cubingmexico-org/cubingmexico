import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DESK_ENABLED } from "@/lib/constants";

interface LayoutProps {
  children: React.ReactNode;
}

export async function generateMetadata(): Promise<Metadata> {
  if (!DESK_ENABLED) {
    return {
      title: "No encontrado | Organización - Cubing México",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: "Mesa | Organización - Cubing México",
    description:
      "Voluntarios e inscripciones de competencias WCA - Cubing México",
  };
}

export default function Layout({ children }: LayoutProps) {
  if (!DESK_ENABLED) {
    notFound();
  }

  return <main className="container mx-auto px-4 py-8">{children}</main>;
}
