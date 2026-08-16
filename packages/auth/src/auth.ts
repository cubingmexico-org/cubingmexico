import { betterAuth, type BetterAuthOptions } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { customSession, genericOAuth } from "better-auth/plugins";

interface WCAProfile {
  me: {
    id: string | number;
    wca_id: string | null;
    name: string;
    avatar: {
      url: string | null;
      thumb_url: string | null;
      pending_url: string;
    };
  };
}

/**
 * Cookie-only OAuth does not persist user.additionalFields.
 * We encode the WCA ID in the synthetic email and restore it here.
 */
function wcaIdFromUser(user: {
  email?: string | null;
  wcaId?: string | null;
}): string | null {
  if (user.wcaId) {
    return user.wcaId;
  }

  const email = user.email;
  if (email?.toLowerCase().endsWith("@wca.org")) {
    return email.slice(0, -"@wca.org".length).toUpperCase();
  }

  return null;
}

function trustedOriginsFromEnv(): string[] {
  return (process.env.AUTH_TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((origin: string) => origin.trim())
    .filter(Boolean);
}

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
          discoveryUrl:
            "https://www.worldcubeassociation.org/.well-known/openid-configuration",
          scopes: ["public", "manage_competitions"],
          getToken: async ({ code, redirectURI }) => {
            const response = await fetch(
              "https://www.worldcubeassociation.org/oauth/token",
              {
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
              },
            );

            if (!response.ok) {
              const errorText = await response.text();
              console.error("WCA Token Error:", errorText);
              throw new Error("Failed to retrieve WCA token");
            }

            const data = await response.json();

            return {
              accessToken: data.access_token,
              refreshToken: data.refresh_token,
              accessTokenExpiresAt: new Date(
                Date.now() + data.expires_in * 1000,
              ),
              scopes: data.scope ? data.scope.split(" ") : [],
              raw: data,
            };
          },
          getUserInfo: async ({ accessToken }) => {
            const response = await fetch(
              "https://www.worldcubeassociation.org/api/v0/me",
              {
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              },
            );

            const data = (await response.json()) as WCAProfile;

            const wcaId = data.me.wca_id || data.me.id.toString();
            return {
              id: wcaId,
              wcaId,
              name: data.me.name,
              email: `${wcaId.toLowerCase()}@wca.org`,
              image:
                (data.me.avatar.url
                  ? data.me.avatar.thumb_url
                  : data.me.avatar.pending_url) ?? undefined,
              emailVerified: true,
            };
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
