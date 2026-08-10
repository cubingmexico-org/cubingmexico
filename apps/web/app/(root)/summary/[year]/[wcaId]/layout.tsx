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
  return <main className="grow container mx-auto px-4 py-8">{children}</main>;
}
