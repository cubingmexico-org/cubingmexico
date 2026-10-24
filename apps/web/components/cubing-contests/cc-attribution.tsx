import { cn } from "@workspace/ui/lib/utils";
import { CC_LICENSE_URL, CC_SITE_URL } from "@/lib/cubing-contests";

export function CcAttribution({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      Resultados no oficiales de{" "}
      <a
        href={CC_SITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-link hover:text-link/80"
      >
        Cubing Contests
      </a>
      , disponibles bajo la licencia{" "}
      <a
        href={CC_LICENSE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-link hover:text-link/80"
      >
        CC BY-SA 4.0
      </a>
      . No cuentan para rankings ni récords oficiales.
    </p>
  );
}
