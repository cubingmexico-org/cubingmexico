import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resumen anual | Cubing México",
  description:
    "Resumen anual de competencias, podios, marcas personales y más para speedcubers de México.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="container mx-auto min-w-0 grow overflow-x-clip px-4 py-8">
      {children}
    </main>
  );
}
