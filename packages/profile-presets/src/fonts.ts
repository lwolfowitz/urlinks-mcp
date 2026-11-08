/** Google Fonts available in the profile editor / MCP. */
export const PROFILE_FONTS = [
  "Inter", "Poppins", "Fredoka", "Space Grotesk", "DM Sans", "Sora", "Outfit",
  "Montserrat", "Lato", "Nunito", "Raleway", "Work Sans", "Quicksand", "Comfortaa",
  "Playfair Display", "Lora", "Merriweather", "Abril Fatface",
  "Lilita One", "Bebas Neue", "Oswald", "Lobster", "Pacifico", "Caveat",
  "Roboto Mono", "JetBrains Mono",
  "Bungee", "Righteous", "Rubik", "Plus Jakarta Sans", "Libre Baskerville",
  "Crimson Text", "Fira Code", "Space Mono",
];

// Curated display + body pairings. Picking individual fonts is the #1 way a
// non-designer makes a page look amateur (mismatched display/body); a pairing
// applies both at once, each combination pre-vetted to read well together.
// `display` → page_style.nameFontFamily, `body` → page_style.defaultFontFamily.
export type FontPairing = {
  key: string;
  name: string;
  display: string;
  body: string;
  desc: string;
};

export const FONT_PAIRINGS: FontPairing[] = [
  { key: "modern", name: "Modern", display: "Sora", body: "DM Sans", desc: "Clean and contemporary" },
  { key: "editorial", name: "Editorial", display: "Playfair Display", body: "Lora", desc: "Elegant, magazine serif" },
  { key: "classic", name: "Classic", display: "Libre Baskerville", body: "Work Sans", desc: "Timeless and literary" },
  { key: "warm", name: "Warm", display: "Fredoka", body: "Nunito", desc: "Friendly and rounded" },
  { key: "statement", name: "Statement", display: "Bebas Neue", body: "DM Sans", desc: "Tall, bold headlines" },
  { key: "technical", name: "Technical", display: "Space Mono", body: "DM Sans", desc: "Monospace, engineered" },
  { key: "soft", name: "Soft", display: "Quicksand", body: "Quicksand", desc: "Gentle and minimal" },
  { key: "punchy", name: "Punchy", display: "Righteous", body: "Rubik", desc: "Playful and energetic" },
  { key: "refined", name: "Refined", display: "Abril Fatface", body: "Montserrat", desc: "Dramatic display serif" },
];
