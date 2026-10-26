import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Competition } from "@/types/wca";

const { getCompetitionById } = vi.hoisted(() => ({
  getCompetitionById: vi.fn(),
}));

vi.mock("@/db/queries", () => ({ getCompetitionById }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));

import {
  assertManagesCompetition,
  canReadDesign,
  canWriteDesign,
  userManagesCompetition,
} from "./design-access";

type Person = { id: number; wca_id: string | null };

function competition({
  organizers = [],
  delegates = [],
}: {
  organizers?: Person[];
  delegates?: Person[];
}): Competition {
  return {
    id: "TestOpen2026",
    organizers,
    delegates,
  } as unknown as Competition;
}

describe("userManagesCompetition", () => {
  it("matches an organizer by WCA ID", () => {
    const comp = competition({
      organizers: [{ id: 1, wca_id: "2015ABCD01" }],
    });
    expect(userManagesCompetition("2015ABCD01", comp)).toBe(true);
  });

  it("matches a delegate by WCA ID", () => {
    const comp = competition({ delegates: [{ id: 2, wca_id: "2016WXYZ02" }] });
    expect(userManagesCompetition("2016WXYZ02", comp)).toBe(true);
  });

  it("matches by numeric id when the person has no WCA ID", () => {
    const comp = competition({ organizers: [{ id: 123, wca_id: null }] });
    expect(userManagesCompetition("123", comp)).toBe(true);
  });

  it("does not match another account's numeric id", () => {
    const comp = competition({ organizers: [{ id: 123, wca_id: null }] });
    expect(userManagesCompetition("124", comp)).toBe(false);
  });

  it("rejects users who are neither organizers nor delegates", () => {
    const comp = competition({
      organizers: [{ id: 1, wca_id: "2015ABCD01" }],
      delegates: [{ id: 2, wca_id: "2016WXYZ02" }],
    });
    expect(userManagesCompetition("2017NOPE03", comp)).toBe(false);
  });

  it("rejects when the competition has no staff", () => {
    expect(userManagesCompetition("2015ABCD01", competition({}))).toBe(false);
  });
});

describe("assertManagesCompetition", () => {
  beforeEach(() => {
    getCompetitionById.mockReset();
  });

  it("fails when the competition does not exist", async () => {
    getCompetitionById.mockResolvedValue(undefined);
    await expect(
      assertManagesCompetition("2015ABCD01", "Missing2026"),
    ).resolves.toEqual({ ok: false });
    expect(getCompetitionById).toHaveBeenCalledWith({ id: "Missing2026" });
  });

  it("fails when the user does not manage the competition", async () => {
    getCompetitionById.mockResolvedValue(
      competition({ organizers: [{ id: 1, wca_id: "2015ABCD01" }] }),
    );
    await expect(
      assertManagesCompetition("2017NOPE03", "TestOpen2026"),
    ).resolves.toEqual({ ok: false });
  });

  it("returns the competition when the user manages it", async () => {
    const comp = competition({
      delegates: [{ id: 2, wca_id: "2016WXYZ02" }],
    });
    getCompetitionById.mockResolvedValue(comp);
    await expect(
      assertManagesCompetition("2016WXYZ02", "TestOpen2026"),
    ).resolves.toEqual({ ok: true, competition: comp });
  });
});

describe("canReadDesign", () => {
  const base = {
    userId: "2015ABCD01",
    competitionId: null,
    userIdOwner: "2016WXYZ02",
    isPublic: false,
    ownerScope: "user" as const,
    managesCompetition: false,
  };

  it("uses only competition management for competition designs", () => {
    const competitionDesign = {
      ...base,
      competitionId: "TestOpen2026",
      userIdOwner: base.userId,
      isPublic: true,
      ownerScope: "global" as const,
    };
    expect(canReadDesign(competitionDesign)).toBe(false);
    expect(
      canReadDesign({ ...competitionDesign, managesCompetition: true }),
    ).toBe(true);
  });

  it("allows org and global designs", () => {
    expect(canReadDesign({ ...base, ownerScope: "org" })).toBe(true);
    expect(canReadDesign({ ...base, ownerScope: "global" })).toBe(true);
  });

  it("allows public designs", () => {
    expect(canReadDesign({ ...base, isPublic: true })).toBe(true);
  });

  it("allows private user designs only for their owner", () => {
    expect(canReadDesign(base)).toBe(false);
    expect(canReadDesign({ ...base, userIdOwner: base.userId })).toBe(true);
  });
});

describe("canWriteDesign", () => {
  const base = {
    userId: "2015ABCD01",
    competitionId: null,
    userIdOwner: "2016WXYZ02",
    ownerScope: "user" as const,
    managesCompetition: false,
  };

  it("uses only competition management for competition designs", () => {
    const competitionDesign = {
      ...base,
      competitionId: "TestOpen2026",
      userIdOwner: base.userId,
    };
    expect(canWriteDesign(competitionDesign)).toBe(false);
    expect(
      canWriteDesign({ ...competitionDesign, managesCompetition: true }),
    ).toBe(true);
  });

  it("never allows writing org or global designs", () => {
    const owned = { ...base, userIdOwner: base.userId };
    expect(canWriteDesign({ ...owned, ownerScope: "org" })).toBe(false);
    expect(canWriteDesign({ ...owned, ownerScope: "global" })).toBe(false);
  });

  it("allows user designs only for their owner", () => {
    expect(canWriteDesign(base)).toBe(false);
    expect(canWriteDesign({ ...base, userIdOwner: base.userId })).toBe(true);
  });
});
