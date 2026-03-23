# Chrome DevTools MCP Template

This file shows a minimal OpenCode MCP config for launching `chrome-devtools-mcp`
with the local plugin extension loaded.

Use `dev` mode to load the fixed local development output under
`packages/plugin/.output/chrome-mv3`, or switch `PLUGIN_EXTENSION_MODE` to `build`
to load the packaged output under `dist/extension`.

## Example

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "chrome-devtools-extension": {
      "type": "local",
      "command": [
        "node",
        "--experimental-strip-types",
        "./packages/plugin/scripts/open-chrome-devtools-mcp.ts"
      ],
      "environment": {
        "PLUGIN_EXTENSION_MODE": "dev",
        "PLUGIN_MCP_PRINT_CONFIG": "1",
        "PLUGIN_MCP_WRITE_RUNTIME_CONFIG": "1"
      }
    }
  }
}
```

## Advanced example: subagent configuration

If you want browser verification work to run through a dedicated subagent, you can
also enable the MCP tool at the top level and register a `chrome-mcp-agent`
subagent that is limited to `chrome-devtools-extension` tools.

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "chrome-devtools-extension": {
      "type": "local",
      "command": [
        "node",
        "--experimental-strip-types",
        "./packages/plugin/scripts/open-chrome-devtools-mcp.ts"
      ],
      "environment": {
        "PLUGIN_EXTENSION_MODE": "dev",
        "PLUGIN_MCP_PRINT_CONFIG": "1",
        "PLUGIN_MCP_WRITE_RUNTIME_CONFIG": "1"
      },
      "enabled": true
    }
  },
  "tools": {
    "chrome-devtools-extension": true
  },
  "agent": {
    "chrome-mcp-agent": {
      "description": "Uses the local Chrome DevTools MCP extension browser to inspect pages, verify extension UI flows, and debug console or network issues.",
      "mode": "subagent",
      "model": "openai/gpt-5.4-mini",
      "prompt": "You are a browser verification subagent for the local plugin extension. Use only the `chrome-devtools-extension*` tools to inspect pages, navigate, and validate UI flows. Take a fresh snapshot before interacting with the page, verify the resulting UI state after each meaningful action, and prefer snapshots over screenshots. Use console or network inspection only when snapshots are not enough to explain a failure. Keep actions targeted, avoid unrelated browsing, and report the final result with the key evidence you observed.",
      "tools": {
        "chrome-devtools-extension": true
      }
    }
  }
}
```

- `tools.chrome-devtools-extension`: exposes the MCP-backed browser tools to the main agent.
- `agent.chrome-mcp-agent.mode`: set to `subagent` so OpenCode can delegate browser checks.
- `agent.chrome-mcp-agent.tools`: keeps the subagent scoped to Chrome DevTools MCP only.
- `agent.chrome-mcp-agent.prompt`: gives the subagent a narrow verification workflow for extension UI checks.

## Useful environment variables

- `PLUGIN_EXTENSION_MODE`: `dev` loads `packages/plugin/.output/chrome-mv3`; `build` loads `dist/extension`.
- `PLUGIN_EXTENSION_PATH`: explicit extension directory override.
- `PLUGIN_MCP_CHANNEL`: optional Chrome channel, one of `stable`, `beta`, `dev`, `canary`.
- `PLUGIN_MCP_HEADLESS`: set to `1` to run headless.
- `PLUGIN_MCP_USER_DATA_DIR`: custom browser profile directory.
- `PLUGIN_MCP_LOG_FILE`: custom log output path.
- `PLUGIN_MCP_WRITE_LOG`: set to `0` to disable log file output.
- `PLUGIN_MCP_PRINT_CONFIG`: print the resolved runtime config path or extension path.
- `PLUGIN_MCP_PRINT_CONFIG_JSON`: print the resolved runtime config JSON.
- `PLUGIN_MCP_WRITE_RUNTIME_CONFIG`: write the resolved runtime config to `.chrome-devtools-mcp/`.
- `PLUGIN_MCP_EXTRA_ARGS`: extra arguments forwarded to `chrome-devtools-mcp`.

## Notes

- The extension manifest must exist before the script starts; run the plugin dev flow or build first.
- The script forwards additional CLI arguments after `--` to `chrome-devtools-mcp`.
- Runtime files are written under `packages/plugin/.chrome-devtools-mcp/` when enabled.
