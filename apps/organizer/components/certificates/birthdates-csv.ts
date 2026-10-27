"use client";

import { useEffect, useState } from "react";
import Papa from "papaparse";
import { toast } from "sonner";

/**
 * Registrant id to birthdate (YYYY-MM-DD) from a WCA registrations CSV. Accepts the
 * column names of the WCA export and common variations; rows without a valid id or
 * date are skipped. `validCount` counts accepted rows, including repeated ids.
 */
export function parseBirthdatesCsv(text: string): {
  birthdates: Map<number, string>;
  validCount: number;
} {
  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const birthdates = new Map<number, string>();
  let validCount = 0;
  for (const row of data) {
    const registrantId =
      row["Registrant Id"] || row["registrantId"] || row["registrant_id"];
    const birthdate = row["Birth Date"] || row["birthdate"] || row["Birthdate"];
    if (!registrantId || !birthdate) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthdate)) continue;

    const id = parseInt(registrantId);
    if (isNaN(id)) continue;
    birthdates.set(id, birthdate.trim());
    validCount++;
  }
  return { birthdates, validCount };
}

/** Birthdates read from the first uploaded CSV, for the age certificate template. */
export function useBirthdatesCsv(csvFiles: File[]) {
  const [birthdateMap, setBirthdateMap] = useState<Map<number, string>>();
  const [csvError, setCsvError] = useState<string>();

  useEffect(() => {
    const file = csvFiles[0];
    if (!file) {
      setBirthdateMap(undefined);
      setCsvError(undefined);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const { birthdates, validCount } = parseBirthdatesCsv(
          e.target?.result as string,
        );
        if (validCount === 0) {
          setCsvError("No se encontraron datos válidos en el CSV");
          toast.error("CSV inválido", {
            description:
              "Asegúrate de que el archivo tenga columnas 'Registrant Id' y 'Birth Date' con formato YYYY-MM-DD",
          });
          setBirthdateMap(undefined);
        } else {
          setBirthdateMap(birthdates);
          setCsvError(undefined);
          toast.success("CSV cargado", {
            description: `${validCount} competidor${validCount !== 1 ? "es" : ""} con fecha de nacimiento`,
          });
        }
      } catch (error) {
        setCsvError("Error al procesar el CSV");
        toast.error("Error al procesar el CSV", {
          description:
            error instanceof Error ? error.message : "Error desconocido",
        });
        setBirthdateMap(undefined);
      }
    };
    reader.onerror = () => {
      setCsvError("Error al leer el CSV");
      toast.error("Error al leer el CSV", {
        description: reader.error?.message ?? "Error desconocido",
      });
      setBirthdateMap(undefined);
    };
    reader.readAsText(file);
  }, [csvFiles]);

  return { birthdateMap, csvError };
}
