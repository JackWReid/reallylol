import { describe, test, expect } from "bun:test";
import { hasCover } from "../reading";

describe("hasCover", () => {
  test("returns true for a non-empty image_url", () => {
    expect(hasCover({ title: "x", author: "y", date_updated: "2026-01-01", image_url: "https://example.com/c.jpg", hardcover_url: "https://hardcover.app/x" })).toBe(true);
  });

  test("returns false when image_url is an empty string", () => {
    expect(hasCover({ title: "x", author: "y", date_updated: "2026-01-01", image_url: "", hardcover_url: "https://hardcover.app/x" })).toBe(false);
  });

  test("returns false when image_url is missing", () => {
    expect(hasCover({ title: "x", author: "y", date_updated: "2026-01-01", hardcover_url: "https://hardcover.app/x" })).toBe(false);
  });
});
