import { TransparentImagePreview } from "@/components/transparent-image-preview";

/** The logo over a checkerboard, so transparent areas are visible. */
export function LogoPreview({ src, alt }: { src: string | null; alt: string }) {
  return (
    <TransparentImagePreview
      src={src}
      alt={alt}
      className="size-40 rounded-lg"
      emptyLabel="Sin logo"
    />
  );
}
