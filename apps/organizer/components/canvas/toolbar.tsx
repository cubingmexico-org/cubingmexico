"use client";

import { Button } from "@workspace/ui/components/button";
import { Type, ImageIcon, QrCode, Square } from "lucide-react";
import { useCanvasStore } from "@/lib/canvas-store";

export function Toolbar() {
  const { addElement } = useCanvasStore();

  const addText = () => {
    addElement({
      id: `text-${Date.now()}`,
      type: "text",
      x: 100,
      y: 100,
      width: 231,
      height: 30,
      opacity: 1,
      rotation: 0,
      content: "Doble clic para editar",
      fontSize: 24,
      textAlign: "left",
      fontFamily: "Arial",
      color: "#000000",
    });
  };

  const addRectangle = () => {
    addElement({
      id: `rect-${Date.now()}`,
      type: "rectangle",
      x: 150,
      y: 150,
      width: 200,
      height: 150,
      rotation: 0,
      backgroundColor: "#3b82f6",
    });
  };

  // const addCircle = () => {
  //   addElement({
  //     id: `circle-${Date.now()}`,
  //     type: "circle",
  //     x: 200,
  //     y: 200,
  //     width: 150,
  //     height: 150,
  //     rotation: 0,
  //     backgroundColor: "#8b5cf6",
  //   });
  // };

  const addImage = () => {
    addElement({
      id: `image-${Date.now()}`,
      type: "image",
      x: 250,
      y: 250,
      width: 200,
      height: 200,
      opacity: 1,
      rotation: 0,
      imageUrl: "/placeholder.svg",
      keepAspectRatio: true,
    });
  };

  const addQRCode = () => {
    addElement({
      id: `qrcode-${Date.now()}`,
      type: "qrcode",
      x: 300,
      y: 300,
      width: 150,
      height: 150,
      opacity: 1,
      rotation: 0,
      qrData: "https://live.worldcubeassociation.org/",
      qrDataSource: "wca-live",
      qrForeground: "#000000",
      qrBackground: "#ffffff",
      qrErrorCorrection: "M",
      keepAspectRatio: true,
    });
  };

  return (
    <div className="w-20 bg-card border-r border-border flex flex-col items-center gap-2 py-4">
      <Button
        variant="ghost"
        size="icon"
        className="w-14 h-14 flex flex-col gap-1"
        onClick={addText}
        title="Añadir Texto"
      >
        <Type className="h-5 w-5" />
        <span className="text-xs">Texto</span>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="w-14 h-14 flex flex-col gap-1"
        onClick={addImage}
        title="Añadir Imagen"
      >
        <ImageIcon className="h-5 w-5" />
        <span className="text-xs">Imagen</span>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="w-14 h-14 flex flex-col gap-1"
        onClick={addQRCode}
        title="Añadir Código QR"
      >
        <QrCode className="h-5 w-5" />
        <span className="text-xs">QR</span>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="w-14 h-14 flex flex-col gap-1"
        onClick={addRectangle}
        title="Add Rectangle"
      >
        <Square className="h-5 w-5" />
        <span className="text-xs">Cuadro</span>
      </Button>

      {/* <Button
        variant="ghost"
        size="icon"
        className="w-14 h-14 flex flex-col gap-1"
        onClick={addCircle}
        title="Add Circle"
      >
        <Circle className="h-5 w-5" />
        <span className="text-xs">Círculo</span>
      </Button> */}
    </div>
  );
}
