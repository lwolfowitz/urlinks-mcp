/**
 * URLinks MCP tools — the shared tool surface for the hosted HTTP MCP server at
 * apps/web/app/api/mcp (https://urlinks.me/api/mcp). Exposes
 * registerUrlinksTools(server, { getApiKey }); the key is resolved per call so
 * a single server instance can serve many callers.
 *
 * Tools: shortlink CRUD + search + analytics, styled QR codes, and link-in-bio
 * profile management (themes, blocks, custom CSS).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getThemePreset, listThemeNames, describeThemesText } from "@urlinks/profile-presets";
import { formatProfileSummary, registerProfileParityTools } from "./profile-parity";
import { READS, ADDS, CHANGES } from "./annotations";

// --- Config ---

export const DEFAULT_API_BASE_URL =
  "https://mkec635keeprfdasocc4st545y0eisjc.lambda-url.us-east-2.on.aws";

export interface UrlinksToolDeps {
  /**
   * Resolve the caller's URLinks API key (urk_...) at call time. The HTTP route
   * reads the per-request Authorization bearer token here, so one registered
   * server can serve many callers; a constant closure works for single-key hosts.
   */
  getApiKey: () => string;
  /** Override the backend base URL (defaults to the prod Lambda function URL). */
  apiBaseUrl?: string;
}

interface ApiResponse<T = unknown> {
  data?: T;
  error?: { message: string; status: number; code?: string };
}

/**
 * Register every URLinks tool on an MCP server. Single source of truth for the
 * tool surface, shared by the HTTP route (apps/web/app/api/mcp). The key is
 * resolved per call via deps.getApiKey(), so registration happens once but each
 * request authenticates with its own bearer token.
 */
export function registerUrlinksTools(
  server: McpServer,
  deps: UrlinksToolDeps
): void {
  const API_BASE_URL = deps.apiBaseUrl || DEFAULT_API_BASE_URL;

  async function apiCall<T = unknown>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${deps.getApiKey()}`,
      "Content-Type": "application/json",
    };

    const resp = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = (await resp.json()) as ApiResponse<T>;
    return json;
  }

// Tool: create_shortlink
server.tool(
  "create_shortlink",
  "Create a new shortlink. The shortlink path must start with 'my/' (personal) or 'yt/' (YouTube globals). Once created, my/ shortlinks resolve publicly at https://urlinks.me/{alias}/{name} (assuming the user has set an alias via create_alias) — that's the URL QR codes encode for click tracking. Group shortlinks (e.g. work/foo) aren't supported through the API yet; use the web dashboard for those.",
  {
    shortlink: z
      .string()
      .describe(
        "The short path. Must start with 'my/' (personal) or 'yt/' (YouTube). Examples: 'my/docs', 'my/standup', 'yt/never-gonna-give'."
      ),
    url: z
      .string()
      .describe("The destination URL the shortlink should redirect to"),
    description: z
      .string()
      .optional()
      .describe("Optional human-readable description of what this link is for"),
  },
  ADDS,
  async ({ shortlink, url, description }) => {
    // Pre-validate prefix so the user gets a crisp message before hitting the API.
    if (!shortlink.startsWith("my/") && !shortlink.startsWith("yt/")) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Shortlink must start with 'my/' (personal) or 'yt/' (YouTube). Got: '${shortlink}'.\n\nGroup shortlinks (e.g. 'work/foo') aren't supported through the API yet — create them in the web dashboard at https://urlinks.me/shortlinks/new.`,
          },
        ],
        isError: true,
      };
    }

    const resp = await apiCall<{
      shortlink: string;
      url: string;
      description: string;
      created_at: string;
    }>("POST", "/v1/links", { shortlink, url, description: description || "" });

    if (resp.error) {
      let text = `Failed to create shortlink: ${resp.error.message}`;
      if (resp.error.code === "ALREADY_EXISTS") {
        text += `\n\nA shortlink at '${shortlink}' already exists. Either pick a different name or use edit_link to update the existing one.`;
      }
      return {
        content: [{ type: "text" as const, text }],
        isError: true,
      };
    }

    const publicHint = shortlink.startsWith("my/")
      ? `\nPublic URL (once you have an alias): https://urlinks.me/{alias}/${shortlink.slice(3)}`
      : `\nPublic URL: https://urlinks.me/${resp.data!.shortlink}`;
    return {
      content: [
        {
          type: "text" as const,
          text: `Created shortlink: ${resp.data!.shortlink} -> ${resp.data!.url}${publicHint}`,
        },
      ],
    };
  }
);

// Tool: list_links
server.tool(
  "list_links",
  "List all your shortlinks. Returns shortlink slugs, destination URLs, descriptions, and the public scan URL each one resolves at (e.g. urlinks.me/{alias}/foo). The public URL is what QR codes and shareable links use.",
  {
    limit: z
      .number()
      .optional()
      .describe("Max links to return (default 100, max 500)"),
    offset: z
      .number()
      .optional()
      .describe("Offset for pagination (default 0)"),
  },
  READS,
  async ({ limit, offset }) => {
    const params = new URLSearchParams();
    if (limit) params.set("limit", String(limit));
    if (offset) params.set("offset", String(offset));

    const query = params.toString() ? `?${params.toString()}` : "";

    // Fetch links + alias in parallel — alias is needed to build the public
    // scan URL for my/ links. Missing alias is non-fatal; we just omit
    // the public URL column.
    const [linksResp, aliasResp] = await Promise.all([
      apiCall<{
        links: Array<{
          shortlink: string;
          url: string;
          description: string;
          public: boolean;
        }>;
        total: number;
      }>("GET", `/v1/links${query}`),
      apiCall<{ has_alias: boolean; alias: string | null }>("GET", "/v1/alias"),
    ]);

    if (linksResp.error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to list links: ${linksResp.error.message}`,
          },
        ],
        isError: true,
      };
    }

    const { links, total } = linksResp.data!;
    const alias = aliasResp.data?.has_alias ? aliasResp.data.alias : null;

    const publicUrlFor = (slug: string): string => {
      if (slug.startsWith("my/")) {
        return alias
          ? `urlinks.me/${alias}/${slug.slice(3)}`
          : `urlinks.me/{alias}/${slug.slice(3)} (set an alias with create_alias)`;
      }
      return `urlinks.me/${slug}`;
    };

    const formatted = links
      .map((l) => {
        const pub = publicUrlFor(l.shortlink);
        const desc = l.description ? ` — ${l.description}` : "";
        return `${l.shortlink}  (${pub})  →  ${l.url}${desc}`;
      })
      .join("\n");

    const header = alias
      ? `Found ${total} links (your alias: ${alias}):`
      : `Found ${total} links. No alias set yet — call create_alias to enable public urlinks.me/{alias}/{name} URLs for personal links.`;

    return {
      content: [
        {
          type: "text" as const,
          text: `${header}\n\n${formatted}`,
        },
      ],
    };
  }
);

// Tool: search_links
server.tool(
  "search_links",
  "Search your shortlinks by name, URL, or description. Use this to find an existing link before creating a new one.",
  {
    query: z
      .string()
      .describe(
        "Search query — matches against shortlink name, destination URL, and description"
      ),
  },
  READS,
  async ({ query }) => {
    const [resp, aliasResp] = await Promise.all([
      apiCall<{
        links: Array<{
          shortlink: string;
          url: string;
          description: string;
        }>;
        total: number;
        query: string;
      }>("GET", `/v1/links/search?q=${encodeURIComponent(query)}`),
      apiCall<{ has_alias: boolean; alias: string | null }>("GET", "/v1/alias"),
    ]);

    if (resp.error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Search failed: ${resp.error.message}`,
          },
        ],
        isError: true,
      };
    }

    const { links, total } = resp.data!;
    if (links.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No links found matching "${query}".`,
          },
        ],
      };
    }

    const alias = aliasResp.data?.has_alias ? aliasResp.data.alias : null;
    const publicUrlFor = (slug: string): string => {
      if (slug.startsWith("my/")) {
        return alias
          ? `urlinks.me/${alias}/${slug.slice(3)}`
          : `urlinks.me/{alias}/${slug.slice(3)}`;
      }
      return `urlinks.me/${slug}`;
    };

    const formatted = links
      .map((l) => {
        const pub = publicUrlFor(l.shortlink);
        const desc = l.description ? ` — ${l.description}` : "";
        return `${l.shortlink}  (${pub})  →  ${l.url}${desc}`;
      })
      .join("\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${total} links matching "${query}":\n\n${formatted}`,
        },
      ],
    };
  }
);

