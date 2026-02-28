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

const PIPELEX_API_URL = process.env.PIPELEX_API_URL ?? "https://api-staging.pipelex.com";
const ENV_KEY_NAME = "PIPELEX_GATEWAY_API_KEY";
const AUTH_TIMEOUT_MS = 300_000; // 5 minutes — enough for slow OAuth flows

// ---------------------------------------------------------------------------
// Filesystem
// ---------------------------------------------------------------------------

const ENV_DIR = join(homedir(), ".pipelex");
const ENV_FILE = join(ENV_DIR, ".env");

function readApiKey() {
  if (!existsSync(ENV_FILE)) return null;
  const content = readFileSync(ENV_FILE, "utf-8");
  const re = new RegExp(`^${ENV_KEY_NAME}=(.+)$`, "m");
  const match = content.match(re);
  return match?.[1]?.trim() || null;
}

function writeApiKey(key) {
  if (!existsSync(ENV_DIR)) mkdirSync(ENV_DIR, { recursive: true });

  const reTest = new RegExp(`^${ENV_KEY_NAME}=`, "m");
  const reReplace = new RegExp(`^${ENV_KEY_NAME}=.*$`, "m");

  let content = "";
  if (existsSync(ENV_FILE)) {
    content = readFileSync(ENV_FILE, "utf-8");
    if (reTest.test(content)) {
      content = content.replace(reReplace, `${ENV_KEY_NAME}=${key}`);
    } else {
      content = content.trimEnd() + `\n${ENV_KEY_NAME}=${key}\n`;
    }
  } else {
    content = `${ENV_KEY_NAME}=${key}\n`;
  }

  writeFileSync(ENV_FILE, content);
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
// Persistent callback server
// ---------------------------------------------------------------------------
// The HTTP server lives at module level so it survives across MCP tool calls.
// It starts when connect_pipelex is called and stays alive until:
//   - the callback is received (key or error)
//   - the timeout fires (5 min)
//   - the MCP process exits

let callbackServer = null;
let callbackTimeout = null;

function shutdownCallbackServer() {
  if (callbackTimeout) {
    clearTimeout(callbackTimeout);
    callbackTimeout = null;
  }
  if (callbackServer) {
    callbackServer.close();
    callbackServer = null;
  }
}

function startAuthFlow(provider) {
  // Shut down any previous callback server
  shutdownCallbackServer();

  return new Promise((resolve) => {
    const httpServer = createServer((req, res) => {
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
        shutdownCallbackServer();
        return;
      }

      if (key) {
        writeApiKey(String(key));
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(SUCCESS_HTML);
        shutdownCallbackServer();
        return;
      }

      res.writeHead(400, { "Content-Type": "text/html" });
      res.end(errorHtml("No key received"));
      shutdownCallbackServer();
    });

    // Keep reference at module level so it persists
    callbackServer = httpServer;

    // Port 0 = OS picks a free port
    httpServer.listen(0, "127.0.0.1", () => {
      const port = httpServer.address().port;
      const callback = `http://localhost:${port}/callback`;
      const authUrl = `${PIPELEX_API_URL}/login/${provider}?cli_redirect=${encodeURIComponent(callback)}`;

      // Try to open browser (may fail in Electron sandbox — that's OK)
      exec(`/usr/bin/open "${authUrl}"`, () => {});

      // Auto-cleanup after timeout
      callbackTimeout = setTimeout(() => {
        shutdownCallbackServer();
      }, AUTH_TIMEOUT_MS);

      // Resolve immediately so the LLM can show the URL as a clickable link
      resolve({ status: "waiting", authUrl });
    });
  });
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const mcpServer = new McpServer({ name: "pipelex", version: "0.0.1" });

mcpServer.tool(
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

mcpServer.tool(
  "connect_pipelex",
  "Connect to Pipelex. IMPORTANT: This tool returns a login URL that you MUST display as a clickable markdown link to the user. After they log in, call check_pipelex_auth to verify.",
  { provider: z.enum(["google", "github"]).default("google").describe("OAuth provider") },
  async ({ provider }) => {
    if (readApiKey()) {
      return { content: [{ type: "text", text: "Already connected to Pipelex." }] };
    }

    const result = await startAuthFlow(provider);

    if (result.authUrl) {
      return {
        content: [{
          type: "text",
          text: `Please click this link to connect to Pipelex:\n\n${result.authUrl}\n\nAfter logging in, your API key will be saved automatically. The key never passes through this conversation.`,
        }],
      };
    }

    return { content: [{ type: "text", text: "Failed to start authentication flow." }] };
  },
);

const transport = new StdioServerTransport();
await mcpServer.connect(transport);
