export type ElementType = "text" | "rectangle" | "circle" | "image" | "qrcode";

interface DropShadow {
  enabled: boolean;
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
}

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  content?: string;
  opacity?: number;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: "normal" | "bold"; // | "bolder" | "lighter" | number;
  textAlign?: "center" | "end" | "left" | "right" | "start";
  color?: string;
  dropShadow?: DropShadow;
  backgroundColor?: string;
  imageUrl?: string;
  borderRadius?: number;
  keepAspectRatio?: boolean;
  isFlag?: boolean;
  qrData?: string;
  qrForeground?: string;
  qrBackground?: string;
  qrErrorCorrection?: "L" | "M" | "Q" | "H";
  qrDataSource?: "wca-live" | "competition-groups" | "custom";
  qrIncludeIcon?: boolean;
}

export interface CanvasState {
  elements: {
    front: CanvasElement[];
    back: CanvasElement[];
  };
  enableBackSide: boolean;
  setEnableBackSide: (enable: boolean) => void;
  activeSide: "front" | "back";
  setActiveSide: (side: "front" | "back") => void;
  selectedElementId: string | null;
  canvasWidth: number;
  canvasHeight: number;
  backgroundImage?: string;
  backgroundImageBack?: string;
}
