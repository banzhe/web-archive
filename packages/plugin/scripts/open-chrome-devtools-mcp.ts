import { spawn } from 'node:child_process'
import process from 'node:process'

import {
  buildChromeDevtoolsMcpArgs,
  resolveChromeDevtoolsMcpRuntimeConfig,
  shouldWriteChromeDevtoolsMcpRuntimeConfig,
  writeChromeDevtoolsMcpRuntimeConfig,
} from './chrome-devtools-mcp-config.ts'

async function main() {
  const config = await resolveChromeDevtoolsMcpRuntimeConfig()
  const runtimeConfig = shouldWriteChromeDevtoolsMcpRuntimeConfig()
    ? await writeChromeDevtoolsMcpRuntimeConfig(config)
    : undefined

  printResolvedConfig(config, runtimeConfig)

  const forwardedArgs = normalizeForwardedArgs(process.argv.slice(2))
  const mcpArgs = [...buildChromeDevtoolsMcpArgs(config), ...forwardedArgs]
  const { command, args } = resolveSpawnCommand(mcpArgs)
  const child = spawn(command, args, {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  })

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
      return
    }

    process.exit(code ?? 1)
  })
}

function normalizeForwardedArgs(args: string[]) {
  return args[0] === '--' ? args.slice(1) : args
}

function printResolvedConfig(
  config: { extensionPath: string },
  runtimeConfig?: { runtimeConfigPath: string },
) {
  if (process.env.PLUGIN_MCP_PRINT_CONFIG === '1') {
    if (runtimeConfig?.runtimeConfigPath) {
      process.stderr.write(`chrome-devtools-mcp config: ${runtimeConfig.runtimeConfigPath}\n`)
    }
    else {
      process.stderr.write(`chrome-devtools-mcp extension: ${config.extensionPath}\n`)
    }
  }

  if (process.env.PLUGIN_MCP_PRINT_CONFIG_JSON === '1') {
    process.stderr.write(`${JSON.stringify(config, null, 2)}\n`)
  }
}

function resolveSpawnCommand(args: string[]) {
  if (process.platform === 'win32') {
    return {
      command: 'cmd.exe',
      args: ['/d', '/s', '/c', 'npx', ...args],
    }
  }

  return {
    command: 'npx',
    args,
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
