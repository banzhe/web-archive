import { constants as fsConstants } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { access } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import type { LaunchOptions } from 'puppeteer-core'

export const scriptDir = path.dirname(fileURLToPath(import.meta.url))
export const pluginRoot = path.resolve(scriptDir, '..')
export const runtimeDir = path.join(pluginRoot, '.puppeteer')
export const defaultUserDataDir = path.join(runtimeDir, 'profiles', 'puppeteer-plugin')
export const extensionOutputPath = path.resolve(pluginRoot, '../../dist/extension')
export const extensionManifestPath = path.join(extensionOutputPath, 'manifest.json')

const browserExecutableEnvNames = [
  'PUPPETEER_EXECUTABLE_PATH',
  'CHROME_EXECUTABLE_PATH',
  'CHROME_PATH',
  'CHROMIUM_PATH',
]

export function buildExtensionLaunchArgs(extensionPath: string) {
  return [
    '--disable-features=DisableLoadExtensionCommandLineSwitch,DisableDisableExtensionsExceptCommandLineSwitch',
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ]
}

export async function assertExtensionBuildOutput() {
  if (await fileExists(extensionManifestPath)) {
    return
  }

  throw new Error([
    'Extension build output is missing.',
    'Run `pnpm --filter plugin build` first.',
    `Expected file: ${extensionManifestPath}`,
  ].join('\n'))
}

export function buildPuppeteerLaunchOptions(options: {
  executablePath: string
  userDataDir?: string
  extensionPath?: string
}): LaunchOptions {
  const extensionPath = options.extensionPath ?? extensionOutputPath

  return {
    executablePath: options.executablePath,
    headless: false,
    pipe: true,
    userDataDir: options.userDataDir ?? defaultUserDataDir,
    enableExtensions: [extensionPath],
  }
}

export async function resolveBrowserExecutablePath() {
  const envExecutablePath = await readExecutablePathFromEnvironment()
  if (envExecutablePath) {
    return envExecutablePath
  }

  for (const candidate of getBrowserExecutableCandidates()) {
    if (await fileExists(candidate)) {
      return candidate
    }
  }

  const pathExecutable = resolveBrowserExecutableFromPath()
  if (pathExecutable && await fileExists(pathExecutable)) {
    return pathExecutable
  }

  throw new Error([
    'Unable to find a local Chrome/Chromium executable for Puppeteer.',
    'Set `PUPPETEER_EXECUTABLE_PATH` or install Google Chrome / Chromium locally.',
  ].join('\n'))
}

async function readExecutablePathFromEnvironment() {
  for (const envName of browserExecutableEnvNames) {
    const value = process.env[envName]
    if (value && await fileExists(value)) {
      return value
    }
  }

  return undefined
}

function resolveBrowserExecutableFromPath() {
  const resolveCommand = process.platform === 'win32' ? 'where' : 'which'

  for (const browserName of getBrowserExecutableNames()) {
    const result = spawnSync(resolveCommand, [browserName], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })

    if (result.status !== 0) {
      continue
    }

    const executablePath = result.stdout
      .split(/\r?\n/)
      .map(line => line.trim())
      .find(Boolean)

    if (executablePath) {
      return executablePath
    }
  }

  return undefined
}

function getBrowserExecutableCandidates() {
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA
    const programFiles = process.env.PROGRAMFILES ?? process.env.ProgramFiles
    const programFilesX86 = process.env['ProgramFiles(x86)']
    const programW6432 = process.env.PROGRAMW6432 ?? process.env.ProgramW6432

    return [
      joinIfDefined(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      joinIfDefined(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      joinIfDefined(programW6432, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      joinIfDefined(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      joinIfDefined(programFiles, 'Chromium', 'Application', 'chrome.exe'),
      joinIfDefined(programFilesX86, 'Chromium', 'Application', 'chrome.exe'),
      joinIfDefined(localAppData, 'Chromium', 'Application', 'chrome.exe'),
      joinIfDefined(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      joinIfDefined(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      joinIfDefined(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    ].filter((candidate): candidate is string => Boolean(candidate))
  }

  if (process.platform === 'darwin') {
    return [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    ]
  }

  return [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
    '/snap/bin/chromium',
  ]
}

function getBrowserExecutableNames() {
  if (process.platform === 'win32') {
    return ['chrome.exe', 'chromium.exe', 'msedge.exe']
  }

  return ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']
}

function joinIfDefined(base: string | undefined, ...segments: string[]) {
  return base ? path.join(base, ...segments) : undefined
}

async function fileExists(filePath: string) {
  try {
    await access(filePath, fsConstants.X_OK)
    return true
  }
  catch {
    return false
  }
}
