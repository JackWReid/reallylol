#!/usr/bin/env bun

import { contentCommand } from "./commands/content";
import { syncCommand } from "./commands/sync";
import { mediaCommand } from "./commands/media";
import { migrateCommand } from "./commands/migrate";
import { migrateDirsCommand } from "./commands/migrate-dirs";
import { exportCommand } from "./commands/export";
import { ApiError } from "./lib/api";

const HELP = `really.lol CMS CLI

Usage: cms <command> [subcommand] [options]

Commands:
  content   list|get|create|edit|delete    Manage content items
  sync      books|films|links              Sync external data sources
  media     upload|list|verify             Manage R2 media files
  migrate   import                         Import existing markdown/JSON into CMS
  export    [--format markdown|json]       Export all content

Environment:
  CMS_API_URL   CMS API base URL (default: http://localhost:8788)
  CMS_API_KEY   API authentication key (default: dev-test-key)

Examples:
  cms content list --type post --status published
  cms content create post --title "New Post" --body "Hello" --tags journal
  cms content edit post my-slug --status published
  cover books --shelf read --json | cms sync books --shelf read
  curtain diary --json | cms sync films --list watched
  cms media upload photo.jpg --prefix img/photo
  cms migrate import
  cms export --format markdown --output ./backup
`;

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(HELP);
    process.exit(0);
  }

  const command = args[0];
  const rest = args.slice(1);

  try {
    switch (command) {
      case "content":
        await contentCommand(rest);
        break;
      case "sync":
        await syncCommand(rest);
        break;
      case "media":
        await mediaCommand(rest);
        break;
      case "migrate":
        await migrateCommand(rest);
        break;
      case "migrate-dirs":
        await migrateDirsCommand(rest);
        break;
      case "export":
        await exportCommand(rest);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.error("Run 'cms --help' for usage");
        process.exit(1);
    }
  } catch (e) {
    if (e instanceof ApiError) {
      console.error(JSON.stringify(e.toJSON()));
      process.exit(1);
    }
    throw e;
  }
}

main();
