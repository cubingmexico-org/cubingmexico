"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Checkbox } from "@workspace/ui/components/checkbox";
import {
  Settings,
  Eye,
  Check,
  X,
  Download,
  Search,
  XCircle,
  Mail,
  Loader2,
} from "lucide-react";
import { Competition } from "@/types/wca";
import type { ParticipantData, RegisteredPerson } from "@/types/wcif";
import Tiptap from "../editor/tiptap";
import { JSONContent } from "@tiptap/react";
import { Margins, PageOrientation, PageSize } from "pdfmake/interfaces";
import { Input } from "@workspace/ui/components/input";
import { FileUploader } from "../file-uploader";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { toast } from "sonner";
import type * as React from "react";
import { buildClaimMailto } from "@/lib/certificates/mailto";
import { publishParticipationShare } from "@/lib/certificates/publish-share";

export function ParticipationCertificatesTab({
  backgroundParticipants,
  competition,
  filesParticipants,
  filteredPersons,
  generateParticipantPDF,
  pageMarginsParticipants,
  pageOrientationParticipants,
  pageSizeParticipants,
  participantsContent,
  participantsData,
  searchParticipant,
  selectedParticipants,
  setFilesParticipants,
  setPageMarginsParticipants,
  setPageOrientationParticipants,
  setPageSizeParticipants,
  setParticipantsContent,
  setSearchParticipant,
  setSelctedParticipants,
}: {
  backgroundParticipants: string | undefined;
  competition: Competition;
  filesParticipants: File[];
  filteredPersons: RegisteredPerson[];
  generateParticipantPDF: (action: "open" | "download") => void;
  pageMarginsParticipants: Margins;
  pageOrientationParticipants: PageOrientation;
  pageSizeParticipants: PageSize;
  participantsContent: JSONContent;
  participantsData: ParticipantData[] | undefined;
  searchParticipant: string;
  selectedParticipants: ParticipantData[];
  setFilesParticipants: React.Dispatch<React.SetStateAction<File[]>>;
  setPageMarginsParticipants: React.Dispatch<React.SetStateAction<Margins>>;
  setPageOrientationParticipants: React.Dispatch<
    React.SetStateAction<PageOrientation>
  >;
  setPageSizeParticipants: React.Dispatch<React.SetStateAction<PageSize>>;
  setParticipantsContent: React.Dispatch<React.SetStateAction<JSONContent>>;
  setSearchParticipant: React.Dispatch<React.SetStateAction<string>>;
  setSelctedParticipants: React.Dispatch<
    React.SetStateAction<ParticipantData[]>
  >;
}) {
  const [isSharing, setIsSharing] = useState(false);

  const shareSelectedByEmail = async () => {
    const registrantIds = selectedParticipants
      .map((p) => p.registrantId)
      .filter((id): id is number => id !== null);

    if (registrantIds.length === 0) return;

    setIsSharing(true);
    const toastId = toast.loading("Publicando enlace de certificados…");

    try {
      const result = await publishParticipationShare({
        competitionId: competition.id,
        registrantIds,
        content: participantsContent,
        pageMargins: pageMarginsParticipants,
        pageOrientation: pageOrientationParticipants,
        pageSize: pageSizeParticipants,
        background: backgroundParticipants,
      });

      const mailto = buildClaimMailto({
        emails: result.emails,
        competitionName: result.competitionName,
        claimUrl: result.claimUrl,
      });

      if (mailto.copyEmailsToClipboard && result.emails.length > 0) {
        await navigator.clipboard.writeText(result.emails.join(", "));
      }

      const anchor = document.createElement("a");
      anchor.href = mailto.href;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      const parts: string[] = [
        "Enlace publicado",
        `${result.emails.length} correo${result.emails.length !== 1 ? "s" : ""}`,
      ];
      if (result.skippedNoEmail.length > 0) {
        parts.push(`${result.skippedNoEmail.length} sin correo en el WCIF`);
      }
      if (mailto.copyEmailsToClipboard && result.emails.length > 0) {
        parts.push("lista de correos copiada (pega en CCO)");
      }

      toast.success("Listo para enviar desde tu correo", {
        id: toastId,
        description: parts.join(". "),
      });
    } catch (error) {
      toast.error("No se pudo preparar el correo", {
        id: toastId,
        description:
          error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Configuración
            </CardTitle>
            <CardDescription>
              Selecciona los participantes para los que se generarán los
              certificados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar participante"
                value={searchParticipant}
                onChange={(e) => {
                  setSearchParticipant(e.target.value);
                }}
                className="pl-9 pr-9"
              />
              {searchParticipant && (
                <button
                  onClick={() => setSearchParticipant("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  type="button"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Participantes</h4>
              <ScrollArea
                className="h-80 rounded-md border bg-muted/20 p-4"
                type="always"
              >
                <div className="grid sm:grid-cols-2 gap-3 pr-3">
                  {filteredPersons.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No se encontraron participantes
                    </p>
                  ) : (
                    <>
                      {filteredPersons.map((person) => (
                        <div
                          key={person.registrantId}
                          className="flex items-center space-x-2 rounded-md p-2 hover:bg-background/80 transition-colors cursor-pointer"
                          role="presentation"
                          onClick={(e) => {
                            // Only trigger if clicking the container, not the checkbox or label
                            if (e.target === e.currentTarget) {
                              const checkbox = document.getElementById(
                                String(person.registrantId),
                              );
                              checkbox?.click();
                            }
                          }}
                        >
                          <Checkbox
                            id={String(person.registrantId)}
                            checked={
                              selectedParticipants.filter(
                                (participant) =>
                                  participant.registrantId ===
                                  person.registrantId,
                              ).length > 0
                            }
                            onCheckedChange={(checked) => {
                              if (checked) {
                                const participant = participantsData?.filter(
                                  (participant) =>
                                    participant.registrantId ===
                                    person.registrantId,
                                );
                                if (participant) {
                                  setSelctedParticipants((prev) => [
                                    ...prev,
                                    ...participant,
                                  ]);
                                }
                              } else {
                                setSelctedParticipants((prev) =>
                                  prev.filter(
                                    (participant) =>
                                      participant.registrantId !==
                                      person.registrantId,
                                  ),
                                );
                              }
                            }}
                            disabled={
                              participantsData?.filter(
                                (participant) =>
                                  participant.registrantId ===
                                  person.registrantId,
                              ).length === 0
                            }
                          />
                          <Label
                            htmlFor={String(person.registrantId)}
                            className="cursor-pointer flex-1"
                          >
                            <p className="text-xs leading-relaxed">
                              {person.name}
                            </p>
                          </Label>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <div className="flex flex-wrap justify-start gap-2 w-full">
              <Button
                aria-label="Seleccionar todos"
                onClick={() => {
                  if (
                    selectedParticipants.length === participantsData?.length
                  ) {
                    setSelctedParticipants([]);
                  } else {
                    setSelctedParticipants(participantsData || []);
                  }
                }}
                variant="outline"
                size="sm"
              >
                {selectedParticipants.length === participantsData?.length ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {selectedParticipants.length === participantsData?.length
                  ? "Desmarcar todos"
                  : "Seleccionar todos"}
              </Button>
              {selectedParticipants.length > 0 && (
                <Button
                  aria-label="Borrar selección"
                  onClick={() => {
                    setSelctedParticipants([]);
                  }}
                  variant="ghost"
                  size="sm"
                >
                  <X className="h-4 w-4" />
                  Borrar selección
                </Button>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-2 w-full">
              <Button
                disabled={selectedParticipants.length === 0 || isSharing}
                variant="outline"
                onClick={() => generateParticipantPDF("open")}
              >
                <Eye />
                Vista previa ({selectedParticipants.length})
              </Button>
              <Button
                disabled={selectedParticipants.length === 0 || isSharing}
                variant="outline"
                onClick={() => generateParticipantPDF("download")}
              >
                <Download />
                Descargar ({selectedParticipants.length})
              </Button>
              <Button
                disabled={selectedParticipants.length === 0 || isSharing}
                onClick={() => void shareSelectedByEmail()}
              >
                {isSharing ? <Loader2 className="animate-spin" /> : <Mail />}
                Publicar y compartir ({selectedParticipants.length})
              </Button>
            </div>
            <p className="w-full text-xs text-muted-foreground">
              Publica un enlace único. Se abre un correo con ese enlace; cada
              competidor inicia sesión con su cuenta WCA para descargar solo su
              certificado.
            </p>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fondo</CardTitle>
            <CardDescription>
              Personaliza el fondo del certificado de participación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUploader
              files={filesParticipants}
              setFiles={setFilesParticipants}
            />
          </CardContent>
        </Card>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <Tiptap
          competitionId={competition.id}
          content={participantsContent}
          key={`${pageSizeParticipants}-${pageOrientationParticipants}-${pageMarginsParticipants}`}
          onChange={(newContent: JSONContent) => {
            setParticipantsContent(newContent);
          }}
          pageMargins={pageMarginsParticipants}
          pageOrientation={pageOrientationParticipants}
          pageSize={pageSizeParticipants}
          pdfDisabled={selectedParticipants.length === 0}
          pdfOnClick={() => generateParticipantPDF("download")}
          setPageMargins={(value: Margins) => {
            setPageMarginsParticipants(value);
          }}
          setPageOrientation={(value: PageOrientation) => {
            setPageOrientationParticipants(value);
          }}
          setPageSize={(value: PageSize) => {
            setPageSizeParticipants(value);
          }}
          background={backgroundParticipants}
          variant="participation"
        />
      </form>
    </div>
  );
}
