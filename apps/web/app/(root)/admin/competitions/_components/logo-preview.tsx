const CHECKERBOARD = {
  backgroundImage:
    "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
};

/** The logo over a checkerboard, so transparent areas are visible. */
export function LogoPreview({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div
      className="flex size-40 items-center justify-center overflow-hidden rounded-lg border"
      style={CHECKERBOARD}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- may be a blob: URL from the file picker
        <img
          src={src}
          alt={alt}
          className="max-h-full max-w-full object-contain"
        />
      ) : (
        <span className="text-muted-foreground text-sm">Sin logo</span>
      )}
    </div>
  );
}
