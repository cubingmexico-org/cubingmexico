import { cn } from "@workspace/ui/lib/utils";

type CompetitionLogoProps = {
  src: string | null | undefined;
  alt: string;
  size?: number;
  className?: string;
};

/**
 * Renders a competition logo when present. Null/empty src renders nothing.
 * Uses a plain img so WCA Active Storage and UploadThing URLs both work.
 */
export function CompetitionLogo({
  src,
  alt,
  size = 40,
  className,
}: CompetitionLogoProps) {
  const url = src?.trim();
  if (!url) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}
