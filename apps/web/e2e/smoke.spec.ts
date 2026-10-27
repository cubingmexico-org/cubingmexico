import { expect, test, type Page } from "@playwright/test";

/** Fails the test on uncaught client-side errors (hydration, render crashes). */
function trackPageErrors(page: Page): Error[] {
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));
  return errors;
}

const PAGES: { path: string; text: string | RegExp }[] = [
  { path: "/", text: /Cubing México/i },
  { path: "/rankings/333/single", text: "Ana Smoke" },
  { path: "/rankings/333/average", text: "Beto Smoke" },
  { path: "/records", text: /récords/i },
  { path: "/competitions", text: /competencias/i },
  { path: "/persons/2099SMOK01", text: "Ana Smoke" },
  { path: "/teams", text: /teams/i },
];

for (const { path, text } of PAGES) {
  test(`renders ${path}`, async ({ page }) => {
    const errors = trackPageErrors(page);

    const response = await page.goto(path);

    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByText(text).first()).toBeVisible();
    expect(errors).toEqual([]);
  });
}

// The menu is server-rendered; a link arriving as a lazy RSC chunk under an asChild slot renders nothing.
test("header menus list every link", async ({ page }) => {
  await page.goto("/");
  const menus: Record<string, number> = {
    Resultados: 12,
    Personas: 7,
    "Acerca de": 5,
  };
  for (const [name, linkCount] of Object.entries(menus)) {
    // Radix opens these menus on hover; clicking an open trigger closes it.
    await page.getByRole("button", { name }).hover();
    await expect(
      page.locator("[data-slot=navigation-menu-content] a"),
    ).toHaveCount(linkCount);
  }
});

// The page streams, so the status is already 200 when notFound() renders the 404 UI.
test("unknown persons get the not-found page", async ({ page }) => {
  await page.goto("/persons/2099NONE01");

  await expect(
    page.getByRole("heading", { level: 1, name: "404" }),
  ).toBeVisible();
});
