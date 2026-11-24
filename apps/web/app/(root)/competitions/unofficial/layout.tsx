import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { CcAttribution } from "@/components/cubing-contests/cc-attribution";
import { CC_SITE_URL } from "@/lib/cubing-contests";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mb-6 flex flex-col gap-4">
        <PageHeading>Competencias con eventos no oficiales</PageHeading>
        <p>
          Competencias oficiales de la WCA en México que también celebraron
          eventos no oficiales registrados en{" "}
          <Link
            className="text-link underline hover:text-link/80"
            href={CC_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Cubing Contests
          </Link>
          . Estos resultados no cuentan para rankings ni récords oficiales.
        </p>
        <CcAttribution />
      </div>
      {children}
    </>
  );
}
