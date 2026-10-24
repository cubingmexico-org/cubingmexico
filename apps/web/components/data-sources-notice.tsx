import { CC_LICENSE_URL } from "@/lib/cubing-contests";
import { formatDate } from "@/lib/utils";

const WCA_RESULTS_URL = "https://www.worldcubeassociation.org/results";
const CC_EXPORT_URL = "https://cubingcontests.com/export";

function asOf(date: Date | null) {
  return date ? ` al ${formatDate(date, date)}` : "";
}

/** Where results come from. The WCA asks sites using its export to show this. */
export function DataSourcesNotice({
  wcaExportDate,
  ccExportDate,
}: {
  wcaExportDate: Date | null;
  ccExportDate: Date | null;
}) {
  const linkClass = "underline hover:text-primary";

  return (
    <div className="space-y-1 text-center text-xs text-muted-foreground">
      <p>
        Los resultados oficiales se basan en resultados de competencias
        propiedad de la World Cube Association y mantenidos por ella, publicados
        en{" "}
        <a
          href={WCA_RESULTS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          worldcubeassociation.org/results
        </a>
        {asOf(wcaExportDate)}.
      </p>
      <p>
        Los resultados no oficiales (eventos no oficiales en competencias WCA)
        provienen de{" "}
        <a
          href={CC_EXPORT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          Cubing Contests
        </a>
        {asOf(ccExportDate)}, bajo la licencia{" "}
        <a
          href={CC_LICENSE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClass}
        >
          CC BY-SA 4.0
        </a>
        .
      </p>
    </div>
  );
}
