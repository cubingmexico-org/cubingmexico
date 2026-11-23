import type { Metadata } from "next";
import { GroupDirectory } from "../groups/_components/group-directory";

export const metadata: Metadata = {
  title: "Patrocinadores | Cubing México",
  description:
    "Equipos patrocinados por tiendas y marcas de speedcubing en México.",
};

export default function Page() {
  return <GroupDirectory kind="sponsor" />;
}
