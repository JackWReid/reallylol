#!/usr/bin/env bun
/**
 * One-off: sync films from Letterboxd export zip to production CMS.
 * Usage: bun scripts/sync-letterboxd-zip.ts <path-to-zip>
 *
 * Reads CMS_API_URL and CMS_API_KEY from environment (or site/.env).
 * Defaults to production: https://cms.really.lol
 */

import { readFileSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import os from "os";

const zipPath = process.argv[2];
if (!zipPath) {
  console.error("Usage: bun scripts/sync-letterboxd-zip.ts <path-to-zip>");
  process.exit(1);
}

// Load site/.env for API creds if not already in env
const envFile = path.join(import.meta.dir, "../site/.env");
if (!process.env.CMS_API_KEY) {
  try {
    const envContent = readFileSync(envFile, "utf-8");
    for (const line of envContent.split("\n")) {
      const match = line.match(/^(CMS_API_URL|CMS_API_KEY)=(.+)$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
    }
  } catch {
    // No .env file, will use defaults
  }
}

const CMS_API_URL = (process.env.CMS_API_URL ?? "https://cms.really.lol").replace(/\/$/, "");
const CMS_API_KEY = process.env.CMS_API_KEY ?? "";

if (!CMS_API_KEY) {
  console.error("Error: CMS_API_KEY not set. Add it to site/.env or set the env var.");
  process.exit(1);
}

// Extract CSVs from zip into a temp dir
const tmpDir = `${os.tmpdir()}/letterboxd-sync-${Date.now()}`;
execSync(`mkdir -p ${tmpDir} && unzip -o "${zipPath}" diary.csv watchlist.csv -d "${tmpDir}"`);

// Parse CSV (handles quoted fields with commas)
function parseCsv(content: string): Record<string, string>[] {
  const lines = content.trim().split("\n");
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = values[i] ?? ""));
    return row;
  });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

async function syncList(list: "watched" | "towatch", items: Array<{ name: string; year: string; date_updated: string }>) {
  console.log(`Syncing ${items.length} films to list: ${list}...`);
  const resp = await fetch(`${CMS_API_URL}/api/sync/films`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CMS_API_KEY}`,
    },
    body: JSON.stringify({ list, items }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API error ${resp.status}: ${text}`);
  }
  const result = await resp.json();
  console.log(`  -> ${JSON.stringify(result)}`);
}

// Parse diary.csv -> watched list
// Columns: Date, Name, Year, Letterboxd URI, Rating, Rewatch, Tags, Watched Date
const diaryRaw = readFileSync(`${tmpDir}/diary.csv`, "utf-8");
const diaryRows = parseCsv(diaryRaw);
const watchedItems = diaryRows.map((row) => ({
  name: row["Name"] ?? "",
  year: row["Year"] ?? "",
  date_updated: row["Watched Date"] || row["Date"] || "",
}));

// Parse watchlist.csv -> towatch list
// Columns: Date, Name, Year, Letterboxd URI
const watchlistRaw = readFileSync(`${tmpDir}/watchlist.csv`, "utf-8");
const watchlistRows = parseCsv(watchlistRaw);
const towatchItems = watchlistRows.map((row) => ({
  name: row["Name"] ?? "",
  year: row["Year"] ?? "",
  date_updated: row["Date"] ?? "",
}));

console.log(`Parsed ${watchedItems.length} watched films, ${towatchItems.length} to-watch films`);
console.log(`CMS: ${CMS_API_URL}`);

await syncList("watched", watchedItems);
await syncList("towatch", towatchItems);

console.log("Done.");
