import { describe, expect, test } from "bun:test";
import { todayDate, nowDatetime } from "../dates";

describe("todayDate", () => {
  test("returns YYYY-MM-DD format", () => {
    expect(todayDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("nowDatetime", () => {
  test("returns YYYY-MM-DDTHH:MM:SS format", () => {
    expect(nowDatetime()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  });
});
