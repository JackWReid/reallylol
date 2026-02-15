import { describe, expect, test } from "bun:test";
import { slugify } from "../slugify";

describe("slugify", () => {
  test("lowercases text", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  test("strips non-alphanumeric characters", () => {
    expect(slugify("What's Up?")).toBe("whats-up");
  });

  test("replaces spaces with dashes", () => {
    expect(slugify("one two three")).toBe("one-two-three");
  });

  test("collapses multiple dashes", () => {
    expect(slugify("one  --  two")).toBe("one-two");
  });

  test("trims leading/trailing dashes", () => {
    expect(slugify("--hello--")).toBe("hello");
  });

  test("truncates to maxLen", () => {
    const long = "a".repeat(100);
    expect(slugify(long)).toHaveLength(50);
    expect(slugify(long, 10)).toHaveLength(10);
  });

  test("returns empty string for empty input", () => {
    expect(slugify("")).toBe("");
  });

  test("handles unicode by stripping it", () => {
    expect(slugify("café résumé")).toBe("caf-rsum");
  });

  test("matches existing bash slugify for known titles", () => {
    // These match the bash: tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9 ]//g' | ...
    expect(slugify("The Great Gatsby")).toBe("the-great-gatsby");
    expect(slugify("Blade Runner 2049")).toBe("blade-runner-2049");
    expect(slugify("Don't Look Up")).toBe("dont-look-up");
  });
});
