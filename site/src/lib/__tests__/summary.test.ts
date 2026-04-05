import { describe, test, expect } from "bun:test";
import { generateSummary } from "../summary";

describe("generateSummary", () => {
  test("returns content before <!--more-->", () => {
    const body = "First paragraph.\n\n<!--more-->\n\nSecond paragraph.";
    expect(generateSummary(body)).toBe("First paragraph.");
  });

  test("truncates to 70 words without more marker", () => {
    const body = Array(100).fill("word").join(" ");
    const result = generateSummary(body);
    expect(result.endsWith("…")).toBe(true);
    expect(result.split(" ").length).toBe(70); // 70 words, last ends with "…"
  });

  test("strips Hugo shortcodes", () => {
    const body = 'Text before. {{< image src="foo.jpg" >}} Text after.';
    expect(generateSummary(body)).toBe("Text before.  Text after.");
  });

  test("strips markdown images", () => {
    const body = "Text before. ![alt](img.jpg) Text after.";
    expect(generateSummary(body)).toBe("Text before.  Text after.");
  });

  test("strips headings", () => {
    const body = "## A Heading\n\nSome paragraph text.";
    expect(generateSummary(body)).toBe("Some paragraph text.");
  });

  test("preserves link text", () => {
    const body = "Read [this article](https://example.com) for more.";
    expect(generateSummary(body)).toBe("Read this article for more.");
  });
});
