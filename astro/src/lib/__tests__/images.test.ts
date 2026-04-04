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

describe("r2Thumb", () => {
  test("generates 500x500 cover crop URL", () => {
    expect(r2Thumb("img/photo/foo.jpg")).toBe(
      "https://media.really.lol/cdn-cgi/image/width=500,height=500,fit=cover/img/photo/foo.jpg"
    );
  });

  test("accepts custom size", () => {
    expect(r2Thumb("img/photo/foo.jpg", 200)).toBe(
      "https://media.really.lol/cdn-cgi/image/width=200,height=200,fit=cover/img/photo/foo.jpg"
    );
  });
});

describe("r2Hero", () => {
  test("generates 1400x1400 fit-inside URL", () => {
    expect(r2Hero("img/photo/foo.jpg")).toBe(
      "https://media.really.lol/cdn-cgi/image/width=1400,height=1400,fit=inside/img/photo/foo.jpg"
    );
  });
});
