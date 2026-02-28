/**
 * Pipelex Auth MCP Server (stdio)
 *
 * Two tools:
 *   - check_pipelex_auth: is the user connected?
 *   - connect_pipelex:    open browser OAuth, catch callback, write key to disk
 *
 * The API key travels: browser → localhost callback → disk.
 * It NEVER passes through the MCP protocol or the LLM.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { exec } from "node:child_process";
import { parse } from "node:url";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PIPELEX_API_URL = process.env.PIPELEX_API_URL ?? "https://app-staging.pipelex.com";
const AUTH_TIMEOUT_MS = 120_000;

// ---------------------------------------------------------------------------
// Filesystem
// ---------------------------------------------------------------------------

const ENV_DIR = join(homedir(), ".pipelex");
const ENV_FILE = join(ENV_DIR, ".env");

function readApiKey() {
  if (!existsSync(ENV_FILE)) return null;
  const content = readFileSync(ENV_FILE, "utf-8");
  const match = content.match(/^PIPELEX_API_KEY=(.+)$/m);
  return match?.[1]?.trim() || null;
}

function writeApiKey(key) {
  if (!existsSync(ENV_DIR)) mkdirSync(ENV_DIR, { recursive: true });

  let content = "";
  if (existsSync(ENV_FILE)) {
    content = readFileSync(ENV_FILE, "utf-8");
    if (/^PIPELEX_API_KEY=/m.test(content)) {
      content = content.replace(/^PIPELEX_API_KEY=.*$/m, `PIPELEX_API_KEY=${key}`);
    } else {
      content = content.trimEnd() + `\nPIPELEX_API_KEY=${key}\n`;
    }
  } else {
    content = `PIPELEX_API_KEY=${key}\n`;
  }

  writeFileSync(ENV_FILE, content);
}

// ---------------------------------------------------------------------------
// Browser (cross-platform)
// ---------------------------------------------------------------------------

function openBrowser(url) {
  const cmd =
    process.platform === "darwin" ? "open" :
    process.platform === "win32" ? "start" :
    "xdg-open";
  exec(`${cmd} "${url}"`);
}

// ---------------------------------------------------------------------------
// OAuth callback HTML
// ---------------------------------------------------------------------------

const SUCCESS_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Connected</title>
<style>
body{font-family:-apple-system,system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f8f9fa}
.c{text-align:center;background:#fff;padding:48px;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,.08);max-width:400px}
h1{margin:0 0 8px;font-size:24px;color:#15803d}p{margin:0;color:#666}
</style></head>
<body><div class="c"><h1>&#10003; Connected to Pipelex!</h1><p>You can close this tab and return to Claude.</p></div></body></html>`;

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function errorHtml(msg) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Failed</title>
<style>
body{font-family:-apple-system,system-ui,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f8f9fa}
.c{text-align:center;background:#fff;padding:48px;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,.08);max-width:400px}
h1{margin:0 0 8px;font-size:24px;color:#dc2626}p{margin:0;color:#666}
</style></head>
<body><div class="c"><h1>&#10007; Connection Failed</h1><p>${escapeHtml(msg)}</p><p style="margin-top:12px">Return to Claude and try again.</p></div></body></html>`;
}

// ---------------------------------------------------------------------------
// Auth flow
// ---------------------------------------------------------------------------

function startAuthFlow(provider) {
  return new Promise((resolve) => {
    let done = false;

    const server = createServer((req, res) => {
      const { pathname, query } = parse(req.url, true);
      if (pathname !== "/callback") {
        res.writeHead(404);
        res.end();
        return;
      }

      const key = query.key;
      const error = query.error;

      if (error) {
        const msg = error === "key_already_exists"
          ? "You already have an API key. Check ~/.pipelex/.env"
          : String(error);
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(errorHtml(msg));
        cleanup();
        resolve({ status: "not_connected", error: String(error) });
        return;
      }

      if (key) {
        writeApiKey(String(key));
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(SUCCESS_HTML);
        cleanup();
        resolve({ status: "connected" });
        return;
      }

      res.writeHead(400, { "Content-Type": "text/html" });
      res.end(errorHtml("No key received"));
      cleanup();
      resolve({ status: "not_connected", error: "no_key" });
    });

    function cleanup() {
      if (!done) {
        done = true;
        server.close();
      }
    }

    // Port 0 = OS picks a free port
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      const callback = `http://localhost:${port}/callback`;
      const authUrl = `${PIPELEX_API_URL}/auth/${provider}?cli_redirect=${encodeURIComponent(callback)}`;
      openBrowser(authUrl);

      setTimeout(() => {
        if (!done) {
          cleanup();
          resolve({ status: "not_connected", error: "timeout" });
        }
      }, AUTH_TIMEOUT_MS);
    });
  });
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new McpServer({ name: "pipelex", version: "0.0.1" });

server.tool(
  "check_pipelex_auth",
  "Check if the user has connected their Pipelex account",
  {},
  async () => {
    const key = readApiKey();
    return {
      content: [{
        type: "text",
        text: key
          ? "Pipelex is connected and ready to use."
          : "Pipelex is not connected. Use the connect_pipelex tool to authenticate.",
      }],
    };
  },
);

server.tool(
  "connect_pipelex",
  "Connect to Pipelex by opening a browser login page. The API key is saved locally and never passes through this conversation.",
  { provider: z.enum(["google", "github"]).default("google").describe("OAuth provider") },
  async ({ provider }) => {
    if (readApiKey()) {
      return { content: [{ type: "text", text: "Already connected to Pipelex." }] };
    }

    const result = await startAuthFlow(provider);

    if (result.status === "connected") {
      return { content: [{ type: "text", text: "Successfully connected to Pipelex! API key saved to ~/.pipelex/.env." }] };
    }

    const msg =
      result.error === "timeout" ? "Login timed out. Please try again." :
      result.error === "key_already_exists" ? "You already have a Pipelex API key. Check ~/.pipelex/.env." :
      `Connection failed: ${result.error}. Please try again.`;

    return { content: [{ type: "text", text: msg }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
