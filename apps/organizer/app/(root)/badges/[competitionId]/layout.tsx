import type { Metadata } from "next";

interface LayoutProps {
  children: React.ReactNode;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Gafetes | Organización - Cubing México",
    description: "Gafetes para competencias WCA - Cubing México",
  };
}

export default function Layout({ children }: LayoutProps) {
  return <main className="container mx-auto px-4 py-8">{children}</main>;
}
