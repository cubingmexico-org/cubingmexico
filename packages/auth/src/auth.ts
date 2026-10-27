import { betterAuth, type BetterAuthOptions } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { customSession, genericOAuth } from "better-auth/plugins";
import { wcaFetch, wcaUrl } from "@workspace/wca";
import {
  tokensFromWcaResponse,
  trustedOriginsFromEnv,
  userFromWcaProfile,
  wcaIdFromUser,
  type WCAProfile,
  type WCATokenResponse,
} from "./wca-profile";

const cookieDomain = process.env.AUTH_COOKIE_DOMAIN?.trim() || undefined;

const options = {
  advanced: {
    crossSubDomainCookies: {
      enabled: Boolean(cookieDomain),
      domain: cookieDomain,
    },
  },
  trustedOrigins: trustedOriginsFromEnv(),
  user: {
    additionalFields: {
      wcaId: {
        type: "string",
        required: false,
        returned: true,
        input: false,
      },
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 2 * 60 * 60,
      strategy: "jwe" as const,
      refreshCache: true,
      version: "4",
    },
  },
  account: {
    storeStateStrategy: "cookie" as const,
    storeAccountCookie: true,
    accountLinking: {
      enabled: true,
      trustedProviders: ["wca"],
    },
  },
  plugins: [
    genericOAuth({
      config: [
        {
          providerId: "wca",
          clientId: process.env.WCA_CLIENT_ID || "",
          clientSecret: process.env.WCA_CLIENT_SECRET || "",
          redirectURI: `${process.env.BETTER_AUTH_URL}/api/auth/callback/wca`,
          discoveryUrl: wcaUrl("/.well-known/openid-configuration"),
          scopes: ["public", "manage_competitions"],
          getToken: async ({ code, redirectURI }) => {
            const response = await wcaFetch("/oauth/token", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                grant_type: "authorization_code",
                client_id: process.env.WCA_CLIENT_ID,
                client_secret: process.env.WCA_CLIENT_SECRET,
                code: code,
                redirect_uri: redirectURI,
              }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error("WCA Token Error:", errorText);
              throw new Error("Failed to retrieve WCA token");
            }

            return tokensFromWcaResponse(
              (await response.json()) as WCATokenResponse,
            );
          },
          getUserInfo: async ({ accessToken }) => {
            const response = await wcaFetch("/api/v0/me", {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error("WCA Profile Error:", response.status, errorText);
              throw new Error("Failed to retrieve WCA profile");
            }

            return userFromWcaProfile((await response.json()) as WCAProfile);
          },
        },
      ],
    }),
  ],
} satisfies BetterAuthOptions;

export const auth = betterAuth({
  ...options,
  plugins: [
    ...(options.plugins ?? []),
    customSession(async ({ user, session }) => {
      return {
        user: {
          ...user,
          wcaId: wcaIdFromUser(user),
        },
        session,
      };
    }, options),
    nextCookies(),
  ],
});
