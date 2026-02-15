import { describe, expect, test } from "bun:test";
import { writeCompactJson } from "../json";
import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import { resolve } from "path";

describe("writeCompactJson", () => {
  test("writes empty array", async () => {
    const dir = await mkdtemp(resolve(tmpdir(), "json-test-"));
    const path = resolve(dir, "test.json");
    await writeCompactJson([], path);
    const content = await readFile(path, "utf-8");
    expect(content).toBe("[]\n");
    await rm(dir, { recursive: true });
  });

  test("writes one object per line", async () => {
    const dir = await mkdtemp(resolve(tmpdir(), "json-test-"));
    const path = resolve(dir, "test.json");
    await writeCompactJson([{ a: 1 }, { b: 2 }], path);
    const content = await readFile(path, "utf-8");
    expect(content).toBe('[\n{"a":1},\n{"b":2}\n]\n');
    await rm(dir, { recursive: true });
  });
});
