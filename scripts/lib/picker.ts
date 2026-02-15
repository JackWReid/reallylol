/** Native terminal picker — replaces fzf dependency. */

import * as readline from "readline";

export interface PickerOptions {
  delimiter?: string;
  withNth?: string;
  header?: string;
  prompt?: string;
  statusFn?: (item: string) => string;
}

/** Score an item against a query. Higher is better, -1 means no match. */
function fuzzyScore(displayText: string, query: string): number {
  if (!query) return 0;
  const lower = displayText.toLowerCase();
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);

  let score = 0;
  for (const word of words) {
    const idx = lower.indexOf(word);
    if (idx === -1) return -1;
    // Bonus for prefix match
    if (idx === 0) score += 3;
    // Bonus for word-boundary match
    else if (idx > 0 && /[\s\-_|/]/.test(lower[idx - 1])) score += 2;
    else score += 1;
  }
  return score;
}

/** Extract the display field from a line using delimiter + withNth. */
function extractDisplay(
  line: string,
  delimiter?: string,
  withNth?: string,
): string {
  if (!delimiter || !withNth) return line;
  const parts = line.split(delimiter);
  // withNth is 1-indexed (like fzf)
  const idx = parseInt(withNth, 10) - 1;
  if (idx >= 0 && idx < parts.length) return parts[idx];
  return line;
}

/**
 * Present items in an interactive picker and return the selected line,
 * or null if cancelled. Same API contract as the old fzfSelect.
 */
export async function fzfSelect(
  items: string[],
  opts: PickerOptions = {},
): Promise<string | null> {
  if (items.length === 0) return null;

  // Pre-compute display strings
  const displays = items.map((item) =>
    extractDisplay(item, opts.delimiter, opts.withNth),
  );

  return new Promise<string | null>((resolve) => {
    let query = "";
    let cursor = 0;
    let scrollOffset = 0;
    let filtered: Array<{ index: number; display: string }> = [];

    const stdin = process.stdin;
    const stdout = process.stdout;
    const wasRaw = stdin.isRaw;

    // Chrome lines: header (optional) + prompt + count + status bar
    const chromeLines = (opts.header ? 1 : 0) + 2 + 1;

    function maxVisible(): number {
      return Math.max(1, (stdout.rows || 24) - chromeLines);
    }

    function refilter(): void {
      if (!query) {
        filtered = displays.map((d, i) => ({ index: i, display: d }));
      } else {
        const scored: Array<{
          index: number;
          display: string;
          score: number;
        }> = [];
        for (let i = 0; i < displays.length; i++) {
          const s = fuzzyScore(displays[i], query);
          if (s >= 0) scored.push({ index: i, display: displays[i], score: s });
        }
        scored.sort((a, b) => b.score - a.score);
        filtered = scored;
      }
      cursor = 0;
      scrollOffset = 0;
    }

    function clampScroll(): void {
      const vis = maxVisible();
      if (filtered.length === 0) return;
      if (cursor < scrollOffset) scrollOffset = cursor;
      if (cursor >= scrollOffset + vis) scrollOffset = cursor - vis + 1;
    }

    function render(): void {
      const vis = maxVisible();

      // Absolute position: clear screen, cursor to top-left
      stdout.write("\x1b[2J\x1b[H");

      const lines: string[] = [];

      // Header
      if (opts.header) {
        lines.push(`\x1b[90m${opts.header}\x1b[0m`);
      }

      // Prompt + query
      const prompt = opts.prompt ?? "> ";
      lines.push(`${prompt}${query}`);

      // Item count
      lines.push(`\x1b[90m  ${filtered.length}/${items.length}\x1b[0m`);

      // Visible items
      const visibleEnd = Math.min(scrollOffset + vis, filtered.length);
      for (let i = scrollOffset; i < visibleEnd; i++) {
        const entry = filtered[i];
        const pre = i === cursor ? "\x1b[7m" : "";
        const suf = i === cursor ? "\x1b[0m" : "";
        const marker = i === cursor ? "❯ " : "  ";
        lines.push(`${pre}${marker}${entry.display}${suf}`);
      }

      // Pad to fill viewport
      const renderedItems = visibleEnd - scrollOffset;
      for (let i = renderedItems; i < vis; i++) {
        lines.push("");
      }

      // Status bar
      if (opts.statusFn && filtered.length > 0) {
        const selectedItem = items[filtered[cursor].index];
        lines.push(`\x1b[90m${opts.statusFn(selectedItem)}\x1b[0m`);
      } else {
        lines.push("");
      }

      stdout.write(lines.join("\n"));
    }

    function cleanup(): void {
      stdin.removeListener("keypress", onKeypress);
      if (stdin.isTTY) stdin.setRawMode(wasRaw ?? false);
      // Clear screen, cursor home, show cursor
      stdout.write("\x1b[2J\x1b[H\x1b[?25h");
    }

    function onKeypress(
      str: string | undefined,
      key: readline.Key,
    ): void {
      if (!key) return;

      // Ctrl+C or Escape — cancel and exit the process
      if ((key.ctrl && key.name === "c") || key.name === "escape") {
        cleanup();
        process.exit(0);
      }

      // Enter — select
      if (key.name === "return") {
        if (filtered.length === 0) {
          cleanup();
          resolve(null);
        } else {
          const selected = items[filtered[cursor].index];
          cleanup();
          resolve(selected);
        }
        return;
      }

      // Arrow navigation
      if (key.name === "up") {
        if (cursor > 0) cursor--;
        clampScroll();
        render();
        return;
      }
      if (key.name === "down") {
        if (cursor < filtered.length - 1) cursor++;
        clampScroll();
        render();
        return;
      }

      // Backspace
      if (key.name === "backspace") {
        if (query.length > 0) {
          query = query.slice(0, -1);
          refilter();
        }
        render();
        return;
      }

      // Printable character
      if (str && str.length === 1 && !key.ctrl && !key.meta) {
        query += str;
        refilter();
        render();
        return;
      }
    }

    // Set up terminal
    readline.emitKeypressEvents(stdin);
    if (stdin.isTTY) stdin.setRawMode(true);
    stdout.write("\x1b[?25l"); // hide cursor

    stdin.on("keypress", onKeypress);

    // Initial render
    refilter();
    render();
  });
}
