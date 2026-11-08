import type { ProfilePageStyle } from "@urlinks/types";

export type ThemePreset = {
  key: string;
  name: string;
  category: string;
  desc?: string;
  /** [background, text, accent] for picker chips */
  swatch: [string, string, string];
  patch: Partial<ProfilePageStyle>;
};

/** Full reset fields so applying a theme replaces stale values from the previous one. */
const CLEAR_BG: Partial<ProfilePageStyle> = {
  backgroundImage: undefined,
  backgroundGradient: undefined,
  backgroundScene: undefined,
  backgroundTexture: undefined,
};

function t(
  key: string,
  name: string,
  category: string,
  bg: string,
  text: string,
  accent: string,
  patch: Partial<ProfilePageStyle>,
  desc?: string,
): ThemePreset {
  return { key, name, category, desc, swatch: [bg, text, accent], patch };
}

/** User-facing vibe categories — how people pick a starting point, not how the engine works. */
export const THEME_CATEGORY_ORDER = [
  "Professional",
  "Inviting",
  "Fun",
  "Bold",
  "Calm",
] as const;

export const THEME_PRESETS: ThemePreset[] = [
  // ─── Professional ───
  t("paper", "Paper", "Professional", "#F7F5F1", "#2D2B2E", "#2D2B2E",
    { ...CLEAR_BG, backgroundColor: "#F7F5F1", backgroundTexture: "grain", defaultTextColor: "#2D2B2E", defaultFontFamily: "DM Sans", nameFontFamily: "Sora", nameColor: undefined, buttonStyle: "card", buttonColor: "#2D2B2E", buttonTextColor: "#FFFFFF", buttonRadius: 14, maxWidth: 600, blockGap: 14, bannerFullBleed: true, avatarShape: "circle", contentAlign: "center" },
    "Clean default — works for anything"),
  t("mono", "Mono", "Professional", "#FFFFFF", "#111111", "#111111",
    { ...CLEAR_BG, backgroundColor: "#FFFFFF", backgroundTexture: "none", defaultTextColor: "#111111", defaultFontFamily: "Space Grotesk", nameColor: "#000000", buttonStyle: "outline", buttonColor: "#111111", buttonTextColor: "#111111", buttonRadius: 4, avatarShape: "square", contentAlign: "center" },
    "Sharp and minimal"),
  t("editorial", "Editorial", "Professional", "#F7F5F1", "#2A2520", "#8B6914",
    { ...CLEAR_BG, backgroundColor: "#F7F5F1", backgroundTexture: "grain", defaultTextColor: "#2A2520", defaultFontFamily: "Lora", nameFontFamily: "Playfair Display", nameColor: "#1A1510", buttonStyle: "card", buttonColor: "#2A2520", buttonTextColor: "#FFFFFF", buttonRadius: 10, contentAlign: "left", avatarShape: "circle" },
    "Classic and refined"),
  t("midnight", "Midnight", "Professional", "#0d1117", "#c9d1d9", "#58a6ff",
    { ...CLEAR_BG, backgroundColor: "#0d1117", defaultTextColor: "#c9d1d9", defaultFontFamily: "JetBrains Mono", nameColor: "#58a6ff", buttonStyle: "outline", buttonColor: "#58a6ff", buttonTextColor: "#58a6ff", buttonRadius: 8, avatarShape: "square" },
    "Technical and precise"),
  t("wire", "Wire", "Professional", "#FFFFFF", "#333333", "#333333",
    { ...CLEAR_BG, backgroundColor: "#FFFFFF", backgroundTexture: "none", defaultTextColor: "#333333", defaultFontFamily: "DM Sans", nameColor: "#000000", buttonStyle: "rounded-outline", buttonColor: "#333333", buttonTextColor: "#333333", buttonRadius: 999, avatarShape: "circle" },
    "Simple and modern"),
  t("slate", "Slate", "Professional", "#1E293B", "#93C5FD", "#3B82F6",
    { ...CLEAR_BG, backgroundColor: "#1E293B", backgroundTexture: "grid", defaultTextColor: "#E2E8F0", defaultFontFamily: "Inter", nameColor: "#FFFFFF", buttonStyle: "shadow", buttonColor: "#3B82F6", buttonTextColor: "#FFFFFF", buttonRadius: 8, avatarShape: "square", socialIconStyle: "outline" },
    "Polished and trustworthy"),

  // ─── Inviting ───
  t("bloom", "Bloom", "Inviting", "#F2EEFF", "#3B2F5E", "#7C5CFF",
    { ...CLEAR_BG, backgroundColor: "#F2EEFF", backgroundTexture: "none", defaultTextColor: "#3B2F5E", defaultFontFamily: "Poppins", nameColor: "#5B3FD6", buttonStyle: "rounded-fill", buttonColor: "#7C5CFF", buttonTextColor: "#FFFFFF", buttonRadius: 999, socialIconStyle: "theme", avatarShape: "circle", contentAlign: "center" },
    "Soft and friendly"),
  t("haze", "Haze", "Inviting", "#F4F4F6", "#4554A8", "#5566C4",
    { ...CLEAR_BG, backgroundScene: "haze", backgroundColor: "#F4F4F6", defaultTextColor: "#3A3F52", nameColor: "#4554A8", buttonStyle: "soft", buttonColor: "#5566C4", buttonTextColor: "#3A3F52", buttonRadius: 12, avatarShape: "rounded" },
    "Dreamy and approachable"),
  t("dusk", "Dusk", "Inviting", "#16121F", "#E0A9D0", "#A24E8A",
    { ...CLEAR_BG, backgroundScene: "dusk", backgroundColor: "#16121F", defaultTextColor: "#E6DCEF", nameColor: "#E0A9D0", buttonStyle: "fill", buttonColor: "#A24E8A", buttonTextColor: "#FFFFFF", buttonRadius: 12, avatarShape: "rounded" },
    "Warm and romantic"),
  t("bloom-motion", "Bloom Motion", "Inviting", "#FDEFE9", "#C2407A", "#E5638F",
    { ...CLEAR_BG, backgroundScene: "bloom", backgroundColor: "#FDEFE9", backgroundTexture: "none", defaultTextColor: "#5A2A3E", nameFontFamily: "Poppins", nameColor: "#B23267", buttonStyle: "rounded-fill", buttonColor: "#E5638F", buttonTextColor: "#FFFFFF", buttonRadius: 999, avatarShape: "circle" },
    "Soft florals in motion"),
  t("sunset-glow", "Sunset Glow", "Inviting", "#FFD3A5", "#7A2E3A", "#E5575F",
    { ...CLEAR_BG, backgroundGradient: { type: "linear", angle: 165, stops: [{ color: "#FFD3A5", position: 0 }, { color: "#FD9B8E", position: 1 }] }, backgroundTexture: "none", defaultTextColor: "#5A2230", defaultFontFamily: "Quicksand", nameColor: "#7A2E3A", buttonStyle: "rounded-fill", buttonColor: "#E5575F", buttonTextColor: "#FFFFFF", buttonRadius: 999, avatarShape: "circle" },
    "Golden hour warmth"),

  // ─── Fun ───
  t("neon", "Neon", "Fun", "#101019", "#EAF0FF", "#7C5CFF",
    { ...CLEAR_BG, backgroundScene: "neon", backgroundColor: "#101019", defaultTextColor: "#EAF0FF", defaultFontFamily: "Space Grotesk", nameColor: "#FFFFFF", buttonStyle: "card", buttonColor: "#101019", buttonTextColor: "#FFFFFF", buttonRadius: 14, avatarShape: "circle" },
    "Bright and electric"),
  t("retro", "Retro", "Fun", "#fef3c7", "#78350f", "#f97316",
    { ...CLEAR_BG, backgroundColor: "#fef3c7", defaultTextColor: "#78350f", defaultFontFamily: "Righteous", nameColor: "#c2410c", buttonStyle: "shadow", buttonColor: "#f97316", buttonTextColor: "#ffffff", buttonRadius: 8, avatarShape: "circle" },
    "Vintage and punchy"),
  t("punch", "Punch", "Fun", "#0a0a0a", "#e2e8f0", "#a3e635",
    { ...CLEAR_BG, backgroundColor: "#0a0a0a", defaultTextColor: "#e2e8f0", defaultFontFamily: "Bungee", nameColor: "#a3e635", buttonStyle: "shadow", buttonColor: "#a3e635", buttonTextColor: "#0a0a0a", buttonRadius: 6, avatarShape: "circle" },
    "Loud and attention-grabbing"),

  // ─── Bold ───
  t("noir", "Noir", "Bold", "#15141A", "#ECEAE6", "#8FB7FF",
    { ...CLEAR_BG, backgroundColor: "#15141A", defaultTextColor: "#ECEAE6", defaultFontFamily: "Space Grotesk", nameColor: "#FFFFFF", buttonStyle: "card", buttonColor: "#15141A", buttonTextColor: "#FFFFFF", buttonRadius: 14, maxWidth: 580, avatarShape: "circle", contentAlign: "center" },
    "Dark and premium"),
  t("galaxy", "Galaxy", "Bold", "#0B0A14", "#F2F0FF", "#8FB7FF",
    { ...CLEAR_BG, backgroundScene: "galaxy", backgroundColor: "#0B0A14", defaultTextColor: "#F2F0FF", defaultFontFamily: "Space Grotesk", nameColor: "#FFFFFF", buttonStyle: "card", buttonColor: "#0B0A14", buttonTextColor: "#FFFFFF", buttonRadius: 14, headerLayout: "hero", avatarShape: "circle" },
    "Cosmic and cinematic"),

  // ─── Calm ───
  t("aurora", "Aurora", "Calm", "#F6F4F0", "#2D2B2E", "#2D2B2E",
    { ...CLEAR_BG, backgroundScene: "aurora", backgroundColor: "#F6F4F0", defaultTextColor: "#2D2B2E", defaultFontFamily: "Inter", buttonStyle: "card", buttonColor: "#2D2B2E", buttonTextColor: "#FFFFFF", buttonRadius: 14, avatarShape: "circle" },
    "Gentle northern lights"),
  t("loft", "Loft", "Calm", "#f0f4f8", "#334155", "#475569",
    { ...CLEAR_BG, backgroundColor: "#f0f4f8", backgroundTexture: "dots", defaultTextColor: "#334155", defaultFontFamily: "Outfit", nameColor: "#1e293b", buttonStyle: "soft", buttonColor: "#475569", buttonTextColor: "#475569", buttonRadius: 10, avatarShape: "rounded" },
    "Quiet and airy"),
];

