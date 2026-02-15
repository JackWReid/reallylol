/** File system helpers built on Bun APIs. */

import { mkdir } from "fs/promises";
import { dirname } from "path";

/** Ensure a directory exists (like mkdir -p). */
export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

/** Write content to a file, creating parent directories as needed. */
export async function writeContent(
  path: string,
  content: string,
): Promise<void> {
  await ensureDir(dirname(path));
  await Bun.write(path, content);
}
