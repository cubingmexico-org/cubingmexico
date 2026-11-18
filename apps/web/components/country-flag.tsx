import { cn } from "@workspace/ui/lib/utils";

type CountryFlagProps = {
  iso2?: string | null;
  size?: number;
  className?: string;
};

/** Small country flag from flagcdn (same source as Organización badge art). */
export function CountryFlag({
  iso2,
  size = 16,
  className,
}: CountryFlagProps) {
  const code = iso2?.trim().toLowerCase();
  if (!code || code.length !== 2) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external flagcdn URL; images are unoptimized app-wide
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      alt=""
      width={size}
      height={Math.round(size * 0.75)}
      className={cn("inline-block shrink-0 object-contain", className)}
      loading="lazy"
      decoding="async"
    />
  );
}

export function CountryLabel({
  iso2,
  size = 16,
  className,
  nameClassName,
}: {
  iso2?: string | null;
  size?: number;
  className?: string;
  nameClassName?: string;
}) {
  const code = iso2?.trim().toUpperCase();
  if (!code) return <span className={nameClassName}>—</span>;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <CountryFlag iso2={code} size={size} />
      <span className={nameClassName}>{code}</span>
    </span>
  );
}
