import { describe, test, expect } from "bun:test";
import { parsePhotoFrontmatter, applyTagsToContent } from "../tags";

describe("parsePhotoFrontmatter", () => {
  test("extracts fields from a tagged photo", () => {
    const content = `---
title: "Ferry crossing"
date: "2022-02-14"
tags:
  - "travel"
  - "switzerland"
image: "img/photo/2022-02-14-ferry.jpg"
location: "Basel"
---
`;
    const result = parsePhotoFrontmatter(content);
    expect(result.title).toBe("Ferry crossing");
    expect(result.tags).toEqual(["travel", "switzerland"]);
    expect(result.image).toBe("img/photo/2022-02-14-ferry.jpg");
    expect(result.location).toBe("Basel");
  });

  test("returns empty tags array for untagged photo", () => {
    const content = `---
title: "Wasting my time."
date: "2012-04-04"
image: "img/photo/2012-04-04-abc.jpg"
instagram: true
---
`;
    const result = parsePhotoFrontmatter(content);
    expect(result.tags).toEqual([]);
  });
});

describe("applyTagsToContent", () => {
  test("adds tags to a previously untagged file", () => {
    const content = `---
title: "Wasting my time."
date: "2012-04-04"
image: "img/photo/2012-04-04-abc.jpg"
---
`;
    const updated = applyTagsToContent(content, ["london", "bw"]);
    expect(updated).toContain("tags:");
    expect(updated).toContain('  - "london"');
    expect(updated).toContain('  - "bw"');
    expect(updated).toContain('title: "Wasting my time."');
    expect(updated).toContain('image: "img/photo/2012-04-04-abc.jpg"');
  });

  test("replaces existing tags", () => {
    const content = `---
title: "Ferry"
date: "2022-02-14"
tags:
  - "old-tag"
image: "img/photo/test.jpg"
---
`;
    const updated = applyTagsToContent(content, ["travel", "water"]);
    expect(updated).toContain('  - "travel"');
    expect(updated).toContain('  - "water"');
    expect(updated).not.toContain("old-tag");
  });

  test("preserves body content below frontmatter", () => {
    const content = `---
title: "Test"
date: "2024-01-01"
image: "img/photo/test.jpg"
---

Some caption text here.
`;
    const updated = applyTagsToContent(content, ["nature"]);
    expect(updated).toContain("Some caption text here.");
  });
});
