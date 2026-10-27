// A stand-in Better Auth session for tests, wired in with vi.mock (see test/setup.ts).

let signedInWcaId: string | null = null;

export function signIn(wcaId: string | null): void {
  signedInWcaId = wcaId;
}

export function resetSession(): void {
  signedInWcaId = null;
}

export const fakeAuth = {
  api: {
    getSession: async () =>
      signedInWcaId
        ? { user: { id: signedInWcaId, wcaId: signedInWcaId } }
        : null,
  },
};

/** The error Next's `unauthorized()` throws when `experimental.authInterrupts` is on. */
export function unauthorizedError(): Error {
  const error = new Error("NEXT_HTTP_ERROR_FALLBACK;401");
  (error as Error & { digest: string }).digest = "NEXT_HTTP_ERROR_FALLBACK;401";
  return error;
}
