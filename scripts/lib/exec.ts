/** Subprocess execution wrappers for external tools. */

/** Run a command and return stdout, throwing on non-zero exit. */
export async function run(
  cmd: string[],
  opts?: { stdin?: string; cwd?: string },
): Promise<string> {
  const proc = Bun.spawn(cmd, {
    cwd: opts?.cwd,
    stdin: opts?.stdin ? new Response(opts.stdin).body : undefined,
    stdout: "pipe",
    stderr: "pipe",
  });
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`${cmd[0]} exited with code ${code}: ${stderr.trim()}`);
  }
  return stdout;
}

/** Run a command, returning stdout or null on failure. */
export async function tryRun(
  cmd: string[],
  opts?: { stdin?: string; cwd?: string },
): Promise<string | null> {
  try {
    return await run(cmd, opts);
  } catch {
    return null;
  }
}

/** Check if a command exists in PATH. */
export async function commandExists(name: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(["which", name], {
      stdout: "pipe",
      stderr: "pipe",
    });
    await proc.exited;
    return proc.exitCode === 0;
  } catch {
    return false;
  }
}
