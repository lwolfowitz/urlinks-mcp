# URLinks MCP server

Source code for the [URLinks](https://urlinks.me) MCP server. It lets any MCP client create and manage short links, go links, QR codes, and link-in-bio pages, and read click analytics.

The server is hosted, so there's nothing to install or run:

- **Endpoint:** `https://urlinks.me/api/mcp` (Streamable HTTP)
- **Auth:** send your URLinks API key as `Authorization: Bearer urk_...`. Create a key in your URLinks dashboard settings. `initialize` and `tools/list` work without a key; tool calls need one.
- **MCP Registry:** `me.urlinks/urlinks`

## Connect

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

## Tools

38 tools. Each one carries MCP annotations, so clients can tell the tools that only read data from the ones that change it.

### Read-only (15)

| Tool | What it does |
|---|---|
| `list_links` | List all your shortlinks. |
| `search_links` | Search your shortlinks by name, URL, or description. |
| `get_link_analytics` | Get click analytics for a shortlink — total clicks, daily breakdown, and last clicked time. |
| `list_qr_templates` | List the user's saved QR style templates — reusable styles (colors, shapes, center logo/emblem) they can apply to any link with apply_qr_template. |
| `get_qr_config` | Get the QR code configuration for a shortlink, including whether one has been set up. |
| `get_qr_image` | Generate a QR code image (SVG or PNG) for a shortlink. |
| `get_customization_rules` | Get the complete rule set for customizing a URLinks profile page via CSS. |
| `get_custom_css` | Get the user's current custom CSS for all profile concerns. |
| `get_alias` | Check if the user has a username/alias set. |
| `get_profile` | Get the user's current profile — display name, bio, blocks, social links, theme, custom CSS, and published status. |
| `get_public_profile` | View any user's public profile by username. |
| `list_themes` | List theme presets. |
| `get_profile_analytics` | Get analytics for the user's profile — total views, per-link click counts, and daily breakdowns. |
| `list_profile_style_options` | Catalog of profile style options — fonts, scenes, gradients, animations, block types, embed providers. |
| `list_themes_v2` | List canonical theme presets (editor prototype). |

### Add data (6)

| Tool | What it does |
|---|---|
| `create_shortlink` | Create a new shortlink. |
| `bulk_create_links` | Create multiple shortlinks at once (max 50). |
| `create_alias` | Create a username/alias for the user. |
| `add_block` | Add a block to the profile. |
| `add_social_link` | Add a social link to the profile's social icon bar. |
| `add_block_v2` | Add a block with full prototype parity (gallery, countdown, product, embed presets). |

### Change or remove data (17)

| Tool | What it does |
|---|---|
| `delete_link` | Delete a shortlink permanently. |
| `edit_link` | Update a shortlink's destination URL or description. |
| `save_qr_config` | Save a QR code style configuration for an existing shortlink. |
| `apply_qr_template` | Apply a saved QR style template to a shortlink — copies the template's full style (colors, shapes, center logo/emblem) onto that link's QR. |
| `delete_qr_template` | Delete a saved QR style template by its name or id. |
| `submit_custom_css` | Submit custom CSS for one or more profile concerns. |
| `reset_custom_css` | Reset/remove custom CSS for specific concerns, or all concerns at once. |
| `update_alias` | Change the user's alias/username to a new one. |
| `update_profile` | Update the profile's basic info — display name, bio, or avatar URL. |
| `remove_block` | Remove a block from the profile by its position (0-based index). |
| `reorder_blocks` | Move a block from one position to another. |
| `remove_social_link` | Remove a social link by platform name. |
| `set_theme` | Apply a visual theme preset. |
| `publish_profile` | Publish or unpublish the profile. |
| `update_page_style` | Merge visual/layout fields into page_style. |
| `update_block` | Update block content/style by position or block_id. |
| `apply_theme` | Apply a canonical theme preset (paper, aurora, galaxy, …). |

## What's in this repo

| Path | What it is |
|---|---|
| `packages/mcp-server` | The tool definitions (`registerUrlinksTools`). Every tool calls the public URLinks REST API ([OpenAPI spec](https://urlinks.me/openapi.yaml)) with the caller's API key. Also holds `server.json`, the MCP Registry entry. |
| `packages/profile-presets` | Themes, fonts, palettes, and style catalogs used by the profile tools. |
| `packages/types` | The two style types the presets use. |
| `hosting/route.ts` | The Next.js route that serves the tools at `urlinks.me/api/mcp`, using `mcp-handler` with a per-request API key. |

This repo mirrors the MCP code from the main URLinks codebase, which is private.

```bash
npm install
npm run typecheck
```

Questions or problems: admin@urlinks.me

## License

[MIT](LICENSE)
