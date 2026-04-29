import { describe, test, expect, afterEach } from "bun:test";
import { existsSync, unlinkSync } from "fs";
import { loadState, saveState, type PhotoRecord } from "../photo-state";

const TEST_PATH = "/tmp/test-photo-tags-state.json";

describe("photo-state", () => {
  test("loadState returns empty object when file does not exist", () => {
    const state = loadState("/tmp/nonexistent-xyz-123.json");
    expect(state).toEqual({});
  });

  test("saveState and loadState round-trip", () => {
    const record: PhotoRecord = {
      image: "img/photo/test.jpg",
      status: "pending",
      description: null,
      suggested_tags: null,
      approved_tags: null,
    };
    saveState({ "2022-01-01-test": record }, TEST_PATH);
    const loaded = loadState(TEST_PATH);
    expect(loaded["2022-01-01-test"]).toEqual(record);
  });

  test("saveState overwrites previous state atomically", () => {
    saveState({ "a": { image: "a.jpg", status: "pending", description: null, suggested_tags: null, approved_tags: null } }, TEST_PATH);
    saveState({ "b": { image: "b.jpg", status: "described", description: "desc", suggested_tags: null, approved_tags: null } }, TEST_PATH);
    const loaded = loadState(TEST_PATH);
    expect(Object.keys(loaded)).toEqual(["b"]);
  });

  afterEach(() => { if (existsSync(TEST_PATH)) unlinkSync(TEST_PATH); });
});
