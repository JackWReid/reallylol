/** Project path constants. */

import { resolve, dirname } from "path";

export const SCRIPTS_DIR = dirname(dirname(import.meta.dir));
export const ROOT = resolve(dirname(import.meta.path), "../..");
export const CONTENT_DIR = resolve(ROOT, "content");
export const DATA_DIR = resolve(ROOT, "data");
export const ASSETS_DIR = resolve(ROOT, "assets");
export const CREDS_DIR = resolve(ROOT, "creds");
export const POST_DIR = resolve(CONTENT_DIR, "post");
export const NOTE_DIR = resolve(CONTENT_DIR, "note");
export const PHOTO_DIR = resolve(CONTENT_DIR, "photo");
export const BOOKS_DIR = resolve(DATA_DIR, "books");
export const FILMS_DIR = resolve(DATA_DIR, "films");
