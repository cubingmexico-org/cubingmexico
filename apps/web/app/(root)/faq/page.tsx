import type { Metadata } from "next";
import { FAQ } from "./_components/faq";

export const metadata: Metadata = {
  title: "Preguntas frecuentes | Cubing México",
  description:
    "Respuestas a las preguntas más comunes sobre Cubing México, competencias WCA y speedcubing en México.",
};

export default function Page(): React.JSX.Element {
  return <FAQ />;
}
