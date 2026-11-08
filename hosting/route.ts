import { createMcpHandler } from "mcp-handler";
import { AsyncLocalStorage } from "node:async_hooks";
import { registerUrlinksTools } from "@urlinks/mcp-server";

// The URLinks MCP server, hosted over Streamable HTTP (the "lightweight" kind:
// no per-session local process — AI clients connect to this URL). Replaces the
// old stdio `@urlinks/mcp-server` package. Tool logic is the single shared
// `registerUrlinksTools`; this route only adds transport + per-request auth.

export const runtime = "nodejs"; // needs node:async_hooks (AsyncLocalStorage)
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Each request carries its own URLinks API key (the caller's `urk_` bearer
// token). The server is registered once, but every tool call resolves the key
// from this context, so one instance safely serves many callers without
// leaking keys across requests.
const apiKeyStore = new AsyncLocalStorage<string>();

const MISSING_KEY =
  "Missing 'Authorization: Bearer <urk_…>' header. Create an API key in your URLinks dashboard settings.";

const mcpHandler = createMcpHandler(
  (server) => {
    registerUrlinksTools(server, {
      getApiKey: () => {
        const key = apiKeyStore.getStore();
        if (!key) throw new Error(MISSING_KEY);
        return key;
      },
    });
  },
  // Without serverInfo, mcp-handler announces itself to clients as
  // "mcp-typescript server on vercel". Keep the version in step with server.json.
  { serverInfo: { name: "urlinks", version: "0.3.2" } },
  { basePath: "/api" }, // this route is /api/mcp -> streamableHttpEndpoint = /api/mcp
);

function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : null;
}

// No key is needed to initialize or list tools, so registries and agents can
// see what the server does before signing up. Every tool call still needs one:
// the backend calls go through getApiKey, which throws MISSING_KEY, and the SDK
// returns that to the client as a tool error.
async function handler(req: Request): Promise<Response> {
  return apiKeyStore.run(bearerToken(req) ?? "", () => mcpHandler(req));
}

export { handler as GET, handler as POST, handler as DELETE };
