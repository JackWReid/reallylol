# CLI Flags Documentation

## Overview

The sync commands (`sync books`, `sync films`, `sync links`, `sync photos`, `sync all`) now support a unified set of command-line flags for consistent behavior across all syncing operations.

## Global Flags

These flags are supported by all sync commands and `sync all`:

### `--verbose` / `-v`
Enable verbose logging to track command execution details.

**Example:**
```bash
bun run cli sync books --verbose
bun run cli sync films -v
bun run cli sync all --verbose
```

**Effect:** Logs additional diagnostic information including:
- Data counts and processing steps
- File paths being written
- Source information (tokens, configuration files)
- Network requests and pagination

### `--dry-run`
Simulate the sync without writing any files to disk. Useful for testing and validation.

**Example:**
```bash
bun run cli sync links --dry-run
bun run cli sync all --dry-run
```

**Effect:**
- Performs all data fetching and processing
- Skips file write operations
- Logs what would have been written with `[dry-run]` prefix
- Useful for validating API connectivity and data integrity

### `--output <path>`
Override the default output file/directory path. Primarily useful for testing.

**Example:**
```bash
bun run cli sync books --output /tmp/books-test
bun run cli sync links --output=/tmp/links.json
```

**Effect:** Writes output to the specified path instead of the default location.

## Flag Format

Flags support two formats:

### Space-separated
```bash
--flag value
```

### Equals-separated
```bash
--flag=value
```

**Example:**
```bash
# These are equivalent:
bun run cli sync films --username jackreid
bun run cli sync films --username=jackreid

# Mix formats:
bun run cli sync films --username=jackreid --verbose
```

## Command-Specific Flags

### `sync books`

**Supported flags:**
- `--verbose` / `-v` — verbose logging
- `--dry-run` — simulate without writing
- `--output` — override output directory

**Environment variables:**
- `HARDCOVER_API_KEY` (required) — API key for Hardcover

**Example:**
```bash
HARDCOVER_API_KEY=your_key bun run cli sync books --verbose
bun run cli sync books --dry-run --output /tmp/books-test
```

### `sync films`

**Supported flags:**
- `--username=<user>` — Letterboxd username (default: `jackreid`)
- `--verbose` / `-v` — verbose logging
- `--dry-run` — simulate without writing
- `--output` — override output directory

**Example:**
```bash
bun run cli sync films --username=someuser --verbose
bun run cli sync films --username someuser --dry-run
```

### `sync links`

**Supported flags:**
- `--tag=<tag>` — Raindrop tag to sync (default: `toblog` or `RAINDROP_TAG` env var)
- `--verbose` / `-v` — verbose logging
- `--dry-run` — simulate without writing
- `--output` — override output file path

**Environment variables:**
- `RAINDROP_ACCESS_TOKEN` or `creds/raindrop-token` file — API token (required)
- `RAINDROP_TAG` — default tag if `--tag` not provided

**Example:**
```bash
bun run cli sync links --tag=myblog --verbose
RAINDROP_ACCESS_TOKEN=token bun run cli sync links --verbose
bun run cli sync links --dry-run --output=/tmp/links.json
```

### `sync photos`

**Supported flags:**
- `--verbose` / `-v` — verbose logging
- `--dry-run` — simulate without writing
- `--output` — override output file path

**Configuration:**
- Reads `data/content_config.json` to determine excluded tags

**Example:**
```bash
bun run cli sync photos --verbose
bun run cli sync photos --dry-run
```

### `sync all`

Runs all sync commands in sequence. Passes `--verbose` and `--dry-run` flags to all subcommands.

**Supported flags:**
- `--verbose` / `-v` — verbose logging (passed to all subcommands)
- `--dry-run` — simulate without writing (passed to all subcommands)

**Example:**
```bash
bun run cli sync all --verbose
bun run cli sync all --dry-run
```

## Common Usage Patterns

### Test a single sync command
```bash
# Dry-run to see what would happen
bun run cli sync links --dry-run --verbose
```

### Debug a failing sync
```bash
# Enable verbose logging to see what's happening
bun run cli sync films --verbose
```

### Override output for testing
```bash
# Write to a test location instead of the default
bun run cli sync books --output /tmp/test-books --dry-run
```

### Run all syncs with logging
```bash
# Run all sync commands with verbose output
bun run cli sync all --verbose
```

### Full debugging workflow
```bash
# 1. Test with dry-run
bun run cli sync all --dry-run --verbose

# 2. If successful, run for real
bun run cli sync all
```

## Implementation Details

The unified flag system is implemented in `scripts/lib/flags.ts` and provides:

- `parseFlags(args: string[])` — Parse command-line args into a structured flags object
- `getFlagValue(flags, name, envVar?, default?)` — Extract a string flag with optional env var and default fallback
- `getFlagBoolean(flags, name, default?)` — Extract a boolean flag value

All sync commands in `scripts/commands/sync.ts` use this unified system for consistency.