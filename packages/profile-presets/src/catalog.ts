/** Animated background scene keys (see profileStyles.SCENES). */
export const BACKGROUND_SCENES: { key: string; label: string; dark: boolean }[] = [
  { key: "aurora", label: "Aurora", dark: false },
  { key: "haze", label: "Haze", dark: false },
  { key: "bloom", label: "Bloom", dark: false },
  { key: "galaxy", label: "Galaxy", dark: true },
  { key: "neon", label: "Neon", dark: true },
  { key: "dusk", label: "Dusk", dark: true },
];

export const BACKGROUND_TEXTURES = ["none", "grain", "dots", "grid"] as const;

export const BUTTON_STYLES = [
  "card", "fill", "outline", "soft", "shadow", "rounded-fill", "rounded-outline",
] as const;

export const HEADER_LAYOUTS = ["normal", "hero"] as const;
export const PROFILE_LAYOUTS = ["standard", "gallery"] as const;
export const AVATAR_SHAPES = ["circle", "rounded", "square"] as const;
export const CONTENT_ALIGNS = ["left", "center"] as const;
export const SOCIAL_ICON_STYLES = ["brand", "theme", "outline"] as const;

export const LINK_ANIMATIONS = ["none", "shake", "bounce", "pulse", "wobble", "tada", "glow"] as const;
export const HOVER_EFFECTS = ["none", "lift", "glow", "press", "scale", "shadow-grow"] as const;

export const BLOCK_TYPES = [
  "link", "header", "text", "divider", "image", "embed", "spacer", "marquee",
  "gallery", "social_icons", "countdown", "product",
] as const;

export type EmbedPreset = "map" | "booking" | "form";

/** Embed providers mirrored from apps/web/lib/embeds.ts (static catalog for MCP). */
export const EMBED_PROVIDERS: { id: string; label: string; example: string }[] = [
  { id: "youtube", label: "YouTube", example: "https://www.youtube.com/watch?v=..." },
  { id: "vimeo", label: "Vimeo", example: "https://vimeo.com/..." },
  { id: "spotify", label: "Spotify", example: "https://open.spotify.com/track/..." },
  { id: "soundcloud", label: "SoundCloud", example: "https://soundcloud.com/..." },
  { id: "applemusic", label: "Apple Music", example: "https://music.apple.com/..." },
  { id: "tiktok", label: "TikTok", example: "https://www.tiktok.com/@user/video/..." },
  { id: "googlemaps", label: "Map", example: "https://maps.google.com/?q=Address" },
  { id: "calendly", label: "Calendly", example: "https://calendly.com/username" },
  { id: "calcom", label: "Cal.com", example: "https://cal.com/username" },
  { id: "typeform", label: "Typeform", example: "https://form.typeform.com/to/..." },
  { id: "tally", label: "Tally", example: "https://tally.so/r/..." },
  { id: "googleforms", label: "Google Forms", example: "https://docs.google.com/forms/d/..." },
  { id: "loom", label: "Loom", example: "https://www.loom.com/share/..." },
  { id: "figma", label: "Figma", example: "https://www.figma.com/file/..." },
  { id: "notion", label: "Notion", example: "https://notion.site/..." },
];