// Tool: get_link_analytics
server.tool(
  "get_link_analytics",
  "Get click analytics for a shortlink — total clicks, daily breakdown, and last clicked time.",
  {
    shortlink: z
      .string()
      .describe("The shortlink to get analytics for (e.g., 'my/docs')"),
    days: z
      .number()
      .optional()
      .describe("Number of days of history (default 30, max 90)"),
  },
  READS,
  async ({ shortlink, days }) => {
    const params = days ? `?days=${days}` : "";
    const resp = await apiCall<{
      shortlink: string;
      total_clicks: number;
      last_clicked_at: number | null;
      daily: Array<{ date: string; clicks: number }>;
    }>("GET", `/v1/links/${encodeURIComponent(shortlink)}/clicks${params}`);

    if (resp.error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to get analytics: ${resp.error.message}`,
          },
        ],
        isError: true,
      };
    }

    const { total_clicks, last_clicked_at, daily } = resp.data!;
    const lastClickedStr = last_clicked_at
      ? new Date(last_clicked_at).toISOString()
      : "never";

    let text = `Analytics for ${shortlink}:\n`;
    text += `Total clicks: ${total_clicks}\n`;
    text += `Last clicked: ${lastClickedStr}\n`;

    if (daily.length > 0) {
      text += `\nDaily breakdown (last ${daily.length} days):\n`;
      for (const d of daily) {
        text += `  ${d.date}: ${d.clicks} clicks\n`;
      }
    }

    return { content: [{ type: "text" as const, text }] };
  }
);

// Tool: delete_link
server.tool(
  "delete_link",
  "Delete a shortlink permanently. This cannot be undone.",
  {
    shortlink: z
      .string()
      .describe("The shortlink to delete (e.g., 'my/old-link')"),
  },
  CHANGES,
  async ({ shortlink }) => {
    const resp = await apiCall("DELETE", `/v1/links/${encodeURIComponent(shortlink)}`);

    if (resp.error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to delete: ${resp.error.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Deleted shortlink: ${shortlink}`,
        },
      ],
    };
  }
);

// Tool: edit_link
server.tool(
  "edit_link",
  "Update a shortlink's destination URL or description.",
  {
    shortlink: z
      .string()
      .describe("The shortlink to edit (e.g., 'my/docs')"),
    url: z
      .string()
      .optional()
      .describe("New destination URL (omit to keep current)"),
    description: z
      .string()
      .optional()
      .describe("New description (omit to keep current)"),
  },
  CHANGES,
  async ({ shortlink, url, description }) => {
    const body: Record<string, string> = {};
    if (url !== undefined) body.url = url;
    if (description !== undefined) body.description = description;

    if (Object.keys(body).length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Nothing to update — provide url and/or description.",
          },
        ],
        isError: true,
      };
    }

    const resp = await apiCall<{
      shortlink: string;
      url: string;
      description: string;
    }>("PUT", `/v1/links/${encodeURIComponent(shortlink)}`, body);

    if (resp.error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to update: ${resp.error.message}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Updated ${resp.data!.shortlink} -> ${resp.data!.url}${resp.data!.description ? ` (${resp.data!.description})` : ""}`,
        },
      ],
    };
  }
);

// Tool: bulk_create_links
server.tool(
  "bulk_create_links",
  "Create multiple shortlinks at once (max 50). Use this when you need to create several links in one operation.",
  {
    links: z
      .array(
        z.object({
          shortlink: z.string().describe("Short path (must start with my/ or yt/)"),
          url: z.string().describe("Destination URL"),
          description: z.string().optional().describe("Optional description"),
        })
      )
      .describe("Array of links to create (max 50)"),
  },
  ADDS,
  async ({ links }) => {
    const resp = await apiCall<{
      created: number;
      failed: number;
      results: Array<{
        index: number;
        status: string;
        shortlink?: string;
        url?: string;
        error?: string;
      }>;
    }>("POST", "/v1/bulk/links", { links });

    if (resp.error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Bulk create failed: ${resp.error.message}`,
          },
        ],
        isError: true,
      };
    }

    const { created, failed, results } = resp.data!;
    let text = `Bulk create: ${created} created, ${failed} failed.\n\n`;

    for (const r of results) {
      if (r.status === "created") {
        text += `  [ok] ${r.shortlink} -> ${r.url}\n`;
      } else {
        text += `  [fail] ${r.shortlink || `item ${r.index}`}: ${r.error}\n`;
      }
    }

    return { content: [{ type: "text" as const, text }] };
  }
);

