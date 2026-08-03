import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { Profile } from "./_components/profile";
import { getPerson, getStates } from "@/db/queries";
import type { Metadata } from "next";
import { notFound, unauthorized } from "next/navigation";
import { getProfile } from "./_lib/queries";

export async function generateMetadata(): Promise<Metadata> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.wcaId) {
    return {
      title: "Perfil | Cubing México",
    };
  }

  const person = await getPerson(session.user.wcaId);

  return {
    title: `${person?.name} | Cubing México`,
    description: `Perfil de ${person?.name}`,
  };
}

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.wcaId) {
    unauthorized();
  }

  const person = await getProfile(session.user.wcaId);

  if (!person) {
    notFound();
  }

  const states = await getStates();

  return <Profile user={session.user} person={person} states={states} />;
}
