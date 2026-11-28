import Image from "next/image";
import Link from "next/link";
import { getPublicitySponsors } from "@/app/(root)/groups/_lib/queries";
import { brandMarkSrc } from "@/lib/brand-image";
import { groupHref } from "@/lib/groups";
import { SponsorsSupportNotice } from "./sponsors-support-notice";

export async function HomeSponsors() {
  const sponsors = await getPublicitySponsors();

  return (
    <section className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Patrocinadores
            </h2>
            <SponsorsSupportNotice className="mt-1 max-w-2xl text-sm text-muted-foreground [&_a]:text-brand" />
          </div>
          <Link
            href="/sponsors"
            className="shrink-0 text-sm font-medium text-brand hover:underline"
          >
            Ver todos
          </Link>
        </div>
        {sponsors.length > 0 ? (
          <div className="flex flex-wrap items-center gap-6">
            {sponsors.map((sponsor) => {
              const href =
                sponsor.websiteUrl || groupHref("sponsor", sponsor.id);
              const external = Boolean(sponsor.websiteUrl);
              return (
                <Link
                  key={sponsor.id}
                  href={href}
                  className="flex max-w-xs items-center gap-3 rounded-md border border-border/60 bg-background px-3 py-2 transition-colors hover:border-brand/40"
                  {...(external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-md">
                    <Image
                      src={
                        brandMarkSrc(sponsor.icon, sponsor.image) ||
                        "/placeholder.svg"
                      }
                      alt={sponsor.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {sponsor.name}
                    </div>
                    {sponsor.publicityBlurb ? (
                      <div className="truncate text-xs text-muted-foreground">
                        {sponsor.publicityBlurb}
                      </div>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
