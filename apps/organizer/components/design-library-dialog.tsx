"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Cloud, Loader2, Trash2 } from "lucide-react";
import type { DesignModule } from "@workspace/db/schema";
import { Button } from "@workspace/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import type { DesignListItem } from "@/lib/design-schemas";

type DialogMode = "save" | "load" | "templates";

type DesignsResponse = {
  designs: DesignListItem[];
};

type DesignDetailResponse = {
  design: DesignListItem & { json: unknown };
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error || "Request failed");
  }
  return res.json() as Promise<T>;
};

function formatUpdatedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export type DesignLibraryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: DialogMode;
  competitionId: string;
  module: DesignModule;
  /** Current in-memory design payload to persist (save mode). */
  getJson: () => unknown;
  /** Apply a loaded/cloned design to the editor. */
  onApply: (json: unknown, meta: { id: string; name: string }) => void;
};

export function DesignLibraryDialog({
  open,
  onOpenChange,
  mode,
  competitionId,
  module,
  getJson,
  onApply,
}: DesignLibraryDialogProps): React.JSX.Element {
  const [name, setName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const listKey =
    open && mode === "load"
      ? `/api/designs?competitionId=${encodeURIComponent(competitionId)}&module=${module}`
      : open && mode === "templates"
        ? `/api/designs/templates?module=${module}`
        : null;

  const { data, error, isLoading, mutate } = useSWR<DesignsResponse>(
    listKey,
    fetcher,
  );

  const title =
    mode === "save"
      ? "Guardar en la nube"
      : mode === "load"
        ? "Cargar desde la nube"
        : "Plantillas";

  const description =
    mode === "save"
      ? "Guarda este diseño para la competencia. Los co-organizadores también podrán verlo y editarlo."
      : mode === "load"
        ? "Elige un diseño guardado de esta competencia."
        : "Clona una plantilla compartida a esta competencia y ábrela en el editor.";

  async function handleSave(): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Escribe un nombre para el diseño.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          competitionId,
          module,
          json: getJson(),
          ownerScope: "user",
          isPublic: false,
          schemaVersion: 1,
        }),
      });

      const body = (await res.json().catch(() => null)) as {
        error?: string;
        design?: DesignListItem;
      } | null;

      if (!res.ok) {
        throw new Error(body?.error || "No se pudo guardar");
      }

      toast.success("Diseño guardado en la nube");
      setName("");
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al guardar el diseño",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleLoad(id: string): Promise<void> {
    setBusyId(id);
    try {
      const detail = await fetcher<DesignDetailResponse>(`/api/designs/${id}`);
      onApply(detail.design.json, {
        id: detail.design.id,
        name: detail.design.name,
      });
      toast.success(`Cargado: ${detail.design.name}`);
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al cargar el diseño",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleClone(id: string, templateName: string): Promise<void> {
    setBusyId(id);
    try {
      const res = await fetch(`/api/designs/${id}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitionId,
          name: templateName,
        }),
      });

      const body = (await res.json().catch(() => null)) as {
        error?: string;
        design?: DesignListItem & { json: unknown };
      } | null;

      if (!res.ok || !body?.design) {
        throw new Error(body?.error || "No se pudo clonar la plantilla");
      }

      onApply(body.design.json, {
        id: body.design.id,
        name: body.design.name,
      });
      toast.success(`Plantilla aplicada: ${body.design.name}`);
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al clonar la plantilla",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string): Promise<void> {
    setBusyId(id);
    try {
      const res = await fetch(`/api/designs/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error || "No se pudo eliminar");
      }
      toast.success("Diseño eliminado");
      await mutate();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error al eliminar el diseño",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {mode === "save" ? (
          <div className="grid gap-3 py-2">
            <div className="grid gap-2">
              <Label htmlFor="design-name">Nombre</Label>
              <Input
                id="design-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Podio oficial"
                maxLength={120}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void handleSave();
                  }
                }}
              />
            </div>
          </div>
        ) : (
          <div className="py-2">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Cargando…
              </div>
            ) : error ? (
              <p className="py-6 text-center text-sm text-destructive">
                {error.message}
              </p>
            ) : !data?.designs.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {mode === "load"
                  ? "Aún no hay diseños guardados para esta competencia."
                  : "No hay plantillas disponibles para este módulo."}
              </p>
            ) : (
              <ScrollArea className="h-72 pr-3">
                <ul className="flex flex-col gap-2">
                  {data.designs.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatUpdatedAt(item.updatedAt)}
                          {mode === "templates"
                            ? ` · ${item.ownerScope}`
                            : null}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {mode === "load" ? (
                          <>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busyId === item.id}
                              onClick={() => void handleLoad(item.id)}
                            >
                              {busyId === item.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                "Abrir"
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              disabled={busyId === item.id}
                              aria-label="Eliminar diseño"
                              onClick={() => void handleDelete(item.id)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            disabled={busyId === item.id}
                            onClick={() => void handleClone(item.id, item.name)}
                          >
                            {busyId === item.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              "Usar"
                            )}
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {mode === "save" ? (
            <Button disabled={saving} onClick={() => void handleSave()}>
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Guardando…
                </>
              ) : (
                <>
                  <Cloud className="size-4" />
                  Guardar
                </>
              )}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
