/**
 * MCP profile tools aligned with the editor prototype + @urlinks/profile-presets.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  getThemePreset,
  listThemeNames,
  describeThemesText,
  PROFILE_FONTS,
  BACKGROUND_SCENES,
  BACKGROUND_TEXTURES,
  BACKGROUND_GRADIENTS,
  BUTTON_GRADIENTS,
  BUTTON_STYLES,
  HEADER_LAYOUTS,
  PROFILE_LAYOUTS,
  AVATAR_SHAPES,
  CONTENT_ALIGNS,
  SOCIAL_ICON_STYLES,
  LINK_ANIMATIONS,
  HOVER_EFFECTS,
  BLOCK_TYPES,
  EMBED_PROVIDERS,
  type EmbedPreset,
} from "@urlinks/profile-presets";
import { READS, ADDS, CHANGES } from "./annotations";

export interface ProfileData {
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
  view_count?: number;
}

interface ApiResponse<T = unknown> {
  data?: T;
  error?: { message: string; status: number; code?: string };
}

export interface ProfileParityDeps {
  fetchProfile: () => Promise<ApiResponse<ProfileData>>;
  saveProfile: (profile: ProfileData) => Promise<ApiResponse<ProfileData>>;
  randomId: () => string;
}

const gradientSchema = z.object({
  type: z.string(),
  angle: z.number().optional(),
  stops: z.array(z.object({ color: z.string(), position: z.number().min(0).max(1) })),
});

const blockTypeEnum = z.enum([
  "link", "header", "text", "divider", "image", "embed", "spacer", "marquee",
  "gallery", "social_icons", "countdown", "product",
]);

export function formatProfileSummary(p: ProfileData): string {
  const lines: string[] = [];
  lines.push(`Display name: ${p.display_name || "(not set)"}`);
  lines.push(`Bio: ${p.bio || "(not set)"}`);
  lines.push(`Avatar: ${p.avatar_url ? "uploaded" : "none"}`);
  lines.push(`Published: ${p.published ? "yes" : "no"}`);
  lines.push(`Views: ${p.view_count ?? 0}`);

  const ps = p.page_style as Record<string, unknown> | undefined;
  if (ps) {
    const parts = [
      `bg=${ps.backgroundColor || "?"}`,
      ps.backgroundScene ? `scene=${ps.backgroundScene}` : null,
      ps.backgroundGradient ? "gradient" : null,
      `font=${ps.defaultFontFamily || "?"}`,
      `buttons=${ps.buttonStyle || "?"}`,
      ps.headerLayout ? `header=${ps.headerLayout}` : null,
      ps.socialIconStyle ? `socialIcons=${ps.socialIconStyle}` : null,
    ].filter(Boolean);
    lines.push(`\nPage style: ${parts.join(", ")}`);
  }

  const blocks = p.blocks || [];
  if (blocks.length > 0) {
    lines.push(`\nBlocks (${blocks.length}):`);
    blocks.forEach((b, i) => {
      const c = b.content;
      const extras: string[] = [];
      if (b.style?.animation && b.style.animation !== "none") extras.push(`anim=${b.style.animation}`);
      if (c.layout === "feature") extras.push("feature");
      const suffix = extras.length ? ` [${extras.join(", ")}]` : "";
      if (b.type === "link") lines.push(`  ${i}. link: "${c.label || ""}" -> ${c.url || ""}${suffix}`);
      else if (b.type === "countdown") lines.push(`  ${i}. countdown: ${c.targetISO || "?"}`);
      else if (b.type === "product") lines.push(`  ${i}. product: "${c.title || ""}"`);
      else lines.push(`  ${i}. ${b.type}${suffix}`);
    });
  } else {
    lines.push("\nBlocks: none");
  }

  const social = p.social_links || [];
  if (social.length > 0) {
    lines.push(`\nSocial links (${social.length}): ${social.map((s) => s.platform).join(", ")}`);
  }

  const css = p.custom_styles || {};
  const activeConcerns = Object.keys(css).filter((k) => css[k]?.css);
  if (activeConcerns.length > 0) {
    lines.push(`\nCustom CSS active on: ${activeConcerns.join(", ")}`);
  }

  return lines.join("\n");
}

function mergePageStyle(current: Record<string, unknown>, patch: Record<string, unknown>) {
  return { ...current, ...patch };
}

function syncTopLevel(profile: ProfileData, ps: Record<string, unknown>) {
  if (typeof ps.displayName === "string") profile.display_name = ps.displayName;
  if (typeof ps.bio === "string") profile.bio = ps.bio;
  if (typeof ps.avatarUrl === "string") profile.avatar_url = ps.avatarUrl;
}

export function buildBlockContent(
  type: z.infer<typeof blockTypeEnum>,
  args: {
    label?: string;
    url?: string;
    text?: string;
    description?: string;
    embed_preset?: EmbedPreset;
    target_iso?: string;
    price?: string;
    currency?: string;
    title?: string;
  },
): Record<string, unknown> {
  switch (type) {
    case "link":
      return { url: args.url || "", label: args.label || "New link", ...(args.description ? { description: args.description } : {}) };
    case "header":
      return { text: args.label || args.text || "Heading", level: 2 };
    case "text":
      return { html: args.text || "" };
    case "divider":
      return { variant: "line" };
    case "image":
      return { src: args.url || "", alt: args.label || "" };
    case "embed":
      if (args.embed_preset === "map") return { url: args.url || "", provider: "googlemaps", kind: "map" };
      if (args.embed_preset === "booking") return { url: args.url || "", kind: "booking" };
      if (args.embed_preset === "form") return { url: args.url || "", kind: "form" };
      return { url: args.url || "" };
    case "spacer":
      return { height: 24 };
    case "marquee":
      return { text: args.text || args.label || "", speed: 5, direction: "left" };
    case "gallery":
      return { tiles: [], cols_mobile: 4, cols_desktop: 6, gap: "tight", shadow: "none" };
    case "social_icons":
      return { platforms: [] };
    case "countdown":
      return {
        targetISO: args.target_iso || new Date(Date.now() + 7 * 86400000).toISOString(),
        label: args.label || args.text || "Launching in",
      };
    case "product":
      return {
        title: args.title || args.label || "Product name",
        price: args.price || "29",
        currency: args.currency || "$",
        ctaLabel: "Buy now",
        url: args.url || "",
      };
    default:
      return {};
  }
}

export function registerProfileParityTools(server: McpServer, deps: ProfileParityDeps): void {
  const { fetchProfile, saveProfile, randomId } = deps;

  server.tool(
    "list_profile_style_options",
    "Catalog of profile style options — fonts, scenes, gradients, animations, block types, embed providers.",
    {},
    READS,
    async () => {
      const lines = [
        "# Profile style options",
        "\n## Themes\n" + listThemeNames().join(", "),
        "\n## Fonts\n" + PROFILE_FONTS.join(", "),
        "\n## Scenes\n" + BACKGROUND_SCENES.map((s) => s.key).join(", "),
        "\n## Textures\n" + BACKGROUND_TEXTURES.join(", "),
        "\n## BG gradients\n" + BACKGROUND_GRADIENTS.map((g) => g.name).join(", "),
        "\n## Button gradients\n" + BUTTON_GRADIENTS.map((g) => g.name).join(", "),
        "\n## Button styles\n" + BUTTON_STYLES.join(", "),
        "\n## Social icon styles\n" + SOCIAL_ICON_STYLES.join(", "),
        "\n## Link animations\n" + LINK_ANIMATIONS.join(", "),
        "\n## Hover effects\n" + HOVER_EFFECTS.join(", "),
        "\n## Block types\n" + BLOCK_TYPES.join(", "),
        "\n## Layouts\nheader: " + HEADER_LAYOUTS.join(", ") + " | profile: " + PROFILE_LAYOUTS.join(", "),
        "\n## Embed providers\n" + EMBED_PROVIDERS.map((p) => `${p.id}: ${p.example}`).join("\n"),
      ];
      return { content: [{ type: "text" as const, text: lines.join("\n") }] };
    },
  );

  server.tool(
    "update_page_style",
    "Merge visual/layout fields into page_style. Syncs displayName/bio/avatarUrl to top-level profile when set.",
    {
      page_style: z.record(z.string(), z.unknown()).optional().describe("Raw page_style fields (camelCase keys) merged as-is. The named arguments below override the same fields."),
      background_color: z.string().optional().describe("Page background color (CSS color, e.g. #F4F1EA)."),
      background_scene: z.enum(["aurora", "haze", "bloom", "galaxy", "neon", "dusk"]).optional().describe("Animated background scene. Replaces any background gradient or image."),
      background_texture: z.enum(["none", "grain", "dots", "grid"]).optional().describe("Texture overlaid on the background."),
      background_gradient: gradientSchema.optional().describe("Background gradient: type, optional angle, and color stops at positions 0-1. Replaces any scene or image."),
      clear_background_scene: z.boolean().optional().describe("Set true to remove the current background scene."),
      reduce_motion: z.boolean().optional().describe("Set true to keep animated background scenes still."),
      background_scrim: z.boolean().optional().describe("Darkening layer over photo backgrounds for legibility. On by default; set false to remove it."),
      default_text_color: z.string().optional().describe("Default text color for the page (CSS color)."),
      name_color: z.string().optional().describe("Display name color (CSS color)."),
      bio_color: z.string().optional().describe("Bio text color (CSS color)."),
      default_font: z.string().optional().describe("Body font. See list_profile_style_options for available fonts."),
      name_font: z.string().optional().describe("Display name font. See list_profile_style_options for available fonts."),
      button_style: z.enum(["card", "fill", "outline", "soft", "shadow", "rounded-fill", "rounded-outline"]).optional().describe("Link button style."),
      button_color: z.string().optional().describe("Link button color (CSS color)."),
      button_text_color: z.string().optional().describe("Link button text color (CSS color)."),
      button_radius: z.number().optional().describe("Link button corner radius in px (default 10)."),
      header_layout: z.enum(["normal", "hero"]).optional().describe("'hero' shows a larger, centered avatar and name; 'normal' is the default."),
      profile_layout: z.enum(["standard", "gallery"]).optional().describe("'gallery' shows only gallery blocks; 'standard' shows every block."),
      banner_full_bleed: z.boolean().optional().describe("Banner spans the full page width by default; set false to fit it to the content column."),
      avatar_shape: z.enum(["circle", "rounded", "square"]).optional().describe("Avatar image shape."),
      content_align: z.enum(["left", "center"]).optional().describe("Alignment of the page content."),
      max_width: z.number().optional().describe("Maximum width of the content column in px (default 600)."),
      block_gap: z.number().optional().describe("Space between blocks in px."),
      social_icon_style: z.enum(["brand", "theme", "outline"]).optional().describe("Social icons in brand colors, theme colors, or outline."),
      show_link_icons: z.boolean().optional().describe("Show site icons on link buttons (default true)."),
      name_stroke_width: z.number().min(0).max(3).optional().describe("Outline width around the display name letters, 0-3 px."),
      name_stroke_color: z.string().optional().describe("Display name outline color (CSS color)."),
      bio_stroke_width: z.number().min(0).max(3).optional().describe("Outline width around the bio letters, 0-3 px."),
      bio_stroke_color: z.string().optional().describe("Bio outline color (CSS color)."),
      display_name: z.string().optional().describe("Name shown at the top of the profile."),
      bio: z.string().optional().describe("Short bio shown under the name."),
      avatar_url: z.string().optional().describe("Avatar image URL."),
      banner_url: z.string().optional().describe("Banner image URL."),
    },
    CHANGES,
    async (args) => {
      const current = await fetchProfile();
      if (current.error) {
        return { content: [{ type: "text" as const, text: current.error.message }], isError: true };
      }
      const profile = current.data || {};
      const ps = { ...(profile.page_style || {}) } as Record<string, unknown>;
      const patch: Record<string, unknown> = { ...(args.page_style || {}) };

      if (args.background_color !== undefined) patch.backgroundColor = args.background_color;
      if (args.background_scene !== undefined) {
        patch.backgroundScene = args.background_scene;
        patch.backgroundGradient = undefined;
        patch.backgroundImage = "";
      }
      if (args.clear_background_scene) patch.backgroundScene = undefined;
      if (args.background_texture !== undefined) patch.backgroundTexture = args.background_texture;
      if (args.background_gradient !== undefined) {
        patch.backgroundGradient = args.background_gradient;
        patch.backgroundScene = undefined;
        patch.backgroundImage = "";
      }
      if (args.reduce_motion !== undefined) patch.reduceMotion = args.reduce_motion;
      if (args.background_scrim !== undefined) patch.backgroundScrim = args.background_scrim;
      if (args.default_text_color !== undefined) patch.defaultTextColor = args.default_text_color;
      if (args.name_color !== undefined) patch.nameColor = args.name_color;
      if (args.bio_color !== undefined) patch.bioColor = args.bio_color;
      if (args.default_font !== undefined) patch.defaultFontFamily = args.default_font;
      if (args.name_font !== undefined) patch.nameFontFamily = args.name_font;
      if (args.button_style !== undefined) patch.buttonStyle = args.button_style;
      if (args.button_color !== undefined) patch.buttonColor = args.button_color;
      if (args.button_text_color !== undefined) patch.buttonTextColor = args.button_text_color;
      if (args.button_radius !== undefined) patch.buttonRadius = args.button_radius;
      if (args.header_layout !== undefined) patch.headerLayout = args.header_layout;
      if (args.profile_layout !== undefined) patch.profileLayout = args.profile_layout;
      if (args.banner_full_bleed !== undefined) patch.bannerFullBleed = args.banner_full_bleed;
      if (args.avatar_shape !== undefined) patch.avatarShape = args.avatar_shape;
      if (args.content_align !== undefined) patch.contentAlign = args.content_align;
      if (args.max_width !== undefined) patch.maxWidth = args.max_width;
      if (args.block_gap !== undefined) patch.blockGap = args.block_gap;
      if (args.social_icon_style !== undefined) patch.socialIconStyle = args.social_icon_style;
      if (args.show_link_icons !== undefined) patch.showLinkIcons = args.show_link_icons;
      if (args.name_stroke_width !== undefined) patch.nameStrokeWidth = args.name_stroke_width;
      if (args.name_stroke_color !== undefined) patch.nameStrokeColor = args.name_stroke_color;
      if (args.bio_stroke_width !== undefined) patch.bioStrokeWidth = args.bio_stroke_width;
      if (args.bio_stroke_color !== undefined) patch.bioStrokeColor = args.bio_stroke_color;
      if (args.display_name !== undefined) patch.displayName = args.display_name;
      if (args.bio !== undefined) patch.bio = args.bio;
      if (args.avatar_url !== undefined) patch.avatarUrl = args.avatar_url;
      if (args.banner_url !== undefined) patch.bannerUrl = args.banner_url;

      profile.page_style = mergePageStyle(ps, patch);
      syncTopLevel(profile, profile.page_style as Record<string, unknown>);

      const resp = await saveProfile(profile);
      if (resp.error) {
        return { content: [{ type: "text" as const, text: resp.error.message }], isError: true };
      }
      return { content: [{ type: "text" as const, text: `Page style updated.\n${formatProfileSummary(resp.data || profile)}` }] };
    },
  );

  server.tool(
    "update_block",
    "Update block content/style by position or block_id.",
    {
      position: z.number().optional().describe("0-based index of the block to update (see get_profile). Give this or block_id."),
      block_id: z.string().optional().describe("ID of the block to update. Give this or position."),
      content: z.record(z.string(), z.unknown()).optional().describe("Fields merged into the block's content, e.g. { label, url } for a link."),
      style: z.record(z.string(), z.unknown()).optional().describe("Fields merged into the block's style."),
      link_layout: z.enum(["standard", "feature"]).optional().describe("Link blocks: 'feature' shows a large image card (needs an image on the link); 'standard' is a normal button."),
      link_animation: z.enum(["none", "shake", "bounce", "pulse", "wobble", "tada", "glow"]).optional().describe("Attention animation on the block."),
      hover_effect: z.enum(["none", "lift", "glow", "press", "scale", "shadow-grow"]).optional().describe("Effect when the pointer hovers over the block."),
    },
    CHANGES,
    async ({ position, block_id, content, style, link_layout, link_animation, hover_effect }) => {
      if (position === undefined && !block_id) {
        return { content: [{ type: "text" as const, text: "Provide position or block_id." }], isError: true };
      }
      const current = await fetchProfile();
      if (current.error) {
        return { content: [{ type: "text" as const, text: current.error.message }], isError: true };
      }
      const profile = current.data || {};
      const blocks = [...(profile.blocks || [])];
      let idx = position;
      if (block_id) {
        idx = blocks.findIndex((b) => b.id === block_id);
        if (idx < 0) return { content: [{ type: "text" as const, text: `Block "${block_id}" not found.` }], isError: true };
      }
      if (idx === undefined || idx < 0 || idx >= blocks.length) {
        return { content: [{ type: "text" as const, text: `Invalid position. ${blocks.length} blocks.` }], isError: true };
      }

      const block = {
        ...blocks[idx],
        content: { ...blocks[idx].content },
        style: { ...(blocks[idx].style || {}) },
      };
      if (content) Object.assign(block.content, content);
      if (link_layout) Object.assign(block.content, { layout: link_layout });
      if (style) block.style = { ...block.style, ...style };
      if (link_animation !== undefined) block.style = { ...block.style, animation: link_animation };
      if (hover_effect !== undefined) block.style = { ...block.style, hoverEffect: hover_effect };

      blocks[idx] = block;
      profile.blocks = blocks;
      const resp = await saveProfile(profile);
      if (resp.error) {
        return { content: [{ type: "text" as const, text: resp.error.message }], isError: true };
      }
      return { content: [{ type: "text" as const, text: `Updated block ${idx}.\n${formatProfileSummary(resp.data || profile)}` }] };
    },
  );

  server.tool(
    "add_block_v2",
    "Add a block with full prototype parity (gallery, countdown, product, embed presets).",
    {
      type: blockTypeEnum.describe("Kind of block to add."),
      label: z.string().optional().describe("Link button text (required for link blocks). Also used as header text, image alt text, or countdown label."),
      url: z.string().optional().describe("Link destination (required for link blocks), or the image, embed, or product checkout URL."),
      text: z.string().optional().describe("Text for text, header, marquee, and countdown blocks."),
      description: z.string().optional().describe("Optional subtitle under a link block's label."),
      title: z.string().optional().describe("Product name (product blocks)."),
      price: z.string().optional().describe("Product price, e.g. \"29\" (product blocks)."),
      currency: z.string().optional().describe("Currency symbol shown with the price, e.g. \"$\" (product blocks)."),
      target_iso: z.string().optional().describe("Countdown end as an ISO 8601 date-time (countdown blocks). Defaults to one week from now."),
      embed_preset: z.enum(["map", "booking", "form"]).optional().describe("Embed blocks: a Google Maps map, a booking page, or a form."),
      position: z.number().optional().describe("0-based index to insert the block at. Defaults to the end."),
      style: z.record(z.string(), z.unknown()).optional().describe("Style fields for the new block."),
      link_layout: z.enum(["standard", "feature"]).optional().describe("Link blocks: 'feature' shows a large image card; 'standard' is a normal button."),
    },
    ADDS,
    async (args) => {
      if (args.type === "link" && (!args.url || !args.label)) {
        return { content: [{ type: "text" as const, text: "Link blocks require url and label." }], isError: true };
      }
      const current = await fetchProfile();
      if (current.error) {
        return { content: [{ type: "text" as const, text: current.error.message }], isError: true };
      }
      const profile = current.data || {};
      const blocks = [...(profile.blocks || [])];
      const content = buildBlockContent(args.type, args);
      if (args.link_layout && args.type === "link") content.layout = args.link_layout;

      const block = {
        id: randomId(),
        type: args.type,
        content,
        ...(args.style ? { style: args.style } : {}),
      };

      if (args.position !== undefined && args.position >= 0 && args.position <= blocks.length) {
        blocks.splice(args.position, 0, block);
      } else {
        blocks.push(block);
      }

      profile.blocks = blocks;
      const resp = await saveProfile(profile);
      if (resp.error) {
        return { content: [{ type: "text" as const, text: resp.error.message }], isError: true };
      }
      return {
        content: [{ type: "text" as const, text: `Added ${args.type} (id ${block.id}).\n${formatProfileSummary(resp.data || profile)}` }],
      };
    },
  );

  server.tool(
    "apply_theme",
    "Apply a canonical theme preset (paper, aurora, galaxy, …). Legacy names are aliases.",
    { theme: z.string().describe("Theme preset name, e.g. paper, aurora, galaxy. See list_themes_v2.") },
    CHANGES,
    async ({ theme }) => {
      const preset = getThemePreset(theme);
      if (!preset) {
        return { content: [{ type: "text" as const, text: `Unknown theme "${theme}".` }], isError: true };
      }
      const current = await fetchProfile();
      if (current.error) {
        return { content: [{ type: "text" as const, text: current.error.message }], isError: true };
      }
      const profile = current.data || {};
      profile.page_style = mergePageStyle((profile.page_style || {}) as Record<string, unknown>, preset as Record<string, unknown>);
      const resp = await saveProfile(profile);
      if (resp.error) {
        return { content: [{ type: "text" as const, text: resp.error.message }], isError: true };
      }
      const ps = profile.page_style as Record<string, unknown>;
      return {
        content: [{ type: "text" as const, text: `Applied "${theme}". bg=${ps.backgroundColor}, scene=${ps.backgroundScene || "none"}` }],
      };
    },
  );

  server.tool(
    "list_themes_v2",
    "List canonical theme presets (editor prototype).",
    {},
    READS,
    async () => ({ content: [{ type: "text" as const, text: describeThemesText() }] }),
  );
}
