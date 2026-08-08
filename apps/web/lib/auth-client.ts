import { createAuthClient } from "better-auth/react";
import {
  customSessionClient,
  genericOAuthClient,
} from "better-auth/client/plugins";
import type { auth } from "@/lib/auth";

export const authClient = createAuthClient({
  plugins: [genericOAuthClient(), customSessionClient<typeof auth>()],
});
