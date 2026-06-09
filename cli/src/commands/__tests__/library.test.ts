import { describe, test, expect } from "bun:test";
import { shelvesToSync } from "../library";

describe("shelvesToSync", () => {
  test("syncs all three shelves when none specified", () => {
    expect(shelvesToSync(undefined)).toEqual(["read", "reading", "toread"]);
  });

  test("syncs only the requested shelf when one is specified", () => {
    expect(shelvesToSync("reading")).toEqual(["reading"]);
    expect(shelvesToSync("read")).toEqual(["read"]);
    expect(shelvesToSync("toread")).toEqual(["toread"]);
  });
});
