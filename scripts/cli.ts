#!/usr/bin/env bun
/**
 * Unified CLI for really.lol project scripts.
 *
 * Usage:
 *   bun scripts/cli.ts new post
 *   bun scripts/cli.ts new note
 *   bun scripts/cli.ts new photo <image>
 *   bun scripts/cli.ts new media [--benchmark]
 *   bun scripts/cli.ts sync books|films|links|photos|all
 *   bun scripts/cli.ts validate
 *   bun scripts/cli.ts bundle to-bundle|to-post
 */

import { newPost, newNote, newPhoto, newMedia } from "./commands/new";
import { syncBooks, syncFilms, syncLinks, syncPhotos, syncAll } from "./commands/sync";
import { validate } from "./commands/validate";
import { toBundle, toPost } from "./commands/bundle";

type Command = (args: string[]) => Promise<void>;

const commands: Record<string, Command | Record<string, Command>> = {
  new: {
    post: newPost,
    note: newNote,
    photo: newPhoto,
    media: newMedia,
  },
  sync: {
    books: syncBooks,
    films: syncFilms,
    links: syncLinks,
    photos: syncPhotos,
    all: syncAll,
  },
  validate: validate,
  bundle: {
    "to-bundle": toBundle,
    "to-post": toPost,
  },
};

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
    process.exit(1);
  }

  const group = commands[args[0]];
  if (!group) {
    console.error(`Unknown command: ${args[0]}`);
    printUsage();
    process.exit(1);
  }

  // Direct command (e.g. "validate")
  if (typeof group === "function") {
    await group(args.slice(1));
    return;
  }

  // Subcommand (e.g. "new post", "sync books")
  const sub = args[1];
  if (!sub || !(sub in group)) {
    console.error(`Unknown subcommand: ${args[0]} ${sub ?? ""}`);
    console.error(`Available: ${Object.keys(group).join(", ")}`);
    process.exit(1);
  }

  await group[sub](args.slice(2));
}

function printUsage(): void {
  console.error("Usage: bun scripts/cli.ts <command> [subcommand] [options]");
  console.error("");
  console.error("Commands:");
  console.error("  new post              Create a new blog post");
  console.error("  new note              Create a new note");
  console.error("  new photo <image>     Create a new photo post");
  console.error("  new media [--benchmark]  Create a new medialog post");
  console.error("  sync books|films|links|photos|all");
  console.error("  validate              Validate frontmatter (reads paths from stdin)");
  console.error("  bundle to-bundle      Convert flat post to page bundle");
  console.error("  bundle to-post        Convert empty bundle to flat post");
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err.message || err);
    process.exit(1);
  },
);
