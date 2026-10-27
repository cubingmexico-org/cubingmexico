export interface WCAProfile {
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

export type WCATokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
};

const WCA_EMAIL_DOMAIN = "@wca.org";

/**
 * Cookie-only OAuth does not persist user.additionalFields.
 * We encode the WCA ID in the synthetic email and restore it here.
 */
export function wcaIdFromUser(user: {
  email?: string | null;
  wcaId?: string | null;
}): string | null {
  if (user.wcaId) {
    return user.wcaId;
  }

  const email = user.email;
  if (email?.toLowerCase().endsWith(WCA_EMAIL_DOMAIN)) {
    return email.slice(0, -WCA_EMAIL_DOMAIN.length).toUpperCase();
  }

  return null;
}

export function trustedOriginsFromEnv(
  value = process.env.AUTH_TRUSTED_ORIGINS,
): string[] {
  return (value ?? "")
    .split(",")
    .map((origin: string) => origin.trim())
    .filter(Boolean);
}

/** Users without a WCA ID are identified by their numeric WCA account id. */
export function wcaAccountSubject(profile: WCAProfile): string {
  return profile.me.wca_id || profile.me.id.toString();
}

export function userFromWcaProfile(profile: WCAProfile) {
  const wcaId = wcaAccountSubject(profile);
  return {
    wcaId,
    name: profile.me.name,
    email: `${wcaId.toLowerCase()}${WCA_EMAIL_DOMAIN}`,
    image:
      (profile.me.avatar.url
        ? profile.me.avatar.thumb_url
        : profile.me.avatar.pending_url) ?? undefined,
    emailVerified: true,
  };
}

export function tokensFromWcaResponse(
  data: WCATokenResponse,
  now: number = Date.now(),
) {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    accessTokenExpiresAt: new Date(now + data.expires_in * 1000),
    scopes: data.scope ? data.scope.split(" ") : [],
    raw: data,
  };
}
