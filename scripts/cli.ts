#!/usr/bin/env bun
/**
 * Unified CLI for really.lol project scripts.
 *
 * Usage:
 *   bun scripts/cli.ts new post
 *   bun scripts/cli.ts new note
 *   bun scripts/cli.ts new photo <image>
 *   bun scripts/cli.ts new media [--benchmark]
 *   bun scripts/cli.ts sync books|films|links|photos|all [--verbose] [--dry-run] [--output <path>]
 *   bun scripts/cli.ts r2 sync [--dry-run] [--force]
 *   bun scripts/cli.ts r2 verify [--verbose]
 *
 * Sync Command Flags (unified across all sync subcommands):
 *   --verbose / -v       Enable verbose logging output
 *   --dry-run            Simulate without writing files to disk
 *   --output <path>      Override default output path (useful for testing)
 *
 * Command-Specific Flags:
 *   sync films  --username=<user>  Letterboxd username (default: jackreid)
 *   sync links  --tag=<tag>        Raindrop tag to sync (default: toblog)
 *
 * For detailed flag documentation, see: docs/cli-flags.md
 */

import { newPost, newNote, newPhoto, newMedia } from "./commands/new";
import { syncR2, verifyR2 } from "./commands/r2";
import {
  syncBooks,
  syncFilms,
  syncLinks,
  syncPhotos,
  syncAll,
} from "./commands/sync";

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
  r2: {
    sync: syncR2,
    verify: verifyR2,
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
  // If no subcommand given (or next arg is a flag), default to "all" if available
  const hasSubcommand = args[1] && !args[1].startsWith("-");
  const sub = hasSubcommand ? args[1] : "all" in group ? "all" : undefined;
  if (!sub || !(sub in group)) {
    console.error(`Unknown subcommand: ${args[0]} ${args[1] ?? ""}`);
    console.error(`Available: ${Object.keys(group).join(", ")}`);
    process.exit(1);
  }

  await group[sub](hasSubcommand ? args.slice(2) : args.slice(1));
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
  console.error(
    );
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err.message || err);
    process.exit(1);
  },
);
