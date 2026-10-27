import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { fakeCompetition } from "./fake-wca";
import { signIn } from "./sign-in";

const competition = fakeCompetition();

/** Fails the test on uncaught client-side errors (hydration, render crashes). */
function trackPageErrors(page: Page): Error[] {
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));
  return errors;
}

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("signs in through the WCA and lists managed competitions", async ({
    page,
  }) => {
    const errors = trackPageErrors(page);

    await signIn(page);

    await expect(page.getByText(competition.name).first()).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("sends competition pages to the sign-in page", async ({ page }) => {
    await page.goto(`/certificates/${competition.id}`);

    await expect(page).toHaveURL(/\/sign-in$/);
  });
});

test("downloads participation certificates as a PDF", async ({ page }) => {
  const errors = trackPageErrors(page);

  await page.goto(`/certificates/${competition.id}`);
  await expect(
    page.getByText(`Certificados: ${competition.name}`),
  ).toBeVisible();

  await page
    .getByRole("tab", { name: /Certificados de Participación \(4\)/ })
    .click();
  await page.getByRole("button", { name: "Seleccionar todos" }).click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar (4)" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe(
    `Certificados Participacion - ${competition.name}.pdf`,
  );
  const pdf = await readFile(await download.path());
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  expect(pdf.length).toBeGreaterThan(1000);
  expect(errors).toEqual([]);
});

const MODULE_PAGES: { path: string; heading: string }[] = [
  { path: "badges", heading: `Gafetes: ${competition.name}` },
  { path: "groups", heading: competition.name },
  { path: "desk", heading: competition.name },
];

for (const { path, heading } of MODULE_PAGES) {
  test(`renders the ${path} page`, async ({ page }) => {
    const errors = trackPageErrors(page);

    const response = await page.goto(`/${path}/${competition.id}`);

    expect(response?.status()).toBeLessThan(400);
    await expect(
      page.getByRole("heading", { level: 1, name: heading }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("unknown competitions get the not-found page", async ({ page }) => {
  await page.goto("/certificates/Unknown2099");

  await expect(page.getByText(/404|no encontr/i).first()).toBeVisible();
});
