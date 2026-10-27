import Link from "next/link";
import { serverEnv } from "@/lib/env";

export function PreviewBanner() {
  if (serverEnv().VERCEL_ENV !== "preview") return null;

  return (
    <div className="w-full bg-amber-500 px-4 py-1 text-center text-xs text-black">
      <span className="font-semibold">Versión beta (vista previa)</span>
      {" · "}
      <Link
        href="https://www.cubingmexico.net"
        className="font-medium underline underline-offset-2"
      >
        Ir al sitio oficial
      </Link>
    </div>
  );
}
