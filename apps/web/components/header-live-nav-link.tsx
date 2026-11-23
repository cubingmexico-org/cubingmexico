import { Badge } from "@workspace/ui/components/badge";
import { getInProgressLiveCompetitionsCount } from "@/lib/live/queries";
import { HeaderNavLink } from "./header-nav-link";

export async function HeaderLiveNavLink({ className }: { className: string }) {
  const count = await getInProgressLiveCompetitionsCount();

  return (
    <HeaderNavLink href="/live" className={className}>
      <span className="inline-flex items-center gap-1.5">
        En vivo
        {count > 0 ? (
          <Badge
            className="h-5 min-w-5 justify-center rounded-full border-0 bg-brand px-1.5 text-[11px] font-semibold text-white tabular-nums"
            aria-label={`${count} competencia${count === 1 ? "" : "s"} en vivo`}
          >
            {count}
          </Badge>
        ) : null}
      </span>
    </HeaderNavLink>
  );
}
