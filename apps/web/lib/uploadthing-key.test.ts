import { describe, expect, it } from "vitest";
import { uploadThingFileKey } from "./uploadthing-key";

describe("uploadThingFileKey", () => {
  it("reads the key from ufs.sh and legacy utfs.io URLs", () => {
    expect(
      uploadThingFileKey("https://gf7z9ppeqt.ufs.sh/f/abc123_logo.png"),
    ).toBe("abc123_logo.png");
    expect(uploadThingFileKey("https://utfs.io/f/abc123")).toBe("abc123");
    expect(uploadThingFileKey("https://utfs.io/a/gf7z9ppeqt/abc123")).toBe(
      "abc123",
    );
  });

  it("ignores URLs that UploadThing doesn't host", () => {
    for (const url of [
      null,
      undefined,
      "",
      "not a url",
      "data:image/png;base64,AAAA",
      "https://assets.worldcubeassociation.org/f/abc123",
      "https://evil.example/ufs.sh/f/abc123",
      "https://ufs.sh.evil.example/f/abc123",
      "http://gf7z9ppeqt.ufs.sh/f/abc123",
      "https://gf7z9ppeqt.ufs.sh/f/",
      "https://gf7z9ppeqt.ufs.sh/f/abc/extra",
    ]) {
      expect(uploadThingFileKey(url)).toBeNull();
    }
  });
});
