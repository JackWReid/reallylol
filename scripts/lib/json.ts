/** Compact JSON writer — one object per line for readable git diffs. */

import { writeContent } from "./files";

/**
 * Write a JSON array with one object per line.
 * Format: `[\n{...},\n{...}\n]\n`
 */
export async function writeCompactJson(
  data: unknown[],
  path: string,
): Promise<void> {
  if (data.length === 0) {
    await writeContent(path, "[]\n");
    return;
  }
  const lines = data.map(
    (item, i) => JSON.stringify(item) + (i < data.length - 1 ? "," : ""),
  );
  await writeContent(path, "[\n" + lines.join("\n") + "\n]\n");
}
