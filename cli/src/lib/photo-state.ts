import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export const STATE_PATH = join(process.cwd(), "photo-tags-state.json");

export type PhotoStatus = "pending" | "described" | "suggested" | "reviewed" | "applied";

export interface PhotoRecord {
  image: string;
  status: PhotoStatus;
  description: string | null;
  suggested_tags: string[] | null;
  approved_tags: string[] | null;
}

export type PhotoState = Record<string, PhotoRecord>;

export function loadState(path = STATE_PATH): PhotoState {
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function saveState(state: PhotoState, path = STATE_PATH): void {
  writeFileSync(path, JSON.stringify(state, null, 2), "utf-8");
}
