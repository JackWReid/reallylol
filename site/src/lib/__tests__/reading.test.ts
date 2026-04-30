import { describe, test, expect } from "bun:test";
import { hasCover, formatSince, sortByRecent } from "../reading";

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

describe("formatSince", () => {
  test("formats an ISO date string as SINCE [MONTH] [YEAR]", () => {
    expect(formatSince("2026-04-30")).toBe("SINCE APRIL 2026");
  });

  test("uses British English month names (long form)", () => {
    expect(formatSince("2026-01-15")).toBe("SINCE JANUARY 2026");
    expect(formatSince("2025-09-01")).toBe("SINCE SEPTEMBER 2025");
  });

  test("returns an empty string for an invalid date", () => {
    expect(formatSince("not-a-date")).toBe("");
    expect(formatSince("")).toBe("");
  });

  test("uses UTC for first-of-month dates regardless of local timezone", () => {
    expect(formatSince("2026-02-01")).toBe("SINCE FEBRUARY 2026");
  });
});

describe("sortByRecent", () => {
  test("sorts books by date_updated descending", () => {
    const books = [
      { title: "Old", author: "a", date_updated: "2025-01-01" },
      { title: "New", author: "a", date_updated: "2026-04-15" },
      { title: "Mid", author: "a", date_updated: "2025-09-10" },
    ];
    const sorted = sortByRecent(books);
    expect(sorted.map((b) => b.title)).toEqual(["New", "Mid", "Old"]);
  });

  test("returns a new array without mutating input", () => {
    const books = [
      { title: "A", author: "a", date_updated: "2025-01-01" },
      { title: "B", author: "a", date_updated: "2026-01-01" },
    ];
    const original = [...books];
    sortByRecent(books);
    expect(books).toEqual(original);
  });

  test("returns an empty array unchanged", () => {
    expect(sortByRecent([])).toEqual([]);
  });
});
