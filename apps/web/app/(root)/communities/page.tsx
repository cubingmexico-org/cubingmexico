import type { Metadata } from "next";
import { GroupDirectory } from "../groups/_components/group-directory";

export const metadata: Metadata = {
  title: "Comunidades | Cubing México",
  description: "Comunidades locales de speedcubing en México.",
};

export default function Page() {
  return <GroupDirectory kind="community" />;
}
