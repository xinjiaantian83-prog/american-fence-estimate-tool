import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const distServer = join(root, "dist", "server");

const textFiles = {
  "/": { source: "index.html", contentType: "text/html; charset=utf-8" },
  "/index.html": { source: "index.html", contentType: "text/html; charset=utf-8" },
  "/style.css": { source: "style.css", contentType: "text/css; charset=utf-8" },
  "/fence-engine.js": { source: "fence-engine.js", contentType: "application/javascript; charset=utf-8" },
  "/url-state.js": { source: "url-state.js", contentType: "application/javascript; charset=utf-8" },
  "/script.js": { source: "script.js", contentType: "application/javascript; charset=utf-8" }
};

const imageFiles = [
  "hero.jpg",
  "hero-900.jpg",
  "hero-1600.jpg",
  "dogrun.jpg",
  "dogrun-640.jpg",
  "garage.jpg",
  "garage-640.jpg",
  "garden.jpg",
  "garden-640.jpg",
  "shop.jpg",
  "shop-640.jpg"
].reduce((files, filename) => {
  files[`/images/${filename}`] = { source: `images/${filename}`, contentType: "image/jpeg", binary: true };
  return files;
}, {});

const files = { ...textFiles, ...imageFiles };

const entries = Object.fromEntries(await Promise.all(
  Object.entries(files).map(async ([path, meta]) => [
    path,
    meta.binary
      ? {
          contentType: meta.contentType,
          bodyBase64: (await readFile(join(root, meta.source))).toString("base64")
        }
      : {
          contentType: meta.contentType,
          body: await readFile(join(root, meta.source), "utf8")
        }
  ])
));

const worker = `const files = ${JSON.stringify(entries)};

function decodeBase64(base64) {
  const text = atob(base64);
  const bytes = new Uint8Array(text.length);
  for (let index = 0; index < text.length; index += 1) {
    bytes[index] = text.charCodeAt(index);
  }
  return bytes;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const file = files[url.pathname] || files["/index.html"];
    const body = file.bodyBase64 ? decodeBase64(file.bodyBase64) : file.body;

    return new Response(body, {
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
