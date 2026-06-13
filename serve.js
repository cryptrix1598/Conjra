import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const FALLBACK_PORT = 3001;
const SITE_DIR = join(__dirname, "site");

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function startServer(port) {
  const server = createServer(async (req, res) => {
    const urlPath = req.url?.split("?")[0] ?? "/";
    let filePath = join(SITE_DIR, urlPath === "/" ? "index.html" : urlPath);

    try {
      const fileStat = await stat(filePath);
      if (fileStat.isDirectory()) {
        filePath = join(filePath, "index.html");
      }
    } catch {
      if (!extname(filePath)) {
        filePath += ".html";
      }
      try {
        await stat(filePath);
      } catch {
        filePath = join(SITE_DIR, "index.html");
      }
    }

    try {
      const data = await readFile(filePath);
      const ext = extname(filePath);
      const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    }
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      if (port === PORT) {
        console.log(`Port ${port} is in use, trying ${FALLBACK_PORT}...`);
        startServer(FALLBACK_PORT);
      } else {
        console.error(`Both ports ${PORT} and ${FALLBACK_PORT} are in use.`);
        process.exit(1);
      }
    } else {
      throw err;
    }
  });

  server.listen(port, () => {
    console.log(`\n  Conjra docs running at:\n`);
    console.log(`  \x1b[32m➜\x1b[0m  Local:   http://localhost:${port}\n`);
  });
}

startServer(PORT);