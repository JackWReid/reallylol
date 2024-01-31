import { Database } from "bun:sqlite";

async function initDB() {
  const db = new Database("mydb.sqlite", { create: true });

  const migrationFile = Bun.file("./migrations/001-init.sql");
  const migrationText = await migrationFile.text();

  const schemaQ = db.query(migrationText);
  schemaQ.run();
}

initDB();

Bun.serve({
  port: 8000,
  hostname: "0.0.0.0",
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/") return new Response("Home page!");
    if (url.pathname === "/blog") return new Response("Blog!");
    return new Response("404!");
  },
});