// Tool: save_qr_config
server.tool(
  "save_qr_config",
  "Save a QR code style configuration for an existing shortlink. The generated QR encodes the urlinks.me redirect URL (https://urlinks.me/{alias}/{name} for my/ links, or https://urlinks.me/{shortlink} for yt/ and group links) — NOT the destination URL directly — so every scan is counted as a click. Personal (my/) shortlinks therefore require the user to have an alias set; use get_alias to check and create_alias to set one. Available styles: dot shapes (square, circle, rounded, classy, classy-rounded, diamond, star, heart, plus, hexagon, octagon, drop), corner styles (same set — novelty shapes fill only the inner pip), an outer frame (none/square/circle/rounded), colors, center logo or a built-in emblem (heart/star/bolt/clover/shield/moon), and a scan-me frame. Gradients are dashboard-only for now.",
  {
    shortlink: z
      .string()
      .describe("The shortlink to configure QR for (e.g., 'my/docs')"),
    dotShape: z
      .enum([
        "square", "circle", "rounded", "classy", "classy-rounded",
        "diamond", "star", "heart", "plus", "hexagon", "octagon", "drop",
      ])
      .optional()
      .describe("Shape of the QR code data dots (default: square). Novelty shapes (diamond/star/heart/plus/hexagon/octagon/drop) render via the shared @urlinks/qr renderer."),
    cornerStyle: z
      .enum([
        "square", "rounded", "circle", "classy", "classy-rounded",
        "diamond", "star", "heart", "plus", "hexagon", "octagon", "drop",
      ])
      .optional()
      .describe("Shape of the three corner finder markers. The outer frame stays scanner-safe; novelty shapes only fill the inner pip (default: square)."),
    outerShape: z
      .enum(["none", "square", "circle", "rounded"])
      .optional()
      .describe("Frame drawn around the whole QR (default: none)."),
    fgColor: z
      .string()
      .optional()
      .describe("Foreground color as hex (default: #1A1F2E)"),
    bgColor: z
      .string()
      .optional()
      .describe("Background color as hex (default: #FFFDF7)"),
    transparent: z
      .boolean()
      .optional()
      .describe("Use transparent background (default: false)"),
    fgTransparent: z
      .boolean()
      .optional()
      .describe("Transparent dots — the data modules are cut out, for overlaying the QR on other images (default: false)."),
    frame: z
      .enum(["none", "banner", "badge", "minimal"])
      .optional()
      .describe("Frame style around the QR code (default: none)"),
    frameText: z
      .string()
      .optional()
      .describe("Text to display in the frame (max 30 chars)"),
    showLogo: z
      .boolean()
      .optional()
      .describe("Show a logo in the center (default: false)"),
    useUrlinksLogo: z
      .boolean()
      .optional()
      .describe("When showLogo is true, use the URLinks logo as the center image (default: true)."),
    logoSize: z
      .number()
      .optional()
      .describe("Center logo size as a percent of the QR, 20–30 (default: 25)."),
    centerIcon: z
      .enum([
        "square", "circle", "rounded", "classy", "classy-rounded",
        "diamond", "star", "heart", "plus", "hexagon", "octagon", "drop",
        "bolt", "clover", "shield", "moon",
      ])
      .optional()
      .describe("Built-in center glyph rendered in the middle of the QR — a no-upload alternative to a logo. Any data shape, or an emblem (bolt/clover/shield/moon). Overrides showLogo when set."),
    centerIconColor: z
      .string()
      .optional()
      .describe("Hex color for the center emblem (defaults to the foreground color)."),
    dotImageUrl: z
      .string()
      .optional()
      .describe("URL of a square PNG to color the QR by — each module samples the image at its position (e.g. a flag). White/pale areas become a scannable light grey, finder eyes are forced dark, on a white background. Overrides solid color and gradient."),
    ecLevel: z
      .enum(["L", "M", "Q", "H"])
      .optional()
      .describe("Error correction level — higher = more resilient but denser. H recommended with a logo or styled shapes (default: H)."),
  },
  CHANGES,
  async ({ shortlink, ...config }) => {
    const qrConfig: Record<string, unknown> = {};
    if (config.dotShape) qrConfig.dotShape = config.dotShape;
    if (config.cornerStyle) qrConfig.cornerStyle = config.cornerStyle;
    if (config.fgColor) qrConfig.fgColor = config.fgColor;
    if (config.bgColor) qrConfig.bgColor = config.bgColor;
    if (config.transparent !== undefined) qrConfig.transparent = config.transparent;
    if (config.fgTransparent !== undefined) qrConfig.fgTransparent = config.fgTransparent;
    if (config.outerShape) qrConfig.outerShape = config.outerShape;
    if (config.frame) qrConfig.frame = config.frame;
    if (config.frameText) qrConfig.frameText = config.frameText;
    if (config.showLogo !== undefined) qrConfig.showLogo = config.showLogo;
    if (config.useUrlinksLogo !== undefined) qrConfig.useUrlinksLogo = config.useUrlinksLogo;
    if (config.logoSize !== undefined) qrConfig.logoSize = config.logoSize;
    if (config.centerIcon) qrConfig.centerIcon = config.centerIcon;
    if (config.centerIconColor) qrConfig.centerIconColor = config.centerIconColor;
    if (config.dotImageUrl) qrConfig.dotImageUrl = config.dotImageUrl;
    if (config.ecLevel) qrConfig.ecLevel = config.ecLevel;

    // Default some fields if not provided
    if (!qrConfig.dotShape) qrConfig.dotShape = "square";
    if (!qrConfig.cornerStyle) qrConfig.cornerStyle = "square";
    if (!qrConfig.fgColor) qrConfig.fgColor = "#1A1F2E";
    if (!qrConfig.bgColor) qrConfig.bgColor = "#FFFDF7";

    const resp = await apiCall<{
      shortlink: string;
      qr_config: Record<string, unknown>;
      message: string;
    }>("PUT", `/v1/links/${encodeURIComponent(shortlink)}/qr`, { qr_config: qrConfig });

    if (resp.error) {
      let text = `Failed to save QR config: ${resp.error.message}`;
      if (resp.error.status === 404) {
        text += `\n\nShortlink '${shortlink}' doesn't exist. Create it first with create_shortlink, then re-run save_qr_config.`;
      } else if (resp.error.code === "NO_ALIAS") {
        text += `\n\nUse create_alias to pick an alias first — QR codes for personal links encode urlinks.me/{alias}/{name} so scans get tracked.`;
      }
      return {
        content: [{ type: "text" as const, text }],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `QR config saved for ${shortlink}. Style: ${qrConfig.dotShape} dots, ${qrConfig.cornerStyle} corners, ${qrConfig.fgColor} on ${qrConfig.bgColor}${qrConfig.frame && qrConfig.frame !== "none" ? `, ${qrConfig.frame} frame` : ""}. Open the QR Studio in the URLinks dashboard to preview and download.`,
        },
      ],
    };
  }
);

// Tool: list_qr_templates
server.tool(
  "list_qr_templates",
  "List the user's saved QR style templates — reusable styles (colors, shapes, center logo/emblem) they can apply to any link with apply_qr_template.",
  {},
  READS,
  async () => {
    const resp = await apiCall<{
      templates: Array<{ id: string; name: string; config: Record<string, any> }>;
    }>("GET", "/v1/qr/templates");
    if (resp.error) {
      return {
        content: [{ type: "text" as const, text: `Failed to list templates: ${resp.error.message}` }],
        isError: true,
      };
    }
    const templates = resp.data?.templates ?? [];
    if (templates.length === 0) {
      return {
        content: [{ type: "text" as const, text: "No saved QR templates yet. Create one in the QR Studio (\"Save current style as a template\")." }],
      };
    }
    const lines = templates.map((t) => {
      const c = t.config || {};
      return `- ${t.name} (id: ${t.id}) — ${c.dotShape ?? "square"} dots, ${c.fgColor ?? "#1A1F2E"} on ${c.bgColor ?? "#FFFFFF"}${c.centerIcon ? `, ${c.centerIcon} center` : ""}`;
    });
    return {
      content: [{ type: "text" as const, text: `Saved QR templates:\n${lines.join("\n")}\n\nApply one with apply_qr_template(shortlink, template).` }],
    };
  }
);

// Tool: apply_qr_template
server.tool(
  "apply_qr_template",
  "Apply a saved QR style template to a shortlink — copies the template's full style (colors, shapes, center logo/emblem) onto that link's QR. Reference the template by its name or id (see list_qr_templates).",
  {
    shortlink: z.string().describe("The shortlink to style (e.g., 'my/docs')"),
    template: z.string().describe("The template's name or id (from list_qr_templates)"),
  },
  CHANGES,
  async ({ shortlink, template }) => {
    const list = await apiCall<{
      templates: Array<{ id: string; name: string; config: Record<string, any> }>;
    }>("GET", "/v1/qr/templates");
    if (list.error) {
      return {
        content: [{ type: "text" as const, text: `Failed to read templates: ${list.error.message}` }],
        isError: true,
      };
    }
    const key = template.toLowerCase();
    const match = (list.data?.templates ?? []).find((t) => t.id === template || t.name.toLowerCase() === key);
    if (!match) {
      return {
        content: [{ type: "text" as const, text: `No template named or id'd "${template}". Use list_qr_templates to see options.` }],
        isError: true,
      };
    }
    const resp = await apiCall<{ shortlink: string }>(
      "PUT",
      `/v1/links/${encodeURIComponent(shortlink)}/qr`,
      { qr_config: match.config }
    );
    if (resp.error) {
      let text = `Failed to apply template: ${resp.error.message}`;
      if (resp.error.status === 404) text += `\n\nShortlink '${shortlink}' doesn't exist. Create it first with create_shortlink.`;
      return { content: [{ type: "text" as const, text }], isError: true };
    }
    return {
      content: [{ type: "text" as const, text: `Applied template "${match.name}" to ${shortlink}. Preview/download in the QR Studio.` }],
    };
  }
);

