"use client";

import { useState } from "react";
import Papa from "papaparse";
import { Upload } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Input } from "@workspace/ui/components/input";
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert";
import type { WCIF } from "@/types/wcif";
import {
  importRound1Assignments,
  normalizeImportRows,
  type ImportCsvRow,
} from "@/lib/groups/import-csv";

export function ImportCsvPanel({
  wcif,
  onApply,
}: {
  wcif: WCIF;
  onApply: (next: WCIF) => void;
}) {
  const [rows, setRows] = useState<ImportCsvRow[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [previewWarnings, setPreviewWarnings] = useState<string[]>([]);
  const [appliedCount, setAppliedCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File | null) => {
    setRows(null);
    setFileName(null);
    setPreviewErrors([]);
    setPreviewWarnings([]);
    setAppliedCount(null);
    if (!file) return;

    setBusy(true);
    try {
      const text = await file.text();
      const parsed = Papa.parse<Record<string, unknown>>(text, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.errors.length > 0) {
        setPreviewErrors(
          parsed.errors.slice(0, 8).map((e) => e.message || "Error de parseo"),
        );
      }

      const normalized = normalizeImportRows(parsed.data ?? []);
      setRows(normalized);
      setFileName(file.name);

      // Dry-run validation without mutating permanently — run import on clone via result errors only
      const dry = importRound1Assignments(wcif, normalized);
      setPreviewErrors((prev) => [...prev, ...dry.errors]);
      setPreviewWarnings(dry.warnings);
      if (dry.errors.length === 0) {
        setAppliedCount(dry.applied);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleApply = () => {
    if (!rows) return;
    const result = importRound1Assignments(wcif, rows);
    setPreviewErrors(result.errors);
    setPreviewWarnings(result.warnings);
    setAppliedCount(result.applied);
    if (result.errors.length === 0) {
      onApply(result.wcif);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div>
        <h3 className="font-semibold">Importar CSV (Round 1)</h3>
        <p className="text-sm text-muted-foreground">
          Usa el mismo formato que la exportación de Grupos. Solo se aceptan
          filas de ronda <code className="text-xs font-mono">*-r1</code>.
          Empareja por registrantId, WCA ID o wcaUserId.
        </p>
      </div>

      <div className="space-y-2 max-w-md">
        <Label htmlFor="csv-import">Archivo CSV</Label>
        <Input
          id="csv-import"
          type="file"
          accept=".csv,text/csv"
          disabled={busy}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        {fileName && (
          <p className="text-xs text-muted-foreground">
            {fileName}
            {rows ? ` · ${rows.length} filas` : ""}
          </p>
        )}
      </div>

      {previewErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTitle>Errores de validación</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc pl-4 space-y-1 text-sm">
              {previewErrors.slice(0, 15).map((err, i) => (
                <li key={`${err}-${i}`}>{err}</li>
              ))}
              {previewErrors.length > 15 && (
                <li>…y {previewErrors.length - 15} más</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {previewWarnings.length > 0 && (
        <Alert>
          <AlertTitle>Avisos</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc pl-4 space-y-1 text-sm">
              {previewWarnings.map((w, i) => (
                <li key={`${w}-${i}`}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {rows && previewErrors.length === 0 && appliedCount != null && (
        <p className="text-sm text-muted-foreground">
          Listo para aplicar {appliedCount} asignación
          {appliedCount === 1 ? "" : "es"} (se crearán grupos faltantes si hace
          falta).
        </p>
      )}

      <Button
        type="button"
        disabled={!rows || previewErrors.length > 0 || busy}
        onClick={handleApply}
      >
        <Upload className="size-4" />
        Aplicar al borrador
      </Button>
    </div>
  );
}
