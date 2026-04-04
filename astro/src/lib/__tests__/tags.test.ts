import { describe, test, expect } from "bun:test";
import { getPrettyName } from "../tags";

describe("getPrettyName", () => {
  test("returns a non-empty string for a known tag", () => {
    // Use a tag you know exists in data/content_config.json
    const result = getPrettyName("read");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  test("returns the tag itself for unknown tags", () => {
    expect(getPrettyName("some-unknown-tag-xyz-999")).toBe("some-unknown-tag-xyz-999");
  });
});