// Tool: delete_qr_template
server.tool(
  "delete_qr_template",
  "Delete a saved QR style template by its name or id.",
  {
    template: z.string().describe("The template's name or id (from list_qr_templates)"),
  },
  CHANGES,
  async ({ template }) => {
    const list = await apiCall<{ templates: Array<{ id: string; name: string }> }>("GET", "/v1/qr/templates");
    if (list.error) {
      return {
        content: [{ type: "text" as const, text: `Failed to read templates: ${list.error.message}` }],
        isError: true,
      };
    }
    const key = template.toLowerCase();
    const match = (list.data?.templates ?? []).find((t) => t.id === template || t.name.toLowerCase() === key);
    if (!match) {
      return {
        content: [{ type: "text" as const, text: `No template named or id'd "${template}".` }],
        isError: true,
      };
    }
    const resp = await apiCall<{ templates: unknown[] }>(
      "DELETE",
      `/v1/qr/templates/${encodeURIComponent(match.id)}`
    );
    if (resp.error) {
      return { content: [{ type: "text" as const, text: `Failed to delete: ${resp.error.message}` }], isError: true };
    }
    return { content: [{ type: "text" as const, text: `Deleted template "${match.name}".` }] };
  }
);

// Tool: get_qr_config
server.tool(
  "get_qr_config",
  "Get the QR code configuration for a shortlink, including whether one has been set up.",
  {
    shortlink: z
      .string()
      .describe("The shortlink to check QR config for (e.g., 'my/docs')"),
  },
  READS,
  async ({ shortlink }) => {
    const resp = await apiCall<{
      shortlink: string;
      url: string;
      qr_config: Record<string, unknown> | null;
      has_qr_config: boolean;
      studio_url: string;
    }>("GET", `/v1/links/${encodeURIComponent(shortlink)}/qr`);

    if (resp.error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Failed to get QR config: ${resp.error.message}`,
          },
        ],
        isError: true,
      };
    }

    const { qr_config, has_qr_config, url, studio_url } = resp.data!;

    if (!has_qr_config) {
      return {
        content: [
          {
            type: "text" as const,
            text: `No QR config set for ${shortlink} (${url}). Use save_qr_config to create one, or visit the QR Studio: ${studio_url}`,
          },
        ],
      };
    }

    const cfg = qr_config!;
    let text = `QR config for ${shortlink} (${url}):\n`;
    text += `  Dot shape: ${cfg.dotShape || "square"}\n`;
    text += `  Corner style: ${cfg.cornerStyle || "square"}\n`;
    text += `  Colors: ${cfg.fgColor || "#1A1F2E"} on ${cfg.bgColor || "#FFFDF7"}\n`;
    if (cfg.transparent) text += `  Background: transparent\n`;
    if (cfg.frame && cfg.frame !== "none") text += `  Frame: ${cfg.frame}${cfg.frameText ? ` ("${cfg.frameText}")` : ""}\n`;
    if (cfg.showLogo) text += `  Logo: yes\n`;
    text += `\nPreview & download: ${studio_url}`;

    return { content: [{ type: "text" as const, text }] };
  }
);

// Tool: get_qr_image
server.tool(
  "get_qr_image",
  "Generate a QR code image (SVG or PNG) for a shortlink. The QR encodes the urlinks.me redirect URL (NOT the bare destination) so scans count as clicks: my/foo → urlinks.me/{alias}/foo, yt/foo → urlinks.me/yt/foo. Personal (my/) shortlinks therefore require the user to have an alias set — call get_alias to check, create_alias to set one. Renders the link's saved QR Studio styling (dot/corner shapes, colors, gradient, logo) with the same engine as the dashboard, so the image is identical to what QR Studio shows. Override colors with fg/bg if needed.",
  {
    shortlink: z
      .string()
      .describe("The shortlink to generate a QR code for (e.g., 'my/docs')"),
    fg: z
      .string()
      .optional()
      .describe("Foreground color as hex (overrides saved config)"),
    bg: z
      .string()
      .optional()
      .describe("Background color as hex (overrides saved config)"),
    ec: z
      .enum(["L", "M", "Q", "H"])
      .optional()
      .describe("Error correction level (default: M)"),
    size: z
      .number()
      .optional()
      .describe("Box size in pixels per module (1-40, default: 10)"),
    format: z
      .enum(["svg", "png"])
      .optional()
      .describe("Image format (default: svg)"),
  },
  READS,
  async ({ shortlink, fg, bg, ec, size, format }) => {
    const params = new URLSearchParams();
    if (fg) params.set("fg", fg);
    if (bg) params.set("bg", bg);
    if (ec) params.set("ec", ec);
    if (size) params.set("size", String(size));
    if (format) params.set("format", format);

    const query = params.toString() ? `?${params.toString()}` : "";
    const url = `${API_BASE_URL}/v1/links/${encodeURIComponent(shortlink)}/qr/image${query}`;

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${deps.getApiKey()}` },
    });

    if (!resp.ok) {
      const errText = await resp.text();
      // The Lambda returns JSON {error: {message, code, status}} on failure;
      // pull out the message + code so the user gets the actionable hint
      // (e.g., NO_ALIAS → "run create_alias first").
      let parsed:
        | { error?: { message?: string; code?: string; status?: number } }
        | undefined;
      try {
        parsed = JSON.parse(errText);
      } catch {
        parsed = undefined;
      }
      const message = parsed?.error?.message ?? errText;
      const code = parsed?.error?.code;
      let text = `Failed to generate QR image: ${message}`;
      if (code === "NO_ALIAS") {
        text +=
          "\n\nNext step: call create_alias to pick a username. Once you have one, this shortlink's QR can encode urlinks.me/{alias}/{name} and clicks will be tracked.";
      } else if (resp.status === 404) {
        text += `\n\nShortlink '${shortlink}' doesn't exist. Create it with create_shortlink first.`;
      }
      return {
        content: [{ type: "text" as const, text }],
        isError: true,
      };
    }

    const contentType = resp.headers.get("content-type") || "";
    const body = await resp.text();

    if (contentType.includes("svg")) {
      return {
        content: [
          {
            type: "text" as const,
            text: `QR code SVG for ${shortlink} (${body.length} bytes):\n\n${body}`,
          },
        ],
      };
    }

    // PNG comes back as base64
    return {
      content: [
        {
          type: "text" as const,
          text: `QR code PNG for ${shortlink} generated (base64, ${body.length} chars). Save the base64 content to a .png file.:\n\n${body}`,
        },
      ],
    };
  }
);

// --- Profile Customization Tools ---

