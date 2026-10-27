import { readFile } from "node:fs/promises";
import { expect, test, type Download, type Page } from "@playwright/test";
import { fakeCompetition } from "./fake-wca";
import { signIn } from "./sign-in";
import { expectNoSeriousA11yViolations } from "./a11y";

const competition = fakeCompetition();

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
  await expectPdfDownload(
    await downloadPromise,
    `Certificados Participacion - ${competition.name}.pdf`,
  );
  expect(errors).toEqual([]);
});

async function expectPdfDownload(
  download: Download,
  filename: string | RegExp,
) {
  const name = download.suggestedFilename();
  if (typeof filename === "string") expect(name).toBe(filename);
  else expect(name).toMatch(filename);
  const pdf = await readFile(await download.path());
  expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
  expect(pdf.length).toBeGreaterThan(1000);
}

test("downloads podium certificates as a PDF", async ({ page }) => {
  const errors = trackPageErrors(page);

  await page.goto(`/certificates/${competition.id}`);
  await page.getByRole("tab", { name: /Certificados de Podio/ }).click();
  await page.getByRole("button", { name: "Seleccionar todos" }).click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /^Descargar \([1-9]\d*\)$/ }).click();

  await expectPdfDownload(
    await downloadPromise,
    `Certificados Podio - ${competition.name}.pdf`,
  );
  expect(errors).toEqual([]);
});

test("exports the selected badges as a 2x2 PDF", async ({ page }) => {
  const errors = trackPageErrors(page);

  await page.goto(`/badges/${competition.id}`);
  await page.getByRole("button", { name: "Seleccionar todos" }).click();
  await expect(page.getByText("Ningún competidor seleccionado")).toHaveCount(0);

  await page
    .getByRole("button", { name: "Más opciones de exportación" })
    .click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Exportar PDF (2x2)" }).click();

  await expectPdfDownload(await downloadPromise, /_badges_2x2\.pdf$/);
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
    await expectNoSeriousA11yViolations(page);
  });
}

test("unknown competitions get the not-found page", async ({ page }) => {
  await page.goto("/certificates/Unknown2099");

  await expect(page.getByText(/404|no encontr/i).first()).toBeVisible();
});
