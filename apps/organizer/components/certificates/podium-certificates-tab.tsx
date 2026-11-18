"use client";

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
import { Settings, Eye, Check, X, Download } from "lucide-react";
import { Competition } from "@/types/wca";
import type { PodiumData } from "@/types/wcif";
import Tiptap from "../editor/tiptap";
import { JSONContent } from "@tiptap/react";
import { Margins, PageOrientation, PageSize } from "pdfmake/interfaces";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { FileUploader } from "../file-uploader";
import { Switch } from "@workspace/ui/components/switch";
import { Slider } from "@workspace/ui/components/slider";
import type * as React from "react";
import { eventNames, type CertificateTemplate } from "./utils";

export function PodiumCertificatesTab({
  background,
  competition,
  content,
  files,
  filterByCountry,
  generatePDF,
  handleTemplateChange,
  pageMargins,
  pageOrientation,
  pageSize,
  podiumsData,
  selectedPodiums,
  selectedTemplate,
  setAgeRange,
  setContent,
  setFiles,
  setFilterByCountry,
  setPageMargins,
  setPageOrientation,
  setPageSize,
  setSelectedPodiums,
  setTempAgeRange,
  tempAgeRange,
}: {
  background: string | undefined;
  competition: Competition;
  content: JSONContent;
  files: File[];
  filterByCountry: boolean;
  generatePDF: (action: "open" | "download") => void;
  handleTemplateChange: (value: CertificateTemplate) => void;
  pageMargins: Margins;
  pageOrientation: PageOrientation;
  pageSize: PageSize;
  podiumsData: PodiumData[] | undefined;
  selectedPodiums: PodiumData[];
  selectedTemplate: CertificateTemplate;
  setAgeRange: React.Dispatch<React.SetStateAction<[number, number]>>;
  setContent: React.Dispatch<React.SetStateAction<JSONContent>>;
  setFiles: React.Dispatch<React.SetStateAction<File[]>>;
  setFilterByCountry: React.Dispatch<React.SetStateAction<boolean>>;
  setPageMargins: React.Dispatch<React.SetStateAction<Margins>>;
  setPageOrientation: React.Dispatch<React.SetStateAction<PageOrientation>>;
  setPageSize: React.Dispatch<React.SetStateAction<PageSize>>;
  setSelectedPodiums: React.Dispatch<React.SetStateAction<PodiumData[]>>;
  setTempAgeRange: React.Dispatch<React.SetStateAction<[number, number]>>;
  tempAgeRange: [number, number];
}) {
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
              Selecciona los eventos para los que se generarán los certificados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="podiumType">Tipo de podio</Label>
                <Select
                  value={selectedTemplate}
                  onValueChange={handleTemplateChange}
                >
                  <SelectTrigger className="w-full" id="podiumType">
                    <SelectValue placeholder="Seleccionar tipo de podio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="female">Femeniles</SelectItem>
                    <SelectItem value="newcomer">Primera vez</SelectItem>
                    <SelectItem value="age">Edad</SelectItem>
                  </SelectContent>
                </Select>
                {selectedTemplate === "newcomer" && (
                  <p className="text-xs text-muted-foreground">
                    Competidores que no tienen WCA ID (primera competencia),
                    solo disponible antes de que se publiquen los resultados
                    oficiales de la competencia.
                  </p>
                )}
                {selectedTemplate === "age" && (
                  <div className="space-y-3 mt-2">
                    <p className="text-xs text-muted-foreground">
                      Las fechas de nacimiento se obtienen del WCIF autorizado
                      de la WCA (debes ser organizador o delegado). La edad se
                      calcula al último día de la competencia.
                    </p>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">
                        Rango de edad
                      </Label>
                      <Slider
                        value={tempAgeRange}
                        onValueChange={(value) =>
                          setTempAgeRange(value as [number, number])
                        }
                        onValueCommit={(value) =>
                          setAgeRange(value as [number, number])
                        }
                        min={0}
                        max={100}
                        step={1}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground">
                        {tempAgeRange[0]} - {tempAgeRange[1]} años
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="filterByCountry"
                  className="text-sm font-medium"
                >
                  Filtrar por país
                </Label>
                <div className="flex items-center gap-2 h-10 px-3">
                  <Switch
                    id="filterByCountry"
                    checked={filterByCountry}
                    onCheckedChange={(checked) => setFilterByCountry(!!checked)}
                  />
                  <span className="text-sm text-muted-foreground">
                    {filterByCountry ? "Habilitado" : "Deshabilitado"}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Eventos</h4>
              <div className="grid sm:grid-cols-2 gap-3">
                {competition.event_ids.map((eventId) => (
                  <div
                    key={eventId}
                    className="flex items-center space-x-2 rounded-md p-2 hover:bg-muted/50 transition-colors cursor-pointer"
                    role="presentation"
                    onClick={(e) => {
                      // Only trigger if clicking the container, not the checkbox or label
                      if (e.target === e.currentTarget) {
                        const checkbox = document.getElementById(
                          `event-${eventId}`,
                        );
                        checkbox?.click();
                      }
                    }}
                  >
                    <Checkbox
                      id={`event-${eventId}`}
                      checked={
                        selectedPodiums.filter(
                          (podium) => podium.event === eventId,
                        ).length > 0
                      }
                      onCheckedChange={(checked) => {
                        if (checked) {
                          const podium = podiumsData?.filter(
                            (podium) => podium.event === eventId,
                          );
                          if (podium) {
                            setSelectedPodiums((prev) => [...prev, ...podium]);
                          }
                        } else {
                          setSelectedPodiums((prev) =>
                            prev.filter((podium) => podium.event !== eventId),
                          );
                        }
                      }}
                      disabled={
                        podiumsData?.filter(
                          (podium) => podium.event === eventId,
                        ).length === 0
                      }
                    />
                    <Label
                      htmlFor={`event-${eventId}`}
                      className="flex gap-2 items-center cursor-pointer flex-1"
                    >
                      <span className={`cubing-icon event-${eventId}`} />
                      <p className="text-xs">
                        {eventNames[eventId] || eventId}
                      </p>
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <div className="flex flex-wrap justify-start gap-2 w-full">
              <Button
                aria-label="Seleccionar todos"
                onClick={() => {
                  if (selectedPodiums.length === podiumsData?.length) {
                    setSelectedPodiums([]);
                  } else {
                    setSelectedPodiums(podiumsData || []);
                  }
                }}
                variant="outline"
                size="sm"
              >
                {selectedPodiums.length === podiumsData?.length ? (
                  <X />
                ) : (
                  <Check />
                )}
                {selectedPodiums.length === podiumsData?.length
                  ? "Desmarcar todos"
                  : "Seleccionar todos"}
              </Button>
              {selectedPodiums.length > 0 && (
                <Button
                  aria-label="Borrar selección"
                  onClick={() => {
                    setSelectedPodiums([]);
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
                disabled={selectedPodiums.length === 0}
                onClick={() => generatePDF("open")}
                variant="outline"
              >
                <Eye />
                Vista previa ({Math.ceil(selectedPodiums.length / 3)})
              </Button>
              <Button
                disabled={selectedPodiums.length === 0}
                onClick={() => generatePDF("download")}
              >
                <Download />
                Descargar ({Math.ceil(selectedPodiums.length / 3)})
              </Button>
            </div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fondo</CardTitle>
            <CardDescription>
              Personaliza el fondo del certificado de podio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUploader files={files} setFiles={setFiles} />
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
          content={content}
          key={`${pageSize}-${pageOrientation}-${pageMargins}`}
          onChange={(newContent: JSONContent) => {
            setContent(newContent);
          }}
          pageMargins={pageMargins}
          pageOrientation={pageOrientation}
          pageSize={pageSize}
          pdfDisabled={selectedPodiums.length === 0}
          pdfOnClick={() => generatePDF("download")}
          setPageMargins={(value: Margins) => {
            setPageMargins(value);
          }}
          setPageOrientation={(value: PageOrientation) => {
            setPageOrientation(value);
          }}
          setPageSize={(value: PageSize) => {
            setPageSize(value);
          }}
          background={background}
          variant="podium"
        />
      </form>
    </div>
  );
}
