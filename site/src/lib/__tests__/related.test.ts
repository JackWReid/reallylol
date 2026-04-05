import { describe, test, expect } from "bun:test";
import { getRelated } from "../related";

const fakePosts = [
  { id: "a", data: { title: "A", tags: ["foo", "bar"] } },
  { id: "b", data: { title: "B", tags: ["foo", "baz"] } },
  { id: "c", data: { title: "C", tags: ["qux"] } },
  { id: "d", data: { title: "D", tags: ["foo", "bar", "baz"] } },
];

describe("getRelated", () => {
  test("excludes the current post", () => {
    const results = getRelated("a", ["foo", "bar"], fakePosts);
    expect(results.map((r) => r.id)).not.toContain("a");
  });

  test("excludes posts with no matching tags", () => {
    const results = getRelated("a", ["foo", "bar"], fakePosts);
    expect(results.map((r) => r.id)).not.toContain("c");
  });

  test("orders by tag overlap score descending", () => {
    const results = getRelated("a", ["foo", "bar"], fakePosts);
    // d has 2 matches (foo, bar), b has 1 match (foo)
    expect(results[0].id).toBe("d");
    expect(results[1].id).toBe("b");
  });

  test("respects the limit", () => {
    const results = getRelated("a", ["foo", "bar"], fakePosts, 1);
    expect(results).toHaveLength(1);
  });
});
