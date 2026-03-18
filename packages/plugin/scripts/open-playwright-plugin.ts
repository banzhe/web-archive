import { spawn } from 'node:child_process'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

type PlaywrightPluginConfig = {
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
const repoRoot = path.resolve(scriptDir, '..')
const sourceConfigPath = path.join(repoRoot, 'playwright-plugin.json')
const runtimeDir = path.join(repoRoot, '.playwright-cli')
const runtimeConfigPath = path.join(
  runtimeDir,
  'playwright-plugin.resolved.json',
)
const browserMetadataPath = path.join(runtimeDir, 'chrome-for-testing.json')
const installBrowserCommand = 'pnpm run pw:plugin:install-browser'
const extensionArgPrefixes = [
  '--disable-extensions-except=',
  '--load-extension=',
]

async function main() {
  const forwardedArgs = normalizeForwardedArgs(process.argv.slice(2))

  if (isHelpRequest(forwardedArgs)) {
    await openWithResolvedConfig(
      forwardedArgs,
      await tryReadInstalledChromeExecutablePath(),
    )
    return
  }

  const executablePath = await readInstalledChromeExecutablePath()
  await openWithResolvedConfig(forwardedArgs, executablePath)
}

async function openWithResolvedConfig(
  forwardedArgs: string[],
  executablePath?: string,
) {
  const sourceConfig = JSON.parse(
    await readFile(sourceConfigPath, 'utf8'),
  ) as PlaywrightPluginConfig
  const runtimeConfig = resolveConfig(sourceConfig, executablePath)

  await mkdir(runtimeDir, { recursive: true })
  await writeFile(
    runtimeConfigPath,
    `${JSON.stringify(runtimeConfig, null, 2)}\n`,
    'utf8',
  )

  const cliArgs = ['open', `--config=${runtimeConfigPath}`, ...forwardedArgs]
  const child = spawn('playwright-cli', cliArgs, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
      return
    }

    process.exit(code ?? 1)
  })
}

async function readInstalledChromeExecutablePath() {
  let metadata: BrowserInstallMetadata

  try {
    metadata = JSON.parse(
      await readFile(browserMetadataPath, 'utf8'),
    ) as BrowserInstallMetadata
  }
  catch {
    throw new Error(
      [
        `Chrome for Testing is not installed for this repository.`,
        `Run \`${installBrowserCommand}\` first.`,
        `Expected metadata file: ${browserMetadataPath}`,
      ].join('\n'),
    )
  }

  if (!metadata.executablePath) {
    throw new Error(
      [
        `Chrome for Testing metadata is invalid.`,
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

async function tryReadInstalledChromeExecutablePath() {
  try {
    return await readInstalledChromeExecutablePath()
  }
  catch {
    return undefined
  }
}

function resolveConfig(
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
    browser.userDataDir = path.resolve(repoRoot, browser.userDataDir)
  }

  nextConfig.browser = {
    ...browser,
    launchOptions,
  }

  return nextConfig
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

      return `${prefix}${path.resolve(repoRoot, rawValue)}`
    }
  }

  return arg
}

function isHelpRequest(args: string[]) {
  return args.includes('--help') || args.includes('-h')
}

function normalizeForwardedArgs(args: string[]) {
  return args[0] === '--' ? args.slice(1) : args
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
