import { cn } from "@workspace/ui/lib/utils";
import { getStateFlagUrl, resolveStateId } from "@/lib/state-flags";

type StateFlagProps = {
  stateId?: string | null;
  stateName?: string | null;
  size?: number;
  className?: string;
};

export function StateFlag({
  stateId,
  stateName,
  size = 16,
  className,
}: StateFlagProps) {
  const id = resolveStateId({ stateId, stateName });
  if (!id) return null;

  const src = getStateFlagUrl(id);
  if (!src) return null;

  return (
    // Decorative when next to visible state text; empty alt avoids redundant announcements.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={cn("inline-block shrink-0 object-contain", className)}
      loading="lazy"
      decoding="async"
    />
  );
}

export function StateLabel({
  stateId,
  stateName,
  fallback = "N/A",
  size = 16,
  className,
  nameClassName,
}: {
  stateId?: string | null;
  stateName?: string | null;
  fallback?: string;
  size?: number;
  className?: string;
  nameClassName?: string;
}) {
  const label = stateName ?? fallback;
  const hasState = Boolean(resolveStateId({ stateId, stateName }));

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {hasState ? (
        <StateFlag stateId={stateId} stateName={stateName} size={size} />
      ) : null}
      <span className={nameClassName}>{label}</span>
    </span>
  );
}