// Tool: get_customization_rules
server.tool(
  "get_customization_rules",
  "Get the complete rule set for customizing a URLinks profile page via CSS. Returns the concern map (which CSS classes target which profile elements), the actual HTML structure each class wraps, example CSS for each concern, allowed properties, blocked patterns, and tips. Always call this FIRST before writing any custom CSS — it tells you exactly what to target, what the DOM looks like, and what's blocked.",
  {},
  READS,
  async () => {
    const resp = await apiCall<{
      concerns: Array<{
        name: string;
        classes: string[];
        description: string;
        html: string;
        example: string;
      }>;
      rules: {
        selector_scope: string;
        allowed_prefixes: string[];
        blocked_values: string[];
        blocked_positions: string[];
        tracking_protected: string[];
        limits: Record<string, number>;
      };
      tips: string[];
    }>("GET", "/v1/profile/custom-css/rules");

    if (resp.error) {
      return {
        content: [{
          type: "text" as const,
          text: `Failed to get rules: ${resp.error.message}`,
        }],
        isError: true,
      };
    }

    const { concerns, rules, tips } = resp.data!;

    let text = "# URLinks Profile Customization Rules\n\n";
    text += "## Concerns (targetable profile elements)\n\n";
    for (const c of concerns) {
      text += `### ${c.name}\n`;
      text += `CSS classes: ${c.classes.join(", ")}\n`;
      text += `${c.description}\n`;
      text += `HTML structure: \`${c.html}\`\n`;
      if (c.example) {
        text += `\nExample:\n\`\`\`css\n${c.example}\n\`\`\`\n`;
      }
      text += "\n";
    }

    text += "## CSS Rules\n\n";
    text += `Selector scope: ${rules.selector_scope} (auto-applied — you don't need to add it)\n`;
    text += `Allowed class prefixes: ${rules.allowed_prefixes.join(", ")}\n`;
    text += `Blocked values: ${rules.blocked_values.join(", ")}\n`;
    text += `Blocked positions: ${rules.blocked_positions.join(", ")}\n`;
    text += `Tracking-protected (no display:none): ${rules.tracking_protected.join(", ")}\n`;
    text += `Limits: max ${rules.limits.max_css_bytes} bytes, ${rules.limits.max_keyframes} @keyframes, ${rules.limits.max_selectors} selectors\n\n`;

    text += "## Allowed CSS Features\n\n";
    text += "- Gradients (linear-gradient, radial-gradient, conic-gradient)\n";
    text += "- box-shadow, text-shadow (up to 5 layers each)\n";
    text += "- @keyframes animations (names auto-prefixed with _pc_)\n";
    text += "- transforms (translate, rotate, scale, skew)\n";
    text += "- backdrop-filter (blur, brightness, etc.)\n";
    text += "- Pseudo-classes (:hover, :active, :focus, :nth-child)\n";
    text += "- Pseudo-elements (::before, ::after)\n";
    text += "- @media queries (prefers-color-scheme, prefers-reduced-motion, max-width, min-width)\n";
    text += "- Modern CSS (oklch, color-mix, container queries)\n";
    text += "- transition with duration clamped to 10s max\n\n";

    text += "## Tips\n\n";
    for (const tip of tips) {
      text += `- ${tip}\n`;
    }

    text += "\n## How to use\n\n";
    text += "1. Write CSS targeting .pc-* classes listed above. Refer to the HTML structure to understand the DOM.\n";
    text += "2. Use submit_custom_css to apply your CSS to specific concerns.\n";
    text += "3. Each concern can have its own CSS. Submitting new CSS for a concern replaces the previous one.\n";
    text += "4. Use get_custom_css to see what's currently applied before making changes.\n";

    return { content: [{ type: "text" as const, text }] };
  }
);

// Tool: get_custom_css
server.tool(
  "get_custom_css",
  "Get the user's current custom CSS for all profile concerns. Shows which concerns have active CSS and what CSS is applied to each.",
  {},
  READS,
  async () => {
    const resp = await apiCall<{
      custom_styles: Record<string, { css: string; sanitizer_version: string; source_prompt?: string }>;
      active_concerns: string[];
    }>("GET", "/v1/profile/custom-css");

    if (resp.error) {
      return {
        content: [{
          type: "text" as const,
          text: `Failed to get custom CSS: ${resp.error.message}`,
        }],
        isError: true,
      };
    }

    const { custom_styles, active_concerns } = resp.data!;

    if (active_concerns.length === 0) {
      return {
        content: [{
          type: "text" as const,
          text: "No custom CSS is currently applied to any concerns. Use submit_custom_css to add styling, or get_customization_rules to see what's available.",
        }],
      };
    }

    let text = `Active custom CSS (${active_concerns.length} concerns):\n\n`;
    for (const concern of active_concerns) {
      const style = custom_styles[concern];
      text += `--- ${concern} ---\n`;
      text += `${style.css}\n\n`;
    }

    return { content: [{ type: "text" as const, text }] };
  }
);

// Tool: submit_custom_css
server.tool(
  "submit_custom_css",
  "Submit custom CSS for one or more profile concerns. The CSS is sanitized server-side and stored per-concern. Call get_customization_rules first to understand what selectors and properties are available. CSS must target .pc-* classes only. url() is blocked — use gradients and solid colors. @keyframes are supported.",
  {
    css: z
      .string()
      .describe(
        "The CSS to apply. Must target .pc-* classes (e.g., .pc-button, .pc-name). Selectors are auto-scoped. Can include @keyframes, @media, pseudo-classes, and pseudo-elements."
      ),
    concerns: z
      .array(z.string())
      .describe(
        "Which concerns this CSS applies to. Valid: background, buttons, header, name, bio, avatar, banner, cards, social, dividers, blocks"
      ),
    source_prompt: z
      .string()
      .optional()
      .describe("Optional: the prompt that generated this CSS (for audit trail)"),
  },
  CHANGES,
  async ({ css, concerns, source_prompt }) => {
    const resp = await apiCall<{
      success: boolean;
      concerns: string[];
      css_length: number;
    }>("PUT", "/v1/profile/custom-css", {
      css,
      concerns,
      source_prompt: source_prompt || undefined,
    });

    if (resp.error) {
      return {
        content: [{
          type: "text" as const,
          text: `Failed to submit CSS: ${resp.error.message}`,
        }],
        isError: true,
      };
    }

    return {
      content: [{
        type: "text" as const,
        text: `Custom CSS applied to ${resp.data!.concerns.join(", ")} (${resp.data!.css_length} bytes). The CSS will be sanitized and scoped on render. Open your profile page to see the result.`,
      }],
    };
  }
);

// Tool: reset_custom_css
server.tool(
  "reset_custom_css",
  "Reset/remove custom CSS for specific concerns, or all concerns at once. This removes the custom styling and reverts to the default appearance.",
  {
    concerns: z
      .array(z.string())
      .optional()
      .describe(
        "Which concerns to reset. Omit to reset ALL custom CSS. Valid: background, buttons, header, name, bio, avatar, banner, cards, social, dividers, blocks"
      ),
  },
  CHANGES,
  async ({ concerns }) => {
    const resp = await apiCall<{
      success: boolean;
      reset: string | string[];
    }>("DELETE", "/v1/profile/custom-css", {
      concerns: concerns || [],
    });

    if (resp.error) {
      return {
        content: [{
          type: "text" as const,
          text: `Failed to reset CSS: ${resp.error.message}`,
        }],
        isError: true,
      };
    }

    const resetLabel = Array.isArray(resp.data!.reset)
      ? resp.data!.reset.join(", ")
      : resp.data!.reset;

    return {
      content: [{
        type: "text" as const,
        text: `Custom CSS reset for: ${resetLabel}. Profile will revert to default styling for those concerns.`,
      }],
    };
  }
);

// ═══════════════════════════════════════════════════════
// Profile Management Tools
// ═══════════════════════════════════════════════════════

