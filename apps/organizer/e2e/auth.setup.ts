import { test as setup } from "@playwright/test";
import { SIGNED_IN_STATE } from "./constants";
import { signIn } from "./sign-in";

setup("sign in", async ({ page }) => {
  await signIn(page);
  await page.context().storageState({ path: SIGNED_IN_STATE });
});
