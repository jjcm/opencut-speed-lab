#!/usr/bin/env node
/**
 * Reverse-proxy that compresses text responses (gzip / brotli).
 * Used to serve the production preview with compressed static + HTML.
 */
import http from "node:http";
import zlib from "node:zlib";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const UPSTREAM_HOST = process.env.UPSTREAM_HOST || "127.0.0.1";
const UPSTREAM_PORT = Number(process.env.UPSTREAM_PORT || 4173);
const PORT = Number(process.env.PORT || 4180);

const TEXTISH =
  /^(text\/|application\/(javascript|json|xml|wasm)|image\/svg\+xml|application\/x-javascript)/i;

function pickEncoding(accept) {
  const a = (accept || "").toLowerCase();
  if (a.includes("br")) return "br";
  if (a.includes("gzip")) return "gzip";
  return null;
}

function compressor(encoding) {
  if (encoding === "br") {
    return zlib.createBrotliCompress({
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 5,
        [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
      },
    });
  }
  if (encoding === "gzip") {
    return zlib.createGzip({ level: 6 });
  }
  return null;
}

const server = http.createServer((req, res) => {
  const options = {
    hostname: UPSTREAM_HOST,
    port: UPSTREAM_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `${UPSTREAM_HOST}:${UPSTREAM_PORT}` },
  };

  const proxy = http.request(options, (up) => {
    const ctype = String(up.headers["content-type"] || "");
    const already = up.headers["content-encoding"];
    const encoding = !already && TEXTISH.test(ctype) ? pickEncoding(req.headers["accept-encoding"]) : null;
    const headers = { ...up.headers };

    if (encoding) {
      delete headers["content-length"];
      headers["content-encoding"] = encoding;
      headers["vary"] = headers["vary"]
        ? `${headers["vary"]}, Accept-Encoding`
        : "Accept-Encoding";
    }

    res.writeHead(up.statusCode || 200, headers);
    if (!encoding) {
      up.pipe(res);
      return;
    }
    const c = compressor(encoding);
    pipeline(up, c, res).catch(() => {
      res.destroy();
    });
  });

  proxy.on("error", () => {
    res.statusCode = 502;
    res.end("upstream error");
  });
  req.pipe(proxy);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`compress-proxy http://127.0.0.1:${PORT} -> ${UPSTREAM_HOST}:${UPSTREAM_PORT}`);
});
