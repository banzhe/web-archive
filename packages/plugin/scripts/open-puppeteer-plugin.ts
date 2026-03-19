import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import puppeteer, { type Browser } from 'puppeteer-core'
import {
  assertExtensionBuildOutput,
  buildPuppeteerLaunchOptions,
  extensionOutputPath,
  resolveBrowserExecutablePath,
} from './puppeteer-plugin-runtime.ts'

const defaultTargetUrl = 'http://localhost:7749'

async function main() {
  const forwardedArgs = normalizeForwardedArgs(process.argv.slice(2))
  if (forwardedArgs.includes('--help') || forwardedArgs.includes('-h')) {
    printUsage()
    return
  }

  const targetUrl = readTargetUrl(forwardedArgs) ?? defaultTargetUrl
  await assertExtensionBuildOutput()

  const executablePath = await resolveBrowserExecutablePath()
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'web-archive-puppeteer-plugin-'))
  const browser = await puppeteer.launch(
    buildPuppeteerLaunchOptions({
      executablePath,
      userDataDir,
      extensionPath: extensionOutputPath,
    }),
  )

  try {
    const page = await browser.newPage()
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 10_000 }).catch(() => {})

    console.log([
      'Puppeteer plugin browser opened.',
      `Target URL: ${targetUrl}`,
      `Extension path: ${extensionOutputPath}`,
      'Press Ctrl+C to close the browser.',
    ].join('\n'))

    await Promise.race([
      waitForShutdownSignal(),
      waitForBrowserDisconnect(browser),
    ])
  }
  finally {
    await browser.close().catch(() => {})
    await rm(userDataDir, { recursive: true, force: true })
  }
}

function normalizeForwardedArgs(args: string[]) {
  return args[0] === '--' ? args.slice(1) : args
}

function readTargetUrl(args: string[]) {
  const urlArg = args.find(arg => arg.startsWith('--url='))
  if (urlArg) {
    return urlArg.slice('--url='.length)
  }

  const positionalUrl = args.find(arg => !arg.startsWith('--'))
  return positionalUrl || undefined
}

function printUsage() {
  console.log([
    'Usage:',
    '  node --experimental-strip-types ./scripts/open-puppeteer-plugin.ts',
    '  node --experimental-strip-types ./scripts/open-puppeteer-plugin.ts --url=http://localhost:7749',
    '',
    'The script opens a Chromium browser with the plugin extension loaded.',
  ].join('\n'))
}

function waitForShutdownSignal() {
  return new Promise<void>((resolve) => {
    const onSignal = () => {
      process.off('SIGINT', onSignal)
      process.off('SIGTERM', onSignal)
      resolve()
    }

    process.once('SIGINT', onSignal)
    process.once('SIGTERM', onSignal)
  })
}

function waitForBrowserDisconnect(browser: Browser) {
  return new Promise<void>((resolve) => {
    browser.once('disconnected', resolve)
  })
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
