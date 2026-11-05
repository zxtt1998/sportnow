// Test-only static server. It is never copied into dist or deployed.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname } from "node:path";
const root = resolve("dist");
const sessions = new Map();
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
  ".json": "application/json",
};
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1:4173");
    const session = /(?:^|;\s*)sportnow-e2e-session=([a-zA-Z0-9-]+)/.exec(
      req.headers.cookie || "",
    )?.[1];
    if (url.pathname === "/__test/news" && req.method === "POST") {
      if (!session) {
        res.writeHead(400);
        res.end("Session cookie required");
        return;
      }
      let body = "";
      for await (const part of req) {
        body += part;
        if (body.length > 2_000_000) throw Error("Body too large");
      }
      sessions.set(session, JSON.parse(body));
      res.writeHead(204);
      res.end();
      return;
    }
    const fixture = session ? sessions.get(session) : null;
    if (fixture && /\/data\/(news|sources-status)\.json$/.test(url.pathname)) {
      const value = url.pathname.endsWith("/news.json")
        ? fixture.news
        : fixture.status;
      res.writeHead(200, {
        "content-type": "application/json",
        "cache-control": "no-store",
      });
      res.end(JSON.stringify(value));
      return;
    }
    let path = resolve(root, "." + decodeURIComponent(url.pathname));
    if (!path.startsWith(root + "/") && path !== root) {
      res.writeHead(403);
      res.end();
      return;
    }
    if ((await stat(path)).isDirectory()) path = resolve(path, "index.html");
    const body = await readFile(path);
    res.writeHead(200, {
      "content-type": mime[extname(path)] || "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
server.listen(4173, "127.0.0.1", () =>
  process.stdout.write("SportNow test server: http://127.0.0.1:4173\n"),
);
