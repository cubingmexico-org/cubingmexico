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
import { sendParticipationEmails } from "@/lib/certificates/send-participation-emails";

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
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const sendSelectedByEmail = async () => {
    const registrantIds = selectedParticipants
      .map((p) => p.registrantId)
      .filter((id): id is number => id !== null);

    if (registrantIds.length === 0) return;

    setIsSendingEmail(true);
    const toastId = toast.loading(
      `Enviando certificados… 0/${registrantIds.length}`,
    );

    try {
      const result = await sendParticipationEmails({
        competitionId: competition.id,
        registrantIds,
        content: participantsContent,
        pageMargins: pageMarginsParticipants,
        pageOrientation: pageOrientationParticipants,
        pageSize: pageSizeParticipants,
        background: backgroundParticipants,
        onProgress: (done, total) => {
          toast.loading(`Enviando certificados… ${done}/${total}`, {
            id: toastId,
          });
        },
      });

      const parts: string[] = [];
      if (result.sent > 0) {
        parts.push(`${result.sent} enviado${result.sent !== 1 ? "s" : ""}`);
      }
      if (result.skippedNoEmail.length > 0) {
        parts.push(`${result.skippedNoEmail.length} sin correo en el WCIF`);
      }
      if (result.failed.length > 0) {
        parts.push(`${result.failed.length} con error`);
      }

      if (result.dailyQuotaHit) {
        toast.warning("Límite diario de Resend alcanzado", {
          id: toastId,
          description: `${parts.join(". ")}. El plan gratuito permite 100 correos al día (UTC); puedes continuar mañana con los pendientes.`,
        });
      } else if (result.monthlyQuotaHit) {
        toast.warning("Límite mensual de Resend alcanzado", {
          id: toastId,
          description: parts.join(". "),
        });
      } else if (result.failed.length > 0 || result.skippedNoEmail.length > 0) {
        toast.warning("Envío terminado con avisos", {
          id: toastId,
          description: parts.join(". "),
        });
      } else {
        toast.success("Certificados enviados", {
          id: toastId,
          description: parts.join(". ") || "Listo",
        });
      }
    } catch (error) {
      toast.error("No se pudieron enviar los certificados", {
        id: toastId,
        description:
          error instanceof Error ? error.message : "Error desconocido",
      });
    } finally {
      setIsSendingEmail(false);
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
                disabled={selectedParticipants.length === 0 || isSendingEmail}
                variant="outline"
                onClick={() => generateParticipantPDF("open")}
              >
                <Eye />
                Vista previa ({selectedParticipants.length})
              </Button>
              <Button
                disabled={selectedParticipants.length === 0 || isSendingEmail}
                variant="outline"
                onClick={() => generateParticipantPDF("download")}
              >
                <Download />
                Descargar ({selectedParticipants.length})
              </Button>
              <Button
                disabled={selectedParticipants.length === 0 || isSendingEmail}
                onClick={() => void sendSelectedByEmail()}
              >
                {isSendingEmail ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Mail />
                )}
                Enviar por correo ({selectedParticipants.length})
              </Button>
            </div>
            <p className="w-full text-xs text-muted-foreground">
              El correo usa el WCIF autorizado (organizador/delegado). El plan
              gratuito de Resend permite hasta 100 envíos por día (UTC).
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