// Profile shape from the API
interface ProfileData {
  username?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  page_style?: Record<string, unknown>;
  blocks?: Array<{
    id: string;
    type: string;
    content: Record<string, unknown>;
    style?: Record<string, unknown>;
  }>;
  social_links?: Array<{ platform: string; url: string }>;
  custom_styles?: Record<string, { css: string; sanitizer_version: string }>;
  published?: boolean;
  seo_title?: string;
  seo_description?: string;
  og_image_url?: string;
  seo_noindex?: boolean;
  view_count?: number;
  created_at?: string;
  updated_at?: string;
}

// Theme presets live in @urlinks/profile-presets (shared with editor prototype).

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

// Helper: fetch current profile from API
// Lambda returns { data: { username, display_name, blocks, ..., exists } } — profile IS data, no inner wrapper.
async function fetchProfile(): Promise<ApiResponse<ProfileData>> {
  return apiCall<ProfileData>("GET", "/v1/profile");
}

// Helper: save profile to API (full replace)
async function saveProfile(profile: ProfileData): Promise<ApiResponse<ProfileData>> {
  return apiCall<ProfileData>("PUT", "/v1/profile", profile);
}

// Tool: get_alias
server.tool(
  "get_alias",
  "Check if the user has a username/alias set. An alias is required before a profile can be created — it becomes the public URL (urlinks.me/{alias}). Call this first when starting profile setup.",
  {},
  READS,
  async () => {
    const resp = await apiCall<{ has_alias: boolean; alias: string | null; profile_url?: string; message?: string }>("GET", "/v1/alias");

    if (resp.error) {
      return {
        content: [{ type: "text" as const, text: `Failed to check alias: ${resp.error.message}` }],
        isError: true,
      };
    }

    const d = resp.data!;
    if (d.has_alias) {
      return {
        content: [{ type: "text" as const, text: `Alias: ${d.alias}\nProfile URL: ${d.profile_url}` }],
      };
    } else {
      return {
        content: [{
          type: "text" as const,
          text: "No alias set yet. The user needs an alias before they can have a profile.\n\nUse create_alias to pick a username. Rules:\n- At least 5 characters\n- Letters and numbers only (a-z, 0-9)\n- Must be unique\n\nThe alias becomes their public URL: urlinks.me/{alias}",
        }],
      };
    }
  }
);

// Tool: create_alias
server.tool(
  "create_alias",
  "Create a username/alias for the user. This is REQUIRED before any profile operations — the alias becomes the public URL (urlinks.me/{alias}). Rules: 5+ characters, alphanumeric only, must be unique.",
  {
    alias: z.string().describe("The desired alias/username (e.g., 'johndoe', 'cooldev42'). Must be 5+ chars, alphanumeric only."),
  },
  ADDS,
  async ({ alias }) => {
    const resp = await apiCall<{ alias: string; profile_url: string; message: string }>("POST", "/v1/alias", { alias });

    if (resp.error) {
      return {
        content: [{ type: "text" as const, text: `Failed to create alias: ${resp.error.message}` }],
        isError: true,
      };
    }

    const d = resp.data!;
    return {
      content: [{ type: "text" as const, text: `${d.message}\n\nNext steps:\n1. Use update_profile to set a display name and bio\n2. Use add_block to add links\n3. Use set_theme to pick a visual style\n4. Use publish_profile to go live` }],
    };
  }
);

