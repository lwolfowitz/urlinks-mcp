# @urlinks/mcp-server

MCP server for [URLinks](https://urlinks.me) — the AI-friendly URL shortener.

Gives Claude Code, Cursor, Windsurf, and any MCP-compatible AI agent native access to your shortlinks.

## Setup

### 1. Get an API key

Sign in to your URLinks dashboard and create an API key in Settings.

### 2. Add to your AI tool

URLinks is a hosted MCP server (Streamable HTTP) — there's nothing to install. Point your client at `https://urlinks.me/api/mcp` and pass your API key as a bearer header.

**Claude Code** (`~/.claude.json` or a project `.mcp.json`):

```json
{
  "mcpServers": {
    "urlinks": {
      "type": "http",
      "url": "https://urlinks.me/api/mcp",
      "headers": {
        "Authorization": "Bearer urk_your_key_here"
      }
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "urlinks": {
      "url": "https://urlinks.me/api/mcp",
      "headers": {
        "Authorization": "Bearer urk_your_key_here"
      }
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `create_shortlink` | Create a new shortlink (e.g., `my/docs` -> `https://docs.google.com/...`) |
| `list_links` | List all your shortlinks with pagination |
| `search_links` | Search links by name, URL, or description |
| `get_link_analytics` | Get click counts and daily breakdown for a link |
| `edit_link` | Update a link's destination URL or description |
| `delete_link` | Permanently delete a shortlink |
## Profile tools (link-in-bio)

See `docs/profile-plans/2026-06-03-api-mcp-parity-spec.md` for the full parity checklist.

| Tool | Description |
|------|-------------|
| `get_profile` / `update_profile` | Read/update display name, bio, avatar |
| `add_block` | Basic blocks (legacy) |
| **`add_block_v2`** | Full block types: gallery, countdown, product, embed presets |
| **`update_page_style`** | Themes, scenes, layout, socialIconStyle, strokes, … |
| **`update_block`** | Per-block content/style, feature links, animations |
| **`apply_theme`** / `set_theme` | Apply `@urlinks/profile-presets` themes |
| **`list_profile_style_options`** | Fonts, scenes, gradients, embed providers |
| `submit_custom_css` | Sanitized CSS per concern |


Once configured, just ask your AI:

- "Create a shortlink `my/standup` pointing to our standup doc"
- "How many clicks did `my/blog` get this week?"
- "List all my links about documentation"
- "Create shortlinks for all the URLs in this README"

## Auth

Pass your API key (starts with `urk_`) as `Authorization: Bearer <key>` to `https://urlinks.me/api/mcp`. Create a key in your URLinks dashboard settings.

The server side honors `URLINKS_API_URL` to override the backend base URL (self-hosting/dev); clients don't need it.
