import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

// MCP tool annotations: they let clients tell tools that only read data apart
// from ones that change it, and MCP directories grade servers on them. In the
// spec, "destructive" means the tool can modify or remove existing data, as
// opposed to only adding new data.
export const READS: ToolAnnotations = { readOnlyHint: true };
export const ADDS: ToolAnnotations = { readOnlyHint: false, destructiveHint: false };
export const CHANGES: ToolAnnotations = { readOnlyHint: false, destructiveHint: true };
