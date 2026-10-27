import { expect, test, type Page } from "@playwright/test";
import { expectNoSeriousA11yViolations } from "./a11y";

/** Fails the test on uncaught client-side errors (hydration, render crashes) and CSP violations. */
function trackPageErrors(page: Page): Error[] {
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      message.text().includes("Content Security Policy")
    ) {
      errors.push(new Error(message.text()));
    }
  });
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
  { path: "/teams/JAL", text: "Cubing Jalisco" },
  { path: "/kinch", text: "Beto Smoke" },
  { path: "/sor/single", text: "Beto Smoke" },
  { path: "/streaks", text: "Beto Smoke" },
  { path: "/faq", text: /preguntas frecuentes/i },
  { path: "/docs", text: "API pública" },
];

for (const { path, text } of PAGES) {
  test(`renders ${path}`, async ({ page }) => {
    const errors = trackPageErrors(page);

    const response = await page.goto(path);

    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByText(text).first()).toBeVisible();
    expect(errors).toEqual([]);
    await expectNoSeriousA11yViolations(page);
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

// These tabs load their data through server actions the first time they open.
test("person tabs load their data", async ({ page }) => {
  const errors = trackPageErrors(page);
  await page.goto("/persons/2099SMOK01");

  for (const name of ["Rachas", "Podios", "Némesis"]) {
    await page.getByRole("tab", { name, exact: true }).click();
    const panel = page.getByRole("tabpanel");
    await expect(panel.locator("[data-slot=skeleton]")).toHaveCount(0);
    await expect(panel).not.toBeEmpty();
  }
  expect(errors).toEqual([]);
});

test("header search finds a person and opens their profile", async ({
  page,
}) => {
  const errors = trackPageErrors(page);
  await page.goto("/");

  const input = page.getByPlaceholder("Personas, competencias, teams…");
  // A click that lands before hydration does nothing, so retry until the dialog opens.
  await expect(async () => {
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(input).toBeVisible({ timeout: 1_000 });
  }).toPass();

  await input.fill("Ana");
  await page.getByRole("option", { name: /Ana Smoke/ }).click();

  await expect(page).toHaveURL(/\/persons\/2099SMOK01$/);
  expect(errors).toEqual([]);
});

test("the deprecated-events switch adds 333ft to the records", async ({
  page,
}) => {
  const errors = trackPageErrors(page);
  await page.goto("/records");

  // Ana holds both official records; Beto's only record is in 333ft.
  await expect(page.getByText("Ana Smoke").first()).toBeVisible();
  await expect(page.getByText("3x3x3 With Feet")).toHaveCount(0);
  await expect(page.getByText("Beto Smoke")).toHaveCount(0);

  const toggle = page.getByRole("switch", {
    name: "Incluir eventos descontinuados",
  });
  await expect(async () => {
    await toggle.click();
    await expect(page).toHaveURL(/[?&]deprecated=true/, { timeout: 1_000 });
  }).toPass();

  await expect(page.getByText("3x3x3 With Feet").first()).toBeVisible();
  await expect(page.getByText("Beto Smoke").first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("ranking links keep the deprecated scope", async ({ page }) => {
  await page.goto("/rankings/333/single");
  await expect(page.getByRole("link", { name: "3x3x3 With Feet" })).toHaveCount(
    0,
  );

  await page.goto("/rankings/333/single?deprecated=true");
  await page.getByRole("link", { name: "3x3x3 With Feet" }).click();

  await expect(page).toHaveURL(/\/rankings\/333ft\/single\?deprecated=true$/);
  await expect(page.getByText("Beto Smoke").first()).toBeVisible();
});

// Ana beats Beto in every official slot; Beto's 333ft result only counts with deprecated events.
test("the nemesis finder follows the event scope", async ({ page }) => {
  const errors = trackPageErrors(page);

  await page.goto("/persons/nemesis?id=2099SMOK02");
  await expect(page.getByText(/tiene\s*1\s*némesis/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Ana Smoke" })).toBeVisible();

  await page.goto("/persons/nemesis?id=2099SMOK02&deprecated=true");
  await expect(page.getByText(/no tiene némesis/)).toBeVisible();
  const almost = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Casi némesis" }) });
  await expect(almost.getByRole("link", { name: "Ana Smoke" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("the API docs render the OpenAPI spec", async ({ page, request }) => {
  const errors = trackPageErrors(page);
  await page.goto("/docs");

  await page.getByRole("tab", { name: "Personas" }).click();
  await page.getByRole("button", { name: /\/persons\/\{wca_id\}/ }).click();
  await expect(
    page.getByText('curl "https://api.cubingmexico.net/persons/2015EXAM01"'),
  ).toBeVisible();
  expect(errors).toEqual([]);

  const spec = await request.get("/docs/openapi.json");
  expect(spec.ok()).toBe(true);
  expect(await spec.json()).toMatchObject({ openapi: "3.1.0" });
});

// The page streams, so the status is already 200 when notFound() renders the 404 UI.
test("unknown persons get the not-found page", async ({ page }) => {
  await page.goto("/persons/2099NONE01");

  await expect(
    page.getByRole("heading", { level: 1, name: "404" }),
  ).toBeVisible();
});
