import { describe, expect, it } from "vitest";
import {
  extractFirstImageUrl,
  informationHasExtractableLogo,
} from "./competition-logo";

describe("extractFirstImageUrl", () => {
  it("returns null for empty input", () => {
    expect(extractFirstImageUrl(null)).toBeNull();
    expect(extractFirstImageUrl("")).toBeNull();
    expect(extractFirstImageUrl("No images here")).toBeNull();
  });

  it("extracts a simple markdown image", () => {
    const info =
      "![](https://example.com/logo.png)\n\nWelcome to the competition";
    expect(extractFirstImageUrl(info)).toBe("https://example.com/logo.png");
  });

  it("handles filenames with parentheses", () => {
    const info =
      "![](https://www.worldcubeassociation.org/rails/active_storage/blobs/redirect/abc/logo-08%20(1).png)\n\n###### Español";
    expect(extractFirstImageUrl(info)).toBe(
      "https://www.worldcubeassociation.org/rails/active_storage/blobs/redirect/abc/logo-08%20(1).png",
    );
  });

  it("returns the first image when multiple exist", () => {
    const info =
      "![logo](https://example.com/a.png)\n\n![banner](https://example.com/b.png)";
    expect(extractFirstImageUrl(info)).toBe("https://example.com/a.png");
  });

  it("informationHasExtractableLogo mirrors extract", () => {
    expect(informationHasExtractableLogo("![](https://x.com/a.png)")).toBe(
      true,
    );
    expect(informationHasExtractableLogo("plain text")).toBe(false);
  });
});
