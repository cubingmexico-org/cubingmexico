import { cn } from "@workspace/ui/lib/utils";

const CHECKERBOARD = {
  backgroundImage:
    "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
};

/** Image over a checkerboard so transparent areas are visible. */
export function TransparentImagePreview({
  src,
  alt,
  className,
  emptyLabel = "Sin imagen",
}: {
  src: string | null;
  alt: string;
  className?: string;
  emptyLabel?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-md border",
        className,
      )}
      style={CHECKERBOARD}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- may be blob: or external UploadThing URL
        <img
          src={src}
          alt={alt}
          className="max-h-full max-w-full object-contain"
        />
      ) : (
        <span className="text-muted-foreground text-sm">{emptyLabel}</span>
      )}
    </div>
  );
}
