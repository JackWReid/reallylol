# CLI Flags Quick Reference

## All Sync Commands

```bash
--verbose / -v     Enable verbose logging
--dry-run          Simulate without writing files
--output <path>    Override output path
```

## Global Examples

```bash
# Verbose output
bun run cli sync all --verbose

# Test without writing
bun run cli sync books --dry-run

# Custom output path
bun run cli sync films --output /tmp/films.json

# Combine flags
bun run cli sync all --verbose --dry-run
```

## Command-Specific Flags

### sync books
```bash
bun run cli sync books --verbose
bun run cli sync books --dry-run --output /tmp/books
```

### sync films
```bash
bun run cli sync films --username=otheruser
bun run cli sync films --username otheruser --verbose
bun run cli sync films --dry-run
```

### sync links
```bash
bun run cli sync links --tag=myblog
bun run cli sync links --tag myblog --verbose
bun run cli sync links --dry-run --output /tmp/links.json
```

### sync photos
```bash
bun run cli sync photos --verbose
bun run cli sync photos --dry-run
```

### sync all
```bash
bun run cli sync all --verbose
bun run cli sync all --dry-run
```

## Default Values

| Command    | Flag                    | Default              |
|------------|------------------------|----------------------|
| films      | `--username`            | `jackreid`           |
| links      | `--tag`                 | `toblog`             |
| books      | output directory        | `data/books/`        |
| films      | output directory        | `data/films/`        |
| links      | output file             | `data/links.json`    |
| photos     | output file             | `data/random_photos.json` |

## Flag Formats

```bash
# Space-separated
--flag value

# Equals-separated
--flag=value

# Boolean flags
--verbose
--dry-run
```

## Environment Variables

```bash
# Books
HARDCOVER_API_KEY          Required for sync books

# Links
RAINDROP_ACCESS_TOKEN      API token (or creds/raindrop-token file)
RAINDROP_TAG               Default tag for sync links

# Films
# No env vars, uses Letterboxd public API
```

## Common Workflows

### Test before running
```bash
bun run cli sync all --dry-run --verbose
```

### Debug a specific command
```bash
bun run cli sync links --verbose --tag=myblog
```

### Run with specific output
```bash
bun run cli sync books --output /tmp/test --dry-run
```

### Different Letterboxd user
```bash
bun run cli sync films --username=someoneelse
```

### Custom Raindrop tag
```bash
bun run cli sync links --tag=custom-tag
```

## For Full Documentation

See `docs/cli-flags.md` for detailed information.