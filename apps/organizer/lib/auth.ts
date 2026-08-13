import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { genericOAuth } from "better-auth/plugins";

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

export const auth = betterAuth({
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 2 * 60 * 60, // 2 hours cache duration
      strategy: "jwe", // can be "jwt" or "compact"
      refreshCache: true, // Enable stateless refresh
    },
  },
  account: {
    storeStateStrategy: "cookie",
    storeAccountCookie: true, // Store account data after OAuth flow in a cookie (useful for database-less flows)
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
              // WCA returns expires_in as seconds (integer)
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

            const userId = data.me.wca_id || data.me.id.toString();
            return {
              id: userId,
              name: data.me.name,
              email: `${userId.toLowerCase()}@wca.org`,
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
    nextCookies(),
  ],
});
