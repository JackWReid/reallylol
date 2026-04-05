import { mkdirSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { CmsApi } from "../lib/api";

const api = new CmsApi();

export async function exportCommand(args: string[]): Promise<void> {
  const flags = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        flags.set(key, next);
        i++;
      } else {
        flags.set(key, "true");
      }
    }
  }

  const format = flags.get("format") ?? "markdown";
  const output = flags.get("output") ?? "./export";

  if (format === "json") {
    const data = await api.get("/api/export?format=json");
    const outPath = resolve(output, "export.json");
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, JSON.stringify(data, null, 2));
    console.error(`Exported to ${outPath}`);
    console.log(JSON.stringify({ ok: true, path: outPath }));
    return;
  }

  // Markdown export
  const data = (await api.get("/api/export?format=markdown")) as {
    files: Array<{ filename: string; content: string }>;
  };

  mkdirSync(output, { recursive: true });
  let count = 0;
  for (const file of data.files) {
    const outPath = resolve(output, file.filename);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, file.content);
    count++;
  }

  // Also export data as JSON
  const jsonData = (await api.get("/api/export?format=json")) as Record<string, unknown>;
  for (const key of ["books", "films", "links"]) {
    const items = jsonData[key];
    if (items && Array.isArray(items) && items.length > 0) {
      const outPath = resolve(output, `data/${key}.json`);
      mkdirSync(dirname(outPath), { recursive: true });
      writeFileSync(outPath, JSON.stringify(items, null, 2));
    }
  }

  console.error(`Exported ${count} content files to ${output}/`);
  console.log(JSON.stringify({ ok: true, files: count, path: output }));
}
