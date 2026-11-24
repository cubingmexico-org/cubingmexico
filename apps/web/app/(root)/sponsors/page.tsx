import type { Metadata } from "next";
import { GroupDirectory } from "../groups/_components/group-directory";

export const metadata: Metadata = {
  title: "Patrocinadores | Cubing México",
  description:
    "Cubing México existe gracias a sus patrocinadores. Conoce los equipos que mantienen el sitio y cómo sumar el tuyo.",
};

export default function Page() {
  return <GroupDirectory kind="sponsor" />;
}
