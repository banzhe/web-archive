import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export type PlaywrightPluginConfig = {
  browser?: {
    userDataDir?: string
    launchOptions?: {
      executablePath?: string
      args?: unknown[]
    }
  }
}

type BrowserInstallMetadata = {
  channel: string
  executablePath: string
  installedAt: string
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url))

export const pluginRoot = path.resolve(scriptDir, '..')
export const runtimeDir = path.join(pluginRoot, '.playwright-cli')

const sourceConfigPath = path.join(pluginRoot, 'playwright-plugin.json')
const browserMetadataPath = path.join(runtimeDir, 'chrome-for-testing.json')
const installBrowserCommand = 'pnpm run pw:plugin:install-browser'
const extensionArgPrefixes = [
  '--disable-extensions-except=',
  '--load-extension=',
]

export async function readInstalledChromeExecutablePath() {
  let metadata: BrowserInstallMetadata

  try {
    metadata = JSON.parse(
      await readFile(browserMetadataPath, 'utf8'),
    ) as BrowserInstallMetadata
  }
  catch {
    throw new Error(
      [
        'Chrome for Testing is not installed for this repository.',
        `Run \`${installBrowserCommand}\` first.`,
        `Expected metadata file: ${browserMetadataPath}`,
      ].join('\n'),
    )
  }

  if (!metadata.executablePath) {
    throw new Error(
      [
        'Chrome for Testing metadata is invalid.',
        `Run \`${installBrowserCommand}\` again.`,
        `Metadata file: ${browserMetadataPath}`,
      ].join('\n'),
    )
  }

  try {
    await access(metadata.executablePath)
  }
  catch {
    throw new Error(
      [
        `Chrome for Testing executable is missing: ${metadata.executablePath}`,
        `Run \`${installBrowserCommand}\` again.`,
      ].join('\n'),
    )
  }

  return metadata.executablePath
}

export async function tryReadInstalledChromeExecutablePath() {
  try {
    return await readInstalledChromeExecutablePath()
  }
  catch {
    return undefined
  }
}

export async function readPlaywrightPluginSourceConfig() {
  return JSON.parse(
    await readFile(sourceConfigPath, 'utf8'),
  ) as PlaywrightPluginConfig
}

export function resolvePlaywrightPluginConfig(
  config: PlaywrightPluginConfig,
  executablePath?: string,
): PlaywrightPluginConfig {
  const nextConfig = structuredClone(config)
  const browser = nextConfig.browser ?? {}
  const launchOptions = browser.launchOptions ?? {}
  const args = Array.isArray(launchOptions.args) ? launchOptions.args : []

  launchOptions.args = args.map(arg => resolveLaunchArg(arg))

  if (executablePath) {
    launchOptions.executablePath = executablePath
  }

  if (
    typeof browser.userDataDir === 'string'
    && !path.isAbsolute(browser.userDataDir)
  ) {
    browser.userDataDir = path.resolve(pluginRoot, browser.userDataDir)
  }

  nextConfig.browser = {
    ...browser,
    launchOptions,
  }

  return nextConfig
}

export async function writeResolvedPlaywrightPluginConfig(options?: {
  filename?: string
  executablePath?: string
}) {
  const sourceConfig = await readPlaywrightPluginSourceConfig()
  const runtimeConfig = resolvePlaywrightPluginConfig(
    sourceConfig,
    options?.executablePath,
  )
  const runtimeConfigPath = path.join(
    runtimeDir,
    options?.filename ?? 'playwright-plugin.resolved.json',
  )

  await mkdir(runtimeDir, { recursive: true })
  await writeFile(
    runtimeConfigPath,
    `${JSON.stringify(runtimeConfig, null, 2)}\n`,
    'utf8',
  )

  return {
    runtimeConfig,
    runtimeConfigPath,
  }
}

function resolveLaunchArg(arg: unknown) {
  if (typeof arg !== 'string') {
    return arg
  }

  for (const prefix of extensionArgPrefixes) {
    if (arg.startsWith(prefix)) {
      const rawValue = arg.slice(prefix.length)
      if (!rawValue || path.isAbsolute(rawValue)) {
        return arg
      }

      return `${prefix}${path.resolve(pluginRoot, rawValue)}`
    }
  }

  return arg
}
