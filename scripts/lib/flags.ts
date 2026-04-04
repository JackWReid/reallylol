/**
 * Unified CLI flag parser for sync commands.
 * Supports `--flag value` and `--flag=value` formats.
 */

export interface ParsedFlags {
  verbose: boolean;
  dryRun: boolean;
  output?: string;
  [key: string]: string | boolean | undefined;
}

/**
 * Parse command-line arguments into a structured flags object.
 *
 * Supports:
 * - `--verbose` or `-v` — enable verbose logging
 * - `--dry-run` — simulate without writing
 * - `--output <path>` — override output file path (useful for testing)
 * - `--flag value` — flag with space-separated value
 * - `--flag=value` — flag with equals-separated value
 *
 * @param args Raw command-line arguments
 * @returns Parsed flags object with boolean flags (verbose, dryRun) and other flags
 */
export function parseFlags(args: string[]): ParsedFlags {
  const flags: ParsedFlags = {
    verbose: false,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Boolean flags
    if (arg === "--verbose" || arg === "-v") {
      flags.verbose = true;
      continue;
    }

    if (arg === "--dry-run") {
      flags.dryRun = true;
      continue;
    }

    // Flags with values using `--flag=value` format
    if (arg.includes("=")) {
      const [key, value] = arg.split("=", 2);
      const flagName = key.replace(/^--/, ""); // Remove leading `--`
      flags[flagName] = value;
      continue;
    }

    // Flags with values using `--flag value` format
    if (arg.startsWith("--")) {
      const flagName = arg.slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
        flags[flagName] = args[i + 1];
        i++; // Skip next arg since we consumed it as a value
      } else {
        // Treat as boolean flag if no value follows
        flags[flagName] = true;
      }
    }
  }

  return flags;
}

/**
 * Extract a string flag value with optional fallback to environment variable and default.
 *
 * Priority: explicit flag > environment variable > default value
 *
 * @param flags Parsed flags object
 * @param flagName Name of the flag to extract
 * @param envVar Optional environment variable name to check
 * @param defaultValue Optional default value
 * @returns The flag value or undefined if not found
 */
export function getFlagValue(
  flags: ParsedFlags,
  flagName: string,
  envVar?: string,
  defaultValue?: undefined,
): string | undefined;
export function getFlagValue(
  flags: ParsedFlags,
  flagName: string,
  envVar: string | undefined,
  defaultValue: string,
): string;
export function getFlagValue(
  flags: ParsedFlags,
  flagName: string,
  envVar?: string,
  defaultValue?: string,
): string | undefined {
  // If flag is explicitly provided as a string, use it
  if (flagName in flags && typeof flags[flagName] === "string") {
    return flags[flagName] as string;
  }

  // Fall back to environment variable
  if (envVar && process.env[envVar]) {
    return process.env[envVar];
  }

  // Fall back to default
  return defaultValue;
}

/**
 * Extract a boolean flag value with optional default.
 *
 * @param flags Parsed flags object
 * @param flagName Name of the flag to extract
 * @param defaultValue Optional default value (defaults to false)
 * @returns The flag value
 */
export function getFlagBoolean(
  flags: ParsedFlags,
  flagName: string,
  defaultValue: boolean = false,
): boolean {
  if (flagName in flags) {
    return !!flags[flagName];
  }
  return defaultValue;
}
