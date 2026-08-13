import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import "@cubing/icons";
import { headers } from "next/headers";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog";
import Link from "next/link";
import { FooterSkeleton } from "@/components/footer-skeleton";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { unauthorized } from "next/navigation";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  const headersList = await headers();

  const session = await auth.api.getSession({
    headers: headersList,
  });

  if (!session?.user) {
    unauthorized();
  }

  const host = headersList.get("host");
  const proto = headersList.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  return (
    <div className="relative flex min-h-screen flex-col">
      <Header user={session?.user} />
      <div className="flex-1">
        {origin !== process.env.NEXT_PUBLIC_APP_URL ? (
          <AlertDialog open>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Dominio incorrecto</AlertDialogTitle>
                <AlertDialogDescription>
                  El dominio de la solicitud no coincide con el dominio
                  esperado. El dominio actual es {origin} y el dominio esperado
                  es{" "}
                  <Link
                    className="hover:underline"
                    href={process.env.NEXT_PUBLIC_APP_URL || "/"}
                  >
                    {process.env.NEXT_PUBLIC_APP_URL}
                  </Link>
                  .
                </AlertDialogDescription>
              </AlertDialogHeader>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          children
        )}
      </div>
      <Suspense fallback={<FooterSkeleton />}>
        <Footer />
      </Suspense>
    </div>
  );
}
