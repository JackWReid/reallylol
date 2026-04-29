function parseOpts(args: string[]): Record<string, string> {
  const opts: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : "true";
      opts[key] = val;
    }
  }
  return opts;
}

function positionalArgs(args: string[]): string[] {
  return args.filter((a) => !a.startsWith("--"));
}

const [cmd, sub, ...rest] = process.argv.slice(2);

if (cmd === "create") {
  const { create } = await import("./commands/create");
  const type = sub;
  const pos = positionalArgs(rest);
  const opts = parseOpts(rest);
  await create(type, pos, opts);

} else if (cmd === "media") {
  if (sub === "upload") {
    const { mediaUpload } = await import("./commands/media");
    const pos = positionalArgs(rest);
    const opts = parseOpts(rest);
    await mediaUpload(pos[0], opts);
  } else if (sub === "verify") {
    const { mediaVerify } = await import("./commands/media");
    await mediaVerify();
  } else if (sub === "orphans") {
    const { mediaOrphans } = await import("./commands/media");
    await mediaOrphans();
  } else {
    console.log("Usage: cli media <upload|verify|orphans>");
  }

} else if (cmd === "library") {
  if (sub === "sync") {
    const source = rest[0];
    const opts = parseOpts(rest.slice(1));
    if (source === "books") {
      const { syncBooks } = await import("./commands/library");
      await syncBooks(opts.shelf ?? "read");
    } else if (source === "films") {
      if (!opts.from) {
        console.error("cli library sync films requires --from <letterboxd-export.zip|csv|dir>");
        process.exit(1);
      }
      const { syncFilms } = await import("./commands/library");
      await syncFilms(opts.list ?? "watched", opts.from);
    } else if (source === "links") {
      const { syncLinks } = await import("./commands/library");
      await syncLinks();
    } else {
      console.log("Usage: cli library sync <books|films|links>");
    }
  }

} else if (cmd === "check") {
  if (sub === "links") {
    const { checkLinks } = await import("./commands/check");
    await checkLinks();
  } else {
    console.log("Usage: cli check <links>");
  }

} else if (cmd === "tags") {
  if (sub === "init") {
    const { tagsInit } = await import("./commands/tags");
    await tagsInit();
  } else if (sub === "describe") {
    const { tagsDescribe } = await import("./commands/tags");
    await tagsDescribe(parseOpts(rest));
  } else if (sub === "suggest") {
    const { tagsSuggest } = await import("./commands/tags");
    await tagsSuggest(parseOpts(rest));
  } else if (sub === "review") {
    const { tagsReview } = await import("./commands/tags");
    await tagsReview();
  } else if (sub === "apply") {
    const { tagsApply } = await import("./commands/tags");
    await tagsApply(parseOpts(rest));
  } else {
    console.log("Usage: cli tags <init|describe|suggest|review|apply>");
    console.log("  init                               Scan untagged photos, build state file");
    console.log("  describe [--limit N] [--concurrency N] [--host URL] [--model NAME]");
    console.log("  suggest  [--limit N] [--host URL] [--model NAME]");
    console.log("  review                             Open browser UI at http://localhost:4444");
    console.log("  apply [--dry-run]                  Write approved tags to markdown files");
  }

} else {
  console.log(`really.lol CLI

Usage:
  cli create <post|photo|note|highlight> [options]
  cli media <upload|verify|orphans>
  cli library sync <books|films|links>
  cli check links
  cli tags <init|describe|suggest|review|apply>

Create options:
  --title, --tags, --date, --body, --slug
  --location (photo), --link (highlight), --subtitle (post)

Media:
  cli media upload <file> [--prefix img/post/slug]
  cli media verify
  cli media orphans

Library sync:
  cover books --shelf read --json | cli library sync books --shelf read
  cli library sync films --list watched --from path/to/letterboxd-export.zip
  cli library sync films --list towatch --from path/to/letterboxd-export.zip
  cli library sync links

Check:
  cli check links               # Find broken internal links in built site`);
}
