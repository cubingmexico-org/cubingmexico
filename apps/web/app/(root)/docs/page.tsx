import type { Metadata } from "next";
import { ApiDocs } from "./_components/api-docs";

export const metadata: Metadata = {
  title: "API pública | Cubing México",
  description:
    "Documentación de la API pública de Cubing México: competencias, personas, teams, rankings y récords estatales.",
};

export default function Page(): React.JSX.Element {
  return <ApiDocs />;
}