// Tool: update_alias
server.tool(
  "update_alias",
  "Change the user's alias/username to a new one. Their profile URL will change from urlinks.me/{old} to urlinks.me/{new}. The profile is automatically migrated.",
  {
    alias: z.string().describe("The new alias/username to switch to"),
  },
  CHANGES,
  async ({ alias }) => {
    const resp = await apiCall<{ old_alias: string; alias: string; profile_url: string; message: string }>("PUT", "/v1/alias", { alias });

    if (resp.error) {
      return {
        content: [{ type: "text" as const, text: `Failed to update alias: ${resp.error.message}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text" as const, text: resp.data!.message }],
    };
  }
);

// Tool: get_profile
server.tool(
  "get_profile",
  "Get the user's current profile — display name, bio, blocks, social links, theme, custom CSS, and published status. Requires an alias to be set first (use get_alias to check, create_alias to set one).",
  {},
  READS,
  async () => {
    const resp = await fetchProfile();

    if (resp.error) {
      // Detect "no alias" error from Lambda
      if (resp.error.message?.includes("alias") || resp.error.message?.includes("username")) {
        return {
          content: [{
            type: "text" as const,
            text: "No alias set — a username is required before creating a profile.\n\nUse get_alias to check the current state, then create_alias to pick a username.",
          }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text" as const, text: `Failed to get profile: ${resp.error.message}` }],
        isError: true,
      };
    }

    const profile = resp.data;
    if (!profile || (profile as ProfileData & { exists?: boolean }).exists === false) {
      return {
        content: [{
          type: "text" as const,
          text: `Profile for @${profile?.username || "?"} is empty. Use update_profile to set a display name and bio, then add_block to add links.`,
        }],
      };
    }

    return {
      content: [{ type: "text" as const, text: formatProfileSummary(profile) }],
    };
  }
);

// Tool: get_public_profile
server.tool(
  "get_public_profile",
  "View any user's public profile by username. Returns the published profile as visitors see it.",
  {
    username: z.string().describe("The username to look up (e.g., 'wolfo')"),
  },
  READS,
  async ({ username }) => {
    const resp = await apiCall<ProfileData>("GET", `/v1/profile/${encodeURIComponent(username)}`);

    if (resp.error) {
      return {
        content: [{ type: "text" as const, text: `Profile not found or not published: ${resp.error.message}` }],
        isError: true,
      };
    }

    const p = resp.data!;
    return {
      content: [{ type: "text" as const, text: `Public profile for @${username}:\n\n${formatProfileSummary(p)}` }],
    };
  }
);

// Tool: update_profile
server.tool(
  "update_profile",
  "Update the profile's basic info — display name, bio, or avatar URL. Only the fields you provide will change; everything else stays the same. This does NOT publish the profile — use publish_profile for that.",
  {
    display_name: z.string().optional().describe("Display name shown on the profile (max 100 chars)"),
    bio: z.string().optional().describe("Short bio text (max 160 chars)"),
    avatar_url: z.string().optional().describe("URL of the avatar image (must be an S3/CloudFront URL from upload)"),
  },
  CHANGES,
  async ({ display_name, bio, avatar_url }) => {
    // Fetch current profile
    const current = await fetchProfile();
    if (current.error) {
      return {
        content: [{ type: "text" as const, text: `Failed to fetch profile: ${current.error.message}` }],
        isError: true,
      };
    }

    const profile = current.data || {} as ProfileData;

    // Merge changes
    if (display_name !== undefined) profile.display_name = display_name;
    if (bio !== undefined) profile.bio = bio;
    if (avatar_url !== undefined) profile.avatar_url = avatar_url;

    const resp = await saveProfile(profile);
    if (resp.error) {
      return {
        content: [{ type: "text" as const, text: `Failed to update profile: ${resp.error.message}` }],
        isError: true,
      };
    }

    const changes = [
      display_name !== undefined ? `display name: "${display_name}"` : null,
      bio !== undefined ? `bio: "${bio}"` : null,
      avatar_url !== undefined ? "avatar updated" : null,
    ].filter(Boolean);

    return {
      content: [{ type: "text" as const, text: `Profile updated: ${changes.join(", ")}` }],
    };
  }
);

// Tool: add_block
server.tool(
  "add_block",
  "Add a block to the profile. Blocks appear in order — new blocks are added at the end by default, or at a specific position. Block types: link (clickable button), header (section heading), text (paragraph), divider (visual separator), image (full-width image), embed (YouTube/Spotify/SoundCloud), spacer (vertical gap), marquee (scrolling text).",
  {
    type: z.enum(["link", "header", "text", "divider", "image", "embed", "spacer", "marquee"])
      .describe("Block type"),
    label: z.string().optional()
      .describe("For link blocks: the button text. For header blocks: the heading text."),
    url: z.string().optional()
      .describe("For link blocks: the destination URL. For embed blocks: the video/music URL. For image blocks: the image source URL."),
    text: z.string().optional()
      .describe("For text blocks: the content (supports basic HTML: <b>, <i>, <a>, <br>). For marquee blocks: the scrolling text."),
    description: z.string().optional()
      .describe("For link blocks: optional subtitle shown below the label."),
    position: z.number().optional()
      .describe("Insert at this position (0-based). Omit to add at the end."),
  },
  ADDS,
  async ({ type, label, url, text, description, position }) => {
    const current = await fetchProfile();
    if (current.error) {
      return {
        content: [{ type: "text" as const, text: `Failed to fetch profile: ${current.error.message}` }],
        isError: true,
      };
    }

    const profile = current.data || {} as ProfileData;
    const blocks = [...(profile.blocks || [])];

    // Build content based on type
    const content: Record<string, unknown> = {};
    switch (type) {
      case "link":
        if (!url) return { content: [{ type: "text" as const, text: "Link blocks require a url parameter." }], isError: true };
        if (!label) return { content: [{ type: "text" as const, text: "Link blocks require a label parameter." }], isError: true };
        content.url = url;
        content.label = label;
        if (description) content.description = description;
        break;
      case "header":
        content.text = label || text || "Heading";
        content.level = 2;
        break;
      case "text":
        content.html = text || "";
        break;
      case "divider":
        content.variant = "line";
        break;
      case "image":
        content.src = url || "";
        content.alt = label || "";
        break;
      case "embed":
        if (!url) return { content: [{ type: "text" as const, text: "Embed blocks require a url parameter." }], isError: true };
        content.url = url;
        break;
      case "spacer":
        content.height = 24;
        break;
      case "marquee":
        content.text = text || label || "";
        content.speed = 5;
        content.direction = "left";
        break;
    }

    const block = { id: randomId(), type, content };

    if (position !== undefined && position >= 0 && position <= blocks.length) {
      blocks.splice(position, 0, block);
    } else {
      blocks.push(block);
    }

    profile.blocks = blocks;
    const resp = await saveProfile(profile);
    if (resp.error) {
      return {
        content: [{ type: "text" as const, text: `Failed to add block: ${resp.error.message}` }],
        isError: true,
      };
    }

    const pos = position !== undefined ? `at position ${position}` : `at the end (position ${blocks.length - 1})`;
    const desc = type === "link" ? `"${label}" -> ${url}` : type === "header" ? `"${content.text}"` : type;
    return {
      content: [{ type: "text" as const, text: `Added ${type} block ${pos}: ${desc}. Profile now has ${blocks.length} blocks.` }],
    };
  }
);

// Tool: remove_block
server.tool(
  "remove_block",
  "Remove a block from the profile by its position (0-based index). Use get_profile first to see the block list and positions.",
  {
    position: z.number().describe("The 0-based position of the block to remove. Use get_profile to see the list."),
  },
  CHANGES,
  async ({ position }) => {
    const current = await fetchProfile();
    if (current.error) {
      return {
        content: [{ type: "text" as const, text: `Failed to fetch profile: ${current.error.message}` }],
        isError: true,
      };
    }

    const profile = current.data || {} as ProfileData;
    const blocks = [...(profile.blocks || [])];

    if (position < 0 || position >= blocks.length) {
      return {
        content: [{ type: "text" as const, text: `Invalid position ${position}. Profile has ${blocks.length} blocks (0-${blocks.length - 1}).` }],
        isError: true,
      };
    }

    const removed = blocks.splice(position, 1)[0];
    profile.blocks = blocks;

    const resp = await saveProfile(profile);
    if (resp.error) {
      return {
        content: [{ type: "text" as const, text: `Failed to remove block: ${resp.error.message}` }],
        isError: true,
      };
    }

    const desc = removed.type === "link"
      ? `link "${(removed.content as Record<string, unknown>).label}"`
      : removed.type;
    return {
      content: [{ type: "text" as const, text: `Removed ${desc} from position ${position}. Profile now has ${blocks.length} blocks.` }],
    };
  }
);

// Tool: reorder_blocks
server.tool(
  "reorder_blocks",
  "Move a block from one position to another. Use get_profile to see current positions first.",
  {
    from: z.number().describe("Current position of the block to move (0-based)"),
    to: z.number().describe("New position for the block (0-based)"),
  },
  CHANGES,
  async ({ from, to }) => {
    const current = await fetchProfile();
    if (current.error) {
      return {
        content: [{ type: "text" as const, text: `Failed to fetch profile: ${current.error.message}` }],
        isError: true,
      };
    }

    const profile = current.data || {} as ProfileData;
    const blocks = [...(profile.blocks || [])];

    if (from < 0 || from >= blocks.length || to < 0 || to >= blocks.length) {
      return {
        content: [{ type: "text" as const, text: `Invalid positions. Profile has ${blocks.length} blocks (0-${blocks.length - 1}).` }],
        isError: true,
      };
    }

    const [block] = blocks.splice(from, 1);
    blocks.splice(to, 0, block);
    profile.blocks = blocks;

    const resp = await saveProfile(profile);
    if (resp.error) {
      return {
        content: [{ type: "text" as const, text: `Failed to reorder: ${resp.error.message}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text" as const, text: `Moved block from position ${from} to ${to}. Use get_profile to see the new order.` }],
    };
  }
);

// Tool: add_social_link
server.tool(
  "add_social_link",
  "Add a social link to the profile's social icon bar. Common platforms: twitter, instagram, github, linkedin, youtube, tiktok, facebook, twitch, discord, spotify, email, website.",
  {
    platform: z.string().describe("Platform name (e.g., 'twitter', 'instagram', 'github', 'linkedin', 'youtube')"),
    url: z.string().describe("The full URL to your profile on that platform (e.g., 'https://twitter.com/username')"),
  },
  ADDS,
  async ({ platform, url }) => {
    const current = await fetchProfile();
    if (current.error) {
      return {
        content: [{ type: "text" as const, text: `Failed to fetch profile: ${current.error.message}` }],
        isError: true,
      };
    }

    const profile = current.data || {} as ProfileData;
    const social = [...(profile.social_links || [])];

    // Replace if platform already exists, otherwise add
    const existing = social.findIndex((s) => s.platform.toLowerCase() === platform.toLowerCase());
    if (existing >= 0) {
      social[existing] = { platform: platform.toLowerCase(), url };
    } else {
      social.push({ platform: platform.toLowerCase(), url });
    }

    profile.social_links = social;
    const resp = await saveProfile(profile);
    if (resp.error) {
      return {
        content: [{ type: "text" as const, text: `Failed to add social link: ${resp.error.message}` }],
        isError: true,
      };
    }

    const verb = existing >= 0 ? "Updated" : "Added";
    return {
      content: [{ type: "text" as const, text: `${verb} ${platform} social link. Profile now has ${social.length} social links.` }],
    };
  }
);

// Tool: remove_social_link
server.tool(
  "remove_social_link",
  "Remove a social link by platform name.",
  {
    platform: z.string().describe("Platform to remove (e.g., 'twitter', 'instagram')"),
  },
  CHANGES,
  async ({ platform }) => {
    const current = await fetchProfile();
    if (current.error) {
      return {
        content: [{ type: "text" as const, text: `Failed to fetch profile: ${current.error.message}` }],
        isError: true,
      };
    }

    const profile = current.data || {} as ProfileData;
    const social = (profile.social_links || []).filter(
      (s) => s.platform.toLowerCase() !== platform.toLowerCase()
    );

    if (social.length === (profile.social_links || []).length) {
      return {
        content: [{ type: "text" as const, text: `No ${platform} social link found to remove.` }],
        isError: true,
      };
    }

    profile.social_links = social;
    const resp = await saveProfile(profile);
    if (resp.error) {
      return {
        content: [{ type: "text" as const, text: `Failed to remove social link: ${resp.error.message}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text" as const, text: `Removed ${platform} social link. ${social.length} social links remaining.` }],
    };
  }
);

// Tool: set_theme
server.tool(
  "set_theme",
  "Apply a visual theme preset. Uses @urlinks/profile-presets (paper, aurora, galaxy, …). Legacy names (clean, cream, dark, …) are aliases. Prefer apply_theme for the same behavior. You can also set custom colors as overrides.",
  {
    theme: z.string().optional()
      .describe(`Theme preset name. One of: ${listThemeNames().join(", ")} (legacy aliases also work)`),
    background_color: z.string().optional()
      .describe("Custom background color (hex, e.g., '#1a1a1a'). Overrides theme preset if both provided."),
    text_color: z.string().optional()
      .describe("Custom default text color (hex). Overrides theme."),
    font: z.string().optional()
      .describe("Font family name (e.g., 'Inter', 'Fredoka', 'Poppins', 'Playfair Display'). Overrides theme."),
    button_style: z.enum(["card", "fill", "outline", "soft", "shadow", "rounded-fill", "rounded-outline"]).optional()
      .describe("Button visual style. Overrides theme."),
    name_color: z.string().optional()
      .describe("Display name color (hex). Overrides theme."),
  },
  CHANGES,
  async ({ theme, background_color, text_color, font, button_style, name_color }) => {
    const current = await fetchProfile();
    if (current.error) {
      return {
        content: [{ type: "text" as const, text: `Failed to fetch profile: ${current.error.message}` }],
        isError: true,
      };
    }

    const profile = current.data || {} as ProfileData;
    const pageStyle = { ...(profile.page_style || {}) } as Record<string, unknown>;

    // Apply theme preset first (if specified)
    if (theme) {
      const preset = getThemePreset(theme);
      if (!preset) {
        return {
          content: [{
            type: "text" as const,
            text: `Unknown theme "${theme}". Use list_themes_v2 or list_profile_style_options. Available: ${listThemeNames().join(", ")}`,
          }],
          isError: true,
        };
      }
      Object.assign(pageStyle, preset);
    }

    // Apply individual overrides on top
    if (background_color) pageStyle.backgroundColor = background_color;
    if (text_color) pageStyle.defaultTextColor = text_color;
    if (font) pageStyle.defaultFontFamily = font;
    if (button_style) pageStyle.buttonStyle = button_style;
    if (name_color) pageStyle.nameColor = name_color;

    profile.page_style = pageStyle;
    const resp = await saveProfile(profile);
    if (resp.error) {
      return {
        content: [{ type: "text" as const, text: `Failed to apply theme: ${resp.error.message}` }],
        isError: true,
      };
    }

    const desc = theme
      ? `Applied "${theme}" theme${background_color || text_color || font || button_style || name_color ? " with custom overrides" : ""}.`
      : "Applied custom style settings.";
    return {
      content: [{ type: "text" as const, text: `${desc} Background: ${pageStyle.backgroundColor}, font: ${pageStyle.defaultFontFamily}, buttons: ${pageStyle.buttonStyle}.` }],
    };
  }
);

// Tool: publish_profile
server.tool(
  "publish_profile",
  "Publish or unpublish the profile. A published profile is visible at urlinks.me/{username}. An unpublished profile is a draft — only the owner can see it in the editor.",
  {
    published: z.boolean().optional().describe("Set to true to publish, false to unpublish. Defaults to true."),
  },
  CHANGES,
  async ({ published }) => {
    const pub = published !== undefined ? published : true;
    const resp = await apiCall<{ username: string; published: boolean }>(
      "POST", "/v1/profile/publish", { published: pub }
    );

    if (resp.error) {
      return {
        content: [{ type: "text" as const, text: `Failed to ${pub ? "publish" : "unpublish"}: ${resp.error.message}` }],
        isError: true,
      };
    }

    const { username } = resp.data!;
    if (pub) {
      return {
        content: [{ type: "text" as const, text: `Profile published! Live at: urlinks.me/${username}` }],
      };
    }
    return {
      content: [{ type: "text" as const, text: `Profile unpublished. It's now a draft — visitors will see a 404.` }],
    };
  }
);

// Tool: list_themes
server.tool(
  "list_themes",
  "List theme presets. Prefer list_themes_v2 for the full canonical catalog. Use set_theme or apply_theme to apply one.",
  {},
  READS,
  async () => {
    return { content: [{ type: "text" as const, text: describeThemesText() }] };
  }
);

// Tool: get_profile_analytics
server.tool(
  "get_profile_analytics",
  "Get analytics for the user's profile — total views, per-link click counts, and daily breakdowns. Shows which links are getting the most engagement.",
  {
    days: z.number().optional().describe("Number of days of history to include (default: 30)"),
  },
  READS,
  async ({ days }) => {
    const d = days ?? 30;
    const resp = await apiCall<{
      username: string;
      period_days: number;
      views: { total: number; last_view: number | null; daily: Array<{ day: string; count: number }> };
      blocks: Array<{ block_id: string; label: string; total_clicks: number; last_click: number | null; daily: Array<{ day: string; count: number }> }>;
      total_link_clicks: number;
    }>("GET", `/v1/profile/analytics?days=${d}`);

    if (resp.error) {
      return {
        content: [{ type: "text" as const, text: `Failed to get analytics: ${resp.error.message}` }],
        isError: true,
      };
    }

    const a = resp.data!;
    const lines: string[] = [];
    lines.push(`# Profile Analytics (@${a.username})`);
    lines.push(`Period: last ${a.period_days} days\n`);

    lines.push(`## Profile Views`);
    lines.push(`Total: ${a.views.total}`);
    if (a.views.last_view) {
      lines.push(`Last view: ${new Date(a.views.last_view).toISOString()}`);
    }
    if (a.views.daily.length > 0) {
      lines.push(`Recent days: ${a.views.daily.slice(0, 7).map((d) => `${d.day}: ${d.count}`).join(", ")}`);
    }

    lines.push(`\n## Link Clicks`);
    lines.push(`Total clicks across all links: ${a.total_link_clicks}`);
    if (a.blocks.length > 0) {
      lines.push("");
      for (const b of a.blocks) {
        const lastStr = b.last_click ? `, last: ${new Date(b.last_click).toISOString().split("T")[0]}` : "";
        lines.push(`- "${b.label}": ${b.total_clicks} clicks${lastStr}`);
        if (b.daily.length > 0) {
          lines.push(`  Daily: ${b.daily.slice(0, 7).map((d) => `${d.day}: ${d.count}`).join(", ")}`);
        }
      }
    } else {
      lines.push("No link clicks recorded yet.");
    }

    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
    };
  }
);

  registerProfileParityTools(server, { fetchProfile, saveProfile, randomId });
}
