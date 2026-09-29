"use client";

import React, { useState, useEffect } from "react";
import { Label } from "@workspace/ui/components/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@workspace/ui/components/select";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import type { Margins, PageOrientation, PageSize } from "pdfmake/interfaces";
import { FileText } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { MenubarItem } from "@workspace/ui/components/menubar";
import { NumberInput } from "@/components/number-input";

/** pdfmake margin order is [left, top, right, bottom]. */
const MARGIN_FIELDS = [
  { id: "top", label: "Superior", index: 1 },
  { id: "bottom", label: "Inferior", index: 3 },
  { id: "right", label: "Derecho", index: 2 },
  { id: "left", label: "Izquierdo", index: 0 },
] as const;

interface DialogDocumentSettingsProps {
  pageOrientation: PageOrientation;
  setPageOrientation: (value: PageOrientation) => void;
  pageSize: PageSize;
  setPageSize: (value: PageSize) => void;
  pageMargins: Margins;
  setPageMargins: (value: Margins) => void;
  certificateVariant: "participation" | "podium";
}

export function DialogDocumentSettings({
  pageOrientation,
  setPageOrientation,
  pageSize,
  setPageSize,
  pageMargins,
  setPageMargins,
  certificateVariant,
}: DialogDocumentSettingsProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [tempPageOrientation, setTempPageOrientation] =
    useState(pageOrientation);
  const [tempPageSize, setTempPageSize] = useState(pageSize);
  const [tempPageMargins, setTempPageMargins] = useState(pageMargins);

  useEffect(() => {
    setTempPageOrientation(pageOrientation);
    setTempPageSize(pageSize);
    setTempPageMargins(pageMargins);
  }, [pageOrientation, pageSize, pageMargins]);

  const handleSave = () => {
    setPageOrientation(tempPageOrientation);
    setPageSize(tempPageSize);
    setPageMargins(tempPageMargins);
  };

  const handleReset = () => {
    setTempPageOrientation(
      certificateVariant === "participation" ? "portrait" : "landscape",
    );
    setTempPageSize("LETTER");
    setTempPageMargins([40, 60, 40, 60]);
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <MenubarItem
        onClick={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
      >
        <FileText />
        Configuración de página
      </MenubarItem>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configuración de página</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="pageOrientation">Orientación</Label>
              <RadioGroup
                className="flex"
                defaultValue="portrait"
                id="pageOrientation"
                onValueChange={(value: PageOrientation) => {
                  setTempPageOrientation(value);
                }}
                value={tempPageOrientation}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="portrait" value="portrait" />
                  <Label htmlFor="portrait">Vertical</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem id="landscape" value="landscape" />
                  <Label htmlFor="landscape">Horizontal</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pageSize">Tamaño de papel</Label>
              <Select
                onValueChange={(value: string) => {
                  setTempPageSize(value as PageSize);
                }}
                value={tempPageSize as string}
              >
                <SelectTrigger className="w-full" id="pageSize">
                  <SelectValue placeholder="" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LETTER">
                    Carta (21.6 cm x 27.9 cm)
                  </SelectItem>
                  <SelectItem value="A4">A4 (21 cm x 29.7 cm)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pageMargins">Márgenes</Label>
            <div className="grid items-center grid-cols-2 gap-2">
              {MARGIN_FIELDS.map(({ id, label, index }) => (
                <React.Fragment key={id}>
                  <Label htmlFor={id}>{label}</Label>
                  <NumberInput
                    className="w-full"
                    id={id}
                    max={200}
                    min={0}
                    onValueChange={(value) => {
                      if (
                        Array.isArray(tempPageMargins) &&
                        tempPageMargins.length === 4
                      ) {
                        const next = [...tempPageMargins] as [
                          number,
                          number,
                          number,
                          number,
                        ];
                        next[index] = value;
                        setTempPageMargins(next);
                      }
                    }}
                    value={
                      Array.isArray(tempPageMargins) &&
                      tempPageMargins.length === 4
                        ? tempPageMargins[index]
                        : 0
                    }
                  />
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleReset} variant="outline">
            Restablecer
          </Button>
          <Button onClick={() => setOpen(false)} variant="secondary">
            Cancelar
          </Button>
          <Button onClick={handleSave}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
