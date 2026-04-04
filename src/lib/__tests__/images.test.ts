import { describe, test, expect } from "bun:test";
import { r2Url, r2Thumb, r2Hero } from "../images";

describe("r2Url", () => {
  test("prepends R2 base to a bare path", () => {
    expect(r2Url("img/photo/foo.jpg")).toBe("https://media.really.lol/img/photo/foo.jpg");
  });

  test("strips leading slash", () => {
    expect(r2Url("/img/photo/foo.jpg")).toBe("https://media.really.lol/img/photo/foo.jpg");
  });
});

// Image Resizing is disabled by default (requires Cloudflare Pro / add-on).
// These tests verify the fallback (raw URL) behaviour.
describe("r2Thumb (resizing disabled)", () => {
  test("falls back to raw URL when resizing not enabled", () => {
    expect(r2Thumb("img/photo/foo.jpg")).toBe("https://media.really.lol/img/photo/foo.jpg");
  });

  test("strips leading slash", () => {
    expect(r2Thumb("/img/photo/foo.jpg")).toBe("https://media.really.lol/img/photo/foo.jpg");
  });
});

describe("r2Hero (resizing disabled)", () => {
  test("falls back to raw URL when resizing not enabled", () => {
    expect(r2Hero("img/photo/foo.jpg")).toBe("https://media.really.lol/img/photo/foo.jpg");
  });
});
