const command = process.argv[2];

if (command === "migrate") {
  const { migrate } = await import("./commands/migrate");
  await migrate();
} else {
  console.log("Usage: cli migrate");
  process.exit(1);
}
