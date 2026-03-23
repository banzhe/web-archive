import { access, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

import { pluginRoot } from './plugin-paths.ts'

export type ChromeDevtoolsMcpRuntimeConfig = {
  mode: 'dev' | 'build'
  extensionPath: string
  extensionManifestPath: string
  userDataDir: string
  channel?: 'stable' | 'canary' | 'beta' | 'dev'
  headless: boolean
  logFile?: string
  chromeArgs: string[]
  extraArgs: string[]
}

const repoRoot = path.resolve(pluginRoot, '../..')
const runtimeDir = path.join(pluginRoot, '.chrome-devtools-mcp')
const defaultDevExtensionPath = path.join(pluginRoot, '.output', 'chrome-mv3')
const defaultBuildExtensionPath = path.join(repoRoot, 'dist', 'extension')
const defaultUserDataDir = path.join(pluginRoot, '.chrome-devtools-mcp', 'profile')
const defaultLogFile = path.join(runtimeDir, 'chrome-devtools-mcp.log')

export async function resolveChromeDevtoolsMcpRuntimeConfig(): Promise<ChromeDevtoolsMcpRuntimeConfig> {
  const mode = readMode()
  const extensionPath = resolveExtensionPath(mode)
  const extensionManifestPath = path.join(extensionPath, 'manifest.json')

  await assertFileExists(
    extensionManifestPath,
    [
      `Extension manifest not found: ${extensionManifestPath}`,
      'Run the plugin dev flow or build before starting OpenCode MCP.',
      'You can override the directory with `PLUGIN_EXTENSION_PATH`.',
    ].join('\n'),
  )

  return {
    mode,
    extensionPath,
    extensionManifestPath,
    userDataDir: path.resolve(process.env.PLUGIN_MCP_USER_DATA_DIR ?? defaultUserDataDir),
    channel: readChannel(),
    headless: readBooleanEnv('PLUGIN_MCP_HEADLESS', false),
    logFile: readBooleanEnv('PLUGIN_MCP_WRITE_LOG', true)
      ? path.resolve(process.env.PLUGIN_MCP_LOG_FILE ?? defaultLogFile)
      : undefined,
    chromeArgs: buildDefaultChromeArgs(extensionPath),
    extraArgs: readExtraArgs(),
  }
}

export async function writeChromeDevtoolsMcpRuntimeConfig(
  config: ChromeDevtoolsMcpRuntimeConfig,
  filename = 'chrome-devtools-mcp.resolved.json',
) {
  await mkdir(runtimeDir, { recursive: true })

  const runtimeConfigPath = path.join(runtimeDir, filename)
  await writeFile(runtimeConfigPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')

  return {
    runtimeConfigPath,
    runtimeConfig: config,
  }
}

export function shouldWriteChromeDevtoolsMcpRuntimeConfig() {
  return readBooleanEnv('PLUGIN_MCP_WRITE_RUNTIME_CONFIG', false)
}

export function buildChromeDevtoolsMcpArgs(config: ChromeDevtoolsMcpRuntimeConfig) {
  const args = [
    '-y',
    'chrome-devtools-mcp@latest',
    '--categoryExtensions=true',
    `--userDataDir=${config.userDataDir}`,
    `--headless=${String(config.headless)}`,
  ]

  if (config.channel) {
    args.push(`--channel=${config.channel}`)
  }

  if (config.logFile) {
    args.push(`--logFile=${config.logFile}`)
  }

  for (const chromeArg of config.chromeArgs) {
    args.push(`--chromeArg=${chromeArg}`)
  }

  args.push(...config.extraArgs)
  return args
}

function resolveExtensionPath(mode: 'dev' | 'build') {
  const overridePath = process.env.PLUGIN_EXTENSION_PATH
  if (overridePath) {
    return path.resolve(overridePath)
  }

  return mode === 'dev' ? defaultDevExtensionPath : defaultBuildExtensionPath
}

function readMode(): 'dev' | 'build' {
  return process.env.PLUGIN_EXTENSION_MODE === 'build' ? 'build' : 'dev'
}

function readChannel(): ChromeDevtoolsMcpRuntimeConfig['channel'] {
  const value = process.env.PLUGIN_MCP_CHANNEL
  if (value === 'stable' || value === 'canary' || value === 'beta' || value === 'dev') {
    return value
  }
  return undefined
}

function readBooleanEnv(name: string, defaultValue: boolean) {
  const value = process.env[name]
  if (!value) {
    return defaultValue
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

function readExtraArgs() {
  const raw = process.env.PLUGIN_MCP_EXTRA_ARGS?.trim()
  if (!raw) {
    return []
  }

  return raw
    .split(/\s+/)
    .map(item => item.trim())
    .filter(Boolean)
}

function buildDefaultChromeArgs(extensionPath: string) {
  return [
    '--disable-features=DisableLoadExtensionCommandLineSwitch,DisableDisableExtensionsExceptCommandLineSwitch',
    '--enable-unsafe-extension-debugging',
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ]
}

async function assertFileExists(filePath: string, errorMessage: string) {
  try {
    await access(filePath)
  }
  catch {
    throw new Error(errorMessage)
  }
}
