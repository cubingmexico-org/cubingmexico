import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resumen anual del Team | Cubing México",
  description:
    "Resumen anual de competencias, podios, récords y más para teams de speedcubing en México.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <main className="grow container mx-auto px-4 py-8">{children}</main>;
}