/** Shape expected by the classic production editor theme picker. */
export type ClassicThemeRow = {
  key: string;
  name: string;
  category: string;
  bg: string;
  text: string;
  accent: string;
  style: Partial<ProfilePageStyle>;
};

export function toClassicThemeRow(theme: ThemePreset): ClassicThemeRow {
  return {
    key: theme.key,
    name: theme.name,
    category: theme.category,
    bg: theme.swatch[0],
    text: theme.swatch[1],
    accent: theme.swatch[2],
    style: theme.patch,
  };
}

export const CLASSIC_THEME_PRESETS: ClassicThemeRow[] = THEME_PRESETS.map(toClassicThemeRow);

/** Surprise-me — inviting, calm, and bold starting points. */
export const SURPRISE_THEME_KEYS = new Set([
  "paper", "bloom", "aurora", "galaxy", "haze", "dusk", "sunset-glow", "noir", "retro",
]);

/** Legacy MCP / removed theme names → nearest canonical preset. */
export const THEME_ALIASES: Record<string, string> = {
  paper: "paper",
  bloom: "bloom",
  "bloom-scene": "bloom-motion",
  noir: "noir",
  mono: "mono",
  aurora: "aurora",
  galaxy: "galaxy",
  neon: "neon",
  "neon-bold": "punch",
  haze: "haze",
  dusk: "dusk",
  ink: "punch",
  editorial: "editorial",
  rose: "editorial",
  royal: "editorial",
  midnight: "midnight",
  retro: "retro",
  punch: "punch",
  wire: "wire",
  loft: "loft",
  "sunset-glow": "sunset-glow",
  slate: "slate",
  clean: "paper",
  "paper-white": "mono",
  cream: "bloom",
  cloud: "loft",
  sand: "editorial",
  "sand-light": "editorial",
  dark: "noir",
  charcoal: "noir",
  void: "noir",
  ocean: "slate",
  sunset: "sunset-glow",
  coral: "bloom",
  lavender: "bloom",
  mint: "loft",
  blush: "bloom",
  sky: "slate",
  forest: "noir",
  cherry: "bloom",
};

