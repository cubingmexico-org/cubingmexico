import { Radio } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { getInProgressLiveCompetitionsCount } from "@/lib/live/queries";
import { HeaderNavLink } from "./header-nav-link";

export async function HeaderLiveNavLink({
  className,
  linkClassName,
}: {
  className?: string;
  linkClassName?: string;
}) {
  const count = await getInProgressLiveCompetitionsCount();

  return (
    <HeaderNavLink
      href="/live"
      className={className}
      linkClassName={linkClassName}
    >
      <Radio className="size-4" />
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
