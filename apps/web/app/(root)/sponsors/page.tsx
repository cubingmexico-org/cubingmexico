import type { Metadata } from "next";
import { GroupDirectory } from "../groups/_components/group-directory";

export const metadata: Metadata = {
  title: "Patrocinadores | Cubing México",
  description:
    "Cubing México existe gracias a sus patrocinadores. Mira quién mantiene el sitio y cómo sumarte.",
};

export default function Page() {
  return <GroupDirectory kind="sponsor" />;
}
