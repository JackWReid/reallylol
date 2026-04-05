import { describe, test, expect } from "bun:test";
import { getPrettyName, tagToSlug } from "../tags";

describe("getPrettyName", () => {
  test("returns the configured pretty name for a known tag", () => {
    expect(getPrettyName("read")).toBe("Read");
    expect(getPrettyName("medialog")).toBe("Media Log");
    expect(getPrettyName("watchedmovie")).toBe("Watched Movies");
  });

  test("returns the tag itself for unknown tags", () => {
    expect(getPrettyName("some-unknown-tag-xyz-999")).toBe("some-unknown-tag-xyz-999");
  });
});

describe("tagToSlug", () => {
  test("replaces spaces with hyphens", () => {
    expect(tagToSlug("mental health")).toBe("mental-health");
  });

  test("lowercases the tag", () => {
    expect(tagToSlug("South Bank")).toBe("south-bank");
  });

  test("leaves hyphenated tags unchanged", () => {
    expect(tagToSlug("oxford-circus")).toBe("oxford-circus");
  });
});
