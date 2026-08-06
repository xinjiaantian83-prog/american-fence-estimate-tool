import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const distServer = join(root, "dist", "server");

const files = {
  "/": { source: "index.html", contentType: "text/html; charset=utf-8" },
  "/index.html": { source: "index.html", contentType: "text/html; charset=utf-8" },
  "/style.css": { source: "style.css", contentType: "text/css; charset=utf-8" },
  "/fence-engine.js": { source: "fence-engine.js", contentType: "application/javascript; charset=utf-8" },
  "/url-state.js": { source: "url-state.js", contentType: "application/javascript; charset=utf-8" },
  "/script.js": { source: "script.js", contentType: "application/javascript; charset=utf-8" }
};

const entries = Object.fromEntries(await Promise.all(
  Object.entries(files).map(async ([path, meta]) => [
    path,
    {
      contentType: meta.contentType,
      body: await readFile(join(root, meta.source), "utf8")
    }
  ])
));

const worker = `const files = ${JSON.stringify(entries)};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const file = files[url.pathname] || files["/index.html"];

    return new Response(file.body, {
      headers: {
        "content-type": file.contentType,
        "cache-control": "no-store"
      }
    });
  }
};
`;

await mkdir(distServer, { recursive: true });
await writeFile(join(distServer, "package.json"), JSON.stringify({ type: "module" }, null, 2));
await writeFile(join(distServer, "index.js"), worker);