const byKey = new Map(THEME_PRESETS.map((theme) => [theme.key, theme]));
const byName = new Map(THEME_PRESETS.map((theme) => [theme.name.toLowerCase(), theme]));

export function getThemePreset(name: string): Partial<ProfilePageStyle> | null {
  const key = name.toLowerCase().trim().replace(/\s+/g, "-");
  const direct = byKey.get(key)?.patch ?? byKey.get(THEME_ALIASES[key] ?? "")?.patch;
  if (direct) return { ...direct };
  const byDisplayName = byName.get(name.toLowerCase().trim())?.patch;
  if (byDisplayName) return { ...byDisplayName };
  const alias = THEME_ALIASES[key];
  if (alias) {
    const patch = byKey.get(alias)?.patch;
    if (patch) return { ...patch };
  }
  return null;
}

export function listThemeNames(): string[] {
  return THEME_PRESETS.map((theme) => theme.key);
}

export function themesByCategory(): Record<string, ThemePreset[]> {
  const out: Record<string, ThemePreset[]> = {};
  for (const theme of THEME_PRESETS) {
    if (!out[theme.category]) out[theme.category] = [];
    out[theme.category].push(theme);
  }
  return out;
}

export function describeThemesText(): string {
  const grouped = themesByCategory();
  const lines = ["# Theme presets\n"];
  for (const cat of THEME_CATEGORY_ORDER) {
    const items = grouped[cat];
    if (!items?.length) continue;
    lines.push(`## ${cat}`);
    for (const theme of items) {
      lines.push(`- **${theme.key}** (${theme.name})${theme.desc ? `: ${theme.desc}` : ""}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
