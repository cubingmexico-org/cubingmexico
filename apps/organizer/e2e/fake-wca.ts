import { createServer, type Server } from "node:http";
import type { Competition } from "@/types/wca";
import type { Result, WCIF } from "@/types/wcif";
import { makePrintablesWcif } from "@/test/wcif-fixture";
import { FAKE_WCA_ORIGIN, FAKE_WCA_PORT } from "./constants";

/**
 * Stand-in for the WCA OAuth server and API, so the end-to-end suite signs in through
 * the real Better Auth flow. The organizer reaches it through WCA_ORIGIN.
 */

export const SIGNED_IN = {
  wcaId: "2015LOPE01",
  userId: 1001,
  name: "Ana López",
};

function result(personId: number, ranking: number, best: number): Result {
  return {
    personId,
    ranking,
    best,
    average: best + 150,
    attempts: [best, best + 100, best + 150, best + 200, best + 250].map(
      (value) => ({ value }),
    ),
  };
}

export function fakeWcif(): WCIF {
  const wcif = makePrintablesWcif();
  wcif.events[0]!.rounds[0]!.results = [
    result(1, 1, 950),
    result(2, 2, 1120),
    result(3, 3, 1310),
    result(4, 4, 1530),
  ];
  wcif.events[1]!.rounds[0]!.results = [
    { ...result(1, 1, 4500), average: 0 },
    { ...result(3, 2, 6100), average: 0 },
  ];
  return wcif;
}

function isoDate(daysFromToday: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

export function fakeCompetition(): Competition {
  const wcif = makePrintablesWcif();
  // Upcoming, so it shows on the home page's default tab and its tools stay available.
  return {
    id: wcif.id,
    name: wcif.name,
    short_name: wcif.shortName,
    city: "Ciudad de México",
    country_iso2: "MX",
    start_date: isoDate(30),
    end_date: isoDate(30),
    announced_at: new Date().toISOString(),
    results_posted_at: null,
    cancelled_at: null,
    event_ids: ["333", "333bf"],
    organizers: [{ id: SIGNED_IN.userId, wca_id: SIGNED_IN.wcaId }],
    delegates: [],
  } as unknown as Competition;
}

function json(
  res: import("node:http").ServerResponse,
  status: number,
  body: unknown,
) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

export function startFakeWca(port = FAKE_WCA_PORT): Promise<Server> {
  const competition = fakeCompetition();
  const wcif = fakeWcif();

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", FAKE_WCA_ORIGIN);
    const path = url.pathname;

    if (path === "/.well-known/openid-configuration") {
      return json(res, 200, {
        issuer: FAKE_WCA_ORIGIN,
        authorization_endpoint: `${FAKE_WCA_ORIGIN}/oauth/authorize`,
        token_endpoint: `${FAKE_WCA_ORIGIN}/oauth/token`,
        userinfo_endpoint: `${FAKE_WCA_ORIGIN}/api/v0/me`,
        response_types_supported: ["code"],
        scopes_supported: ["public", "manage_competitions"],
      });
    }

    // Approve every authorization request straight away.
    if (path === "/oauth/authorize") {
      const redirect = new URL(url.searchParams.get("redirect_uri") ?? "");
      redirect.searchParams.set("code", "fake-code");
      const state = url.searchParams.get("state");
      if (state) redirect.searchParams.set("state", state);
      res.writeHead(302, { Location: redirect.toString() });
      return res.end();
    }

    if (path === "/oauth/token" && req.method === "POST") {
      return json(res, 200, {
        access_token: "fake-access-token",
        refresh_token: "fake-refresh-token",
        token_type: "Bearer",
        expires_in: 7200,
        scope: "public manage_competitions",
      });
    }

    if (path === "/api/v0/me") {
      return json(res, 200, {
        me: {
          id: SIGNED_IN.userId,
          wca_id: SIGNED_IN.wcaId,
          name: SIGNED_IN.name,
          avatar: { url: null, thumb_url: null, pending_url: "" },
        },
      });
    }

    if (path === "/api/v0/competitions") {
      return json(res, 200, [competition]);
    }

    const match = path.match(
      /^\/api\/v0\/competitions\/([^/]+)(\/wcif(?:\/(?:latest|public))?)?$/,
    );
    if (match?.[1] === competition.id) {
      return json(res, 200, match[2] ? wcif : competition);
    }

    json(res, 404, { error: "Not found" });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => resolve(server));
  });
}
