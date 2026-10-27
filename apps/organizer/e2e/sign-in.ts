import { expect, type Page } from "@playwright/test";

/** Signs in through Better Auth and the fake WCA OAuth server. */
export async function signIn(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
  // A click that lands before hydration does nothing, so retry until the redirect happens.
  await expect(async () => {
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await page.waitForURL((url) => url.pathname === "/", { timeout: 5_000 });
  }).toPass({ timeout: 30_000 });
}
