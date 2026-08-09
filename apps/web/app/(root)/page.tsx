import {
  Users,
  Clock,
  ChartNoAxesColumnIncreasing,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { HomeHero } from "@/components/home-hero";
// import { Notification } from "@/components/notification";

const destinations = [
  {
    href: "/rankings/333/single?state=Jalisco",
    title: "Rankings Estatales",
    description:
      "Ve a los mejores speedcubers de cada estado mexicano en varios eventos de la WCA.",
    icon: ChartNoAxesColumnIncreasing,
  },
  {
    href: "/records",
    title: "Récords Nacionales",
    description:
      "Mantente al tanto de los tiempos más rápidos y los mejores promedios de cuberos mexicanos.",
    icon: Clock,
  },
  {
    href: "/competitions",
    title: "Próximas Competencias",
    description:
      "Encuentra competencias WCA en México y regístrate para participar.",
    icon: Users,
  },
] as const;

export default function Page() {
  return (
    <main className="grow md:-mt-24">
      <HomeHero />

      <section className="border-t border-border bg-background">
        <div className="container mx-auto px-5 py-20 md:py-28">
          <h2 className="font-display text-4xl font-bold uppercase tracking-wide text-foreground md:text-5xl">
            Explora
          </h2>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Rankings, récords y el calendario de competencias en un solo lugar.
          </p>

          <div className="mt-12 grid grid-cols-1 gap-0 md:grid-cols-3 md:gap-0">
            {destinations.map(({ href, title, description, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group border-t border-border py-8 transition-colors first:border-t-0 md:border-t-0 md:border-l md:border-l-border md:px-8 md:py-2 first:md:border-l-0 first:md:pl-0"
              >
                <div className="border-l-2 border-transparent pl-4 transition-colors group-hover:border-brand md:border-l-0 md:pl-0 md:group-hover:border-transparent">
                  <Icon className="mb-5 size-10 text-brand transition-colors group-hover:text-brand-warm" />
                  <h3 className="font-display text-2xl font-semibold uppercase tracking-wide text-foreground">
                    {title}
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-brand transition-transform group-hover:translate-x-0.5">
                    Ir
                    <ArrowRight className="size-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
