import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** Fails on serious or critical WCAG 2 A/AA violations; minor and moderate ones don't fail the suite yet. */
export async function expectNoSeriousA11yViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const blocking = violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map(
      (v) =>
        `${v.id} (${v.impact}): ${v.help} at ${v.nodes
          .slice(0, 3)
          .map((node) => node.html.slice(0, 200))
          .join(" | ")}`,
    );
  expect(blocking).toEqual([]);
}
