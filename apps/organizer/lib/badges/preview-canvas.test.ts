import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CanvasElement } from "@/types/canvas";
import type { EventId, ExtendedPerson } from "@/types/wcif";
import { drawElements, type BadgePreviewData } from "./preview-canvas";

const toDataURL = vi.hoisted(() => vi.fn(async () => "data:image/png;qr"));
vi.mock("qrcode", () => ({ default: { toDataURL } }));
vi.mock("@/lib/load-fonts", () => ({
  canvasFont: (weight: string, size: number, family: string) =>
    `${weight} ${size}px ${family}`,
  ensureFontLoaded: async () => {},
}));

let loadedImages: string[] = [];

class FakeImage {
  width = 10;
  height = 10;
  crossOrigin = "";
  onload: (() => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;

  set src(value: string) {
    loadedImages.push(value);
    queueMicrotask(() => this.onload?.());
  }
}

function recordingContext() {
  const texts: string[] = [];
  const ctx = new Proxy(
    {
      fillText: (text: string) => texts.push(text),
      measureText: (text: string) => ({ width: text.length * 5 }),
    } as Record<string | symbol, unknown>,
    {
      get: (target, key) => (key in target ? target[key] : () => {}),
      set: () => true,
    },
  );
  return { ctx: ctx as unknown as CanvasRenderingContext2D, texts };
}

beforeEach(() => {
  loadedImages = [];
  toDataURL.mockClear();
  vi.stubGlobal("Image", FakeImage);
  vi.stubGlobal("document", {
    createElement: () => ({ getContext: () => recordingContext().ctx }),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function element(values: Partial<CanvasElement>): CanvasElement {
  return {
    id: values.type ?? "el",
    type: "text",
    x: 0,
    y: 0,
    width: 400,
    height: 40,
    rotation: 0,
    ...values,
  };
}

const ELEMENTS: CanvasElement[] = [
  element({ type: "text", content: "Hola @nombre @grupo" }),
  element({ type: "image", imageUrl: "/avatar.png" }),
  element({ type: "image", imageUrl: "/competition-logo.svg" }),
  element({ type: "image", imageUrl: "/events.svg" }),
  element({ type: "qrcode", qrDataSource: "competition-groups" }),
];

const COMPETITION_EVENTS: EventId[] = ["333", "222", "444"];

function person(values: Partial<ExtendedPerson>): ExtendedPerson {
  return {
    name: "Ana",
    wcaUserId: 1,
    wcaId: "2020ANAA01",
    registrantId: 7,
    countryIso2: "MX",
    gender: "f",
    registration: {
      wcaRegistrationId: 1,
      eventIds: ["444", "333"],
      status: "accepted",
      isCompeting: true,
    },
    avatar: {
      url: "https://avatars.example/ana.jpg",
    } as ExtendedPerson["avatar"],
    roles: [],
    assignments: [],
    personalBests: [],
    extensions: [],
    stateId: "JAL",
    ...values,
  };
}

function badgeData(badgePerson: ExtendedPerson): BadgePreviewData {
  return {
    person: badgePerson,
    states: [],
    teams: [],
    competitionId: "Comp2024",
    competitionEventIds: COMPETITION_EVENTS,
  };
}

describe("drawElements", () => {
  it("fills in a person's badge with their data, avatar, events and groups QR", async () => {
    const { ctx, texts } = recordingContext();
    await drawElements(ctx, ELEMENTS, badgeData(person({})));

    expect(texts.join(" ")).toContain("Hola Ana");
    expect(loadedImages).toContain(
      `/api/image-proxy?url=${encodeURIComponent("https://avatars.example/ana.jpg")}`,
    );
    expect(loadedImages.filter((src) => src.startsWith("/events/"))).toEqual([
      "/events/333.svg",
      "/events/444.svg",
    ]);
    expect(toDataURL).toHaveBeenCalledWith(
      "https://www.competitiongroups.com/competitions/Comp2024/persons/7",
      expect.anything(),
    );
  });

  it("renders a blank badge without placeholders, person images or the groups QR", async () => {
    const { ctx, texts } = recordingContext();
    await drawElements(
      ctx,
      ELEMENTS,
      badgeData(person({ name: "", registration: null, avatar: null })),
    );

    expect(texts.join(" ")).not.toContain("@");
    expect(loadedImages).not.toContain("/avatar.png");
    expect(loadedImages).toContain("/logo.svg");
    expect(loadedImages.filter((src) => src.startsWith("/events/"))).toEqual([
      "/events/333.svg",
      "/events/222.svg",
      "/events/444.svg",
    ]);
    expect(toDataURL).not.toHaveBeenCalled();
  });
});
