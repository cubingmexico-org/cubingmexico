import { describe, expect, it } from "vitest";
import {
  tokensFromWcaResponse,
  trustedOriginsFromEnv,
  userFromWcaProfile,
  wcaAccountSubject,
  wcaIdFromUser,
  type WCAProfile,
} from "./wca-profile";

function profile(me: Partial<WCAProfile["me"]> = {}): WCAProfile {
  return {
    me: {
      id: 1234,
      wca_id: "2015ABCD01",
      name: "Ana Cubera",
      avatar: {
        url: "https://avatars.example/full.jpg",
        thumb_url: "https://avatars.example/thumb.jpg",
        pending_url: "https://avatars.example/pending.jpg",
      },
      ...me,
    },
  };
}

describe("wcaAccountSubject", () => {
  it("is the WCA ID, or the numeric account id without one", () => {
    expect(wcaAccountSubject(profile())).toBe("2015ABCD01");
    expect(wcaAccountSubject(profile({ wca_id: null }))).toBe("1234");
  });
});

describe("userFromWcaProfile", () => {
  it("puts the WCA ID in the synthetic email", () => {
    expect(userFromWcaProfile(profile())).toEqual({
      wcaId: "2015ABCD01",
      name: "Ana Cubera",
      email: "2015abcd01@wca.org",
      image: "https://avatars.example/thumb.jpg",
      emailVerified: true,
    });
  });

  it("falls back to the numeric account id without a WCA ID", () => {
    const user = userFromWcaProfile(profile({ wca_id: null }));
    expect(user).toMatchObject({
      wcaId: "1234",
      email: "1234@wca.org",
    });
  });

  it("uses the pending avatar until one is approved", () => {
    const user = userFromWcaProfile(
      profile({
        avatar: {
          url: null,
          thumb_url: null,
          pending_url: "https://avatars.example/pending.jpg",
        },
      }),
    );
    expect(user.image).toBe("https://avatars.example/pending.jpg");
  });
});

describe("wcaIdFromUser", () => {
  it("prefers the stored wcaId", () => {
    expect(wcaIdFromUser({ wcaId: "2015ABCD01", email: "other@wca.org" })).toBe(
      "2015ABCD01",
    );
  });

  it("restores the WCA ID from the synthetic email", () => {
    expect(wcaIdFromUser({ email: "2015abcd01@WCA.org" })).toBe("2015ABCD01");
    expect(wcaIdFromUser({ email: "1234@wca.org" })).toBe("1234");
  });

  it("returns null for other emails", () => {
    expect(wcaIdFromUser({ email: "ana@example.com" })).toBeNull();
    expect(wcaIdFromUser({ email: null })).toBeNull();
  });

  it("round-trips the user built from a profile", () => {
    const { email } = userFromWcaProfile(profile());
    expect(wcaIdFromUser({ email })).toBe("2015ABCD01");
  });
});

describe("tokensFromWcaResponse", () => {
  it("turns expires_in into an expiry date and splits scopes", () => {
    const now = Date.UTC(2026, 0, 1);
    const data = {
      access_token: "access",
      refresh_token: "refresh",
      expires_in: 7200,
      scope: "public manage_competitions",
    };

    expect(tokensFromWcaResponse(data, now)).toEqual({
      accessToken: "access",
      refreshToken: "refresh",
      accessTokenExpiresAt: new Date(now + 7_200_000),
      scopes: ["public", "manage_competitions"],
      raw: data,
    });
  });

  it("returns no scopes when the response has none", () => {
    const tokens = tokensFromWcaResponse({
      access_token: "access",
      expires_in: 60,
    });
    expect(tokens.scopes).toEqual([]);
  });
});

describe("trustedOriginsFromEnv", () => {
  it("splits, trims and drops empty entries", () => {
    expect(
      trustedOriginsFromEnv(" https://a.example , ,https://b.example,"),
    ).toEqual(["https://a.example", "https://b.example"]);
  });

  it("returns no origins when unset", () => {
    expect(trustedOriginsFromEnv("")).toEqual([]);
  });
});
