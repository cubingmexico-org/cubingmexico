import type { useCanvasStore } from "@/lib/canvas-store";
import type { ExtendedPerson, WCIF } from "@/types/wcif";
import type { State, Team } from "@/db/queries";
import type { Competition } from "@/types/wca";
import { createCanvasForSide as drawBadgeSide } from "./preview-canvas";

type CanvasStoreState = ReturnType<typeof useCanvasStore.getState>;

export function createBadgeRenderer({
  competition,
  states,
  teams,
  wcif,
  competitionLogoUrl,
  elements,
  canvasWidth,
  canvasHeight,
  backgroundImage,
  backgroundImageBack,
}: {
  competition: Competition;
  states: State[];
  teams: Team[];
  wcif: WCIF;
  competitionLogoUrl?: string | null;
  elements: CanvasStoreState["elements"];
  canvasWidth: number;
  canvasHeight: number;
  backgroundImage: CanvasStoreState["backgroundImage"];
  backgroundImageBack: CanvasStoreState["backgroundImageBack"];
}) {
  const DPI = 300;
  const pxToMm = (px: number) => (px * 25.4) / DPI;

  const createCanvasForSide = async (
    person: ExtendedPerson,
    side: "front" | "back",
  ): Promise<HTMLCanvasElement> => {
    const canvas = await drawBadgeSide({
      elements: elements[side],
      backgroundImage:
        (side === "front" ? backgroundImage : backgroundImageBack) || undefined,
      canvasWidth,
      canvasHeight,
      person,
      states,
      teams,
      wcif,
      competitionId: competition.id,
      competitionLogoUrl,
      competitionEventIds: competition.event_ids,
    });
    if (canvas) return canvas;

    const blank = document.createElement("canvas");
    blank.width = canvasWidth;
    blank.height = canvasHeight;
    return blank;
  };

  return { pxToMm, createCanvasForSide };
}

export type BadgeRenderer = ReturnType<typeof createBadgeRenderer>;
