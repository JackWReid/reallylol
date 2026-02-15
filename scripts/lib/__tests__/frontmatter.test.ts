import { describe, expect, test } from "bun:test";
import {
  generateFrontmatter,
  parseFrontmatter,
  parseTags,
} from "../frontmatter";

describe("generateFrontmatter", () => {
  test("generates basic fields", () => {
    const result = generateFrontmatter({
      title: "Hello World",
      date: "2024-01-01",
    });
    expect(result).toBe('---\ntitle: "Hello World"\ndate: 2024-01-01\n---');
  });

  test("generates tag lists", () => {
    const result = generateFrontmatter({
      title: "Test",
      tags: ["journal", "tech"],
    });
    expect(result).toContain("tags:\n  - journal\n  - tech");
  });

  test("omits undefined values", () => {
    const result = generateFrontmatter({
      title: "Test",
      location: undefined,
    });
    expect(result).not.toContain("location");
  });

  test("handles numeric values", () => {
    const result = generateFrontmatter({ rating: 5 });
    expect(result).toContain("rating: 5");
  });
});

describe("parseFrontmatter", () => {
  test("parses standard frontmatter", () => {
    const text = '---\ntitle: "Hello"\ndate: 2024-01-01\n---\nBody here';
    const result = parseFrontmatter(text);
    expect(result).not.toBeNull();
    expect(result!.fields.title).toBe("Hello");
    expect(result!.fields.date).toBe("2024-01-01");
    expect(result!.body).toContain("Body here");
  });

  test("returns null for no frontmatter", () => {
    expect(parseFrontmatter("Just text")).toBeNull();
  });

  test("returns null for incomplete frontmatter", () => {
    expect(parseFrontmatter("---\ntitle: Test\n")).toBeNull();
  });
});

describe("parseTags", () => {
  test("parses inline tags", () => {
    const fm = 'title: Test\ntags: [journal, tech]\ndate: 2024-01-01';
    expect(parseTags(fm)).toEqual(["journal", "tech"]);
  });

  test("parses list tags", () => {
    const fm = "title: Test\ntags:\n  - journal\n  - tech\ndate: 2024-01-01";
    expect(parseTags(fm)).toEqual(["journal", "tech"]);
  });

  test("returns empty for no tags", () => {
    expect(parseTags("title: Test\ndate: 2024-01-01")).toEqual([]);
  });
});
