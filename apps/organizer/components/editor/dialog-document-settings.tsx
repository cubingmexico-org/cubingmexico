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
import { Input } from "@workspace/ui/components/input";
import type { Margins, PageOrientation, PageSize } from "pdfmake/interfaces";
import { FileText } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { MenubarItem } from "@workspace/ui/components/menubar";

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
              <Label htmlFor="top">Superior</Label>
              <Input
                className="w-full"
                id="top"
                max={200}
                min={0}
                onChange={(e) => {
                  if (
                    Array.isArray(tempPageMargins) &&
                    tempPageMargins.length === 4
                  ) {
                    setTempPageMargins([
                      tempPageMargins[0],
                      parseInt(e.target.value),
                      tempPageMargins[2],
                      tempPageMargins[3],
                    ]);
                  }
                }}
                type="number"
                value={
                  Array.isArray(tempPageMargins) && tempPageMargins.length === 4
                    ? tempPageMargins[1]
                    : 0
                }
              />
              <Label htmlFor="bottom">Inferior</Label>
              <Input
                className="w-full"
                id="bottom"
                max={200}
                min={0}
                onChange={(e) => {
                  if (
                    Array.isArray(tempPageMargins) &&
                    tempPageMargins.length === 4
                  ) {
                    setTempPageMargins([
                      tempPageMargins[0],
                      tempPageMargins[1],
                      tempPageMargins[2],
                      parseInt(e.target.value),
                    ]);
                  }
                }}
                type="number"
                value={
                  Array.isArray(tempPageMargins) && tempPageMargins.length === 4
                    ? tempPageMargins[3]
                    : 0
                }
              />
              <Label htmlFor="right">Derecho</Label>
              <Input
                className="w-full"
                id="right"
                max={200}
                min={0}
                onChange={(e) => {
                  if (
                    Array.isArray(tempPageMargins) &&
                    tempPageMargins.length === 4
                  ) {
                    setTempPageMargins([
                      tempPageMargins[0],
                      tempPageMargins[1],
                      parseInt(e.target.value),
                      tempPageMargins[3],
                    ]);
                  }
                }}
                type="number"
                value={
                  Array.isArray(tempPageMargins) && tempPageMargins.length === 4
                    ? tempPageMargins[2]
                    : 0
                }
              />
              <Label htmlFor="left">Izquierdo</Label>
              <Input
                className="w-full"
                id="left"
                max={200}
                min={0}
                onChange={(e) => {
                  if (
                    Array.isArray(tempPageMargins) &&
                    tempPageMargins.length === 4
                  ) {
                    setTempPageMargins([
                      parseInt(e.target.value),
                      tempPageMargins[1],
                      tempPageMargins[2],
                      tempPageMargins[3],
                    ]);
                  }
                }}
                type="number"
                value={
                  Array.isArray(tempPageMargins) && tempPageMargins.length === 4
                    ? tempPageMargins[0]
                    : 0
                }
              />
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
