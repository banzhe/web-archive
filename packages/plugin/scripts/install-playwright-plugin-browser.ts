import { mkdir, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(scriptDir, '..')
const runtimeDir = path.join(repoRoot, '.playwright-cli')
const browserCacheDir = path.join(runtimeDir, 'browsers')
const browserMetadataPath = path.join(runtimeDir, 'chrome-for-testing.json')
const installCommand = [
  'npx',
  '@puppeteer/browsers',
  'install',
  'chrome@stable',
  '--path',
  browserCacheDir,
  '--format',
  '{{path}}',
]

type BrowserInstallMetadata = {
  channel: 'chrome@stable'
  executablePath: string
  installedAt: string
}

async function main() {
  await mkdir(browserCacheDir, { recursive: true })

  const executablePath = await installBrowser()
  const metadata: BrowserInstallMetadata = {
    channel: 'chrome@stable',
    executablePath,
    installedAt: new Date().toISOString(),
  }

  await writeFile(browserMetadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8')
  console.log(`Installed Chrome for Testing for plugin debugging to: ${executablePath}`)
  console.log(`Metadata written to: ${browserMetadataPath}`)
}

async function installBrowser() {
  const stdoutChunks: string[] = []
  const stderrChunks: string[] = []

  const child = spawn(installCommand[0], installCommand.slice(1), {
    cwd: repoRoot,
    shell: process.platform === 'win32',
    stdio: ['inherit', 'pipe', 'pipe'],
  })

  child.stdout.on('data', (chunk) => {
    const text = chunk.toString()
    stdoutChunks.push(text)
    process.stdout.write(text)
  })

  child.stderr.on('data', (chunk) => {
    const text = chunk.toString()
    stderrChunks.push(text)
    process.stderr.write(text)
  })

  const exitCode = await new Promise<number>((resolve, reject) => {
    child.on('error', reject)
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`Browser install terminated by signal: ${signal}`))
        return
      }

      resolve(code ?? 1)
    })
  })

  if (exitCode !== 0) {
    throw new Error(`Chrome for Testing install failed with exit code ${exitCode}.`)
  }

  const installedPath = stdoutChunks
    .join('')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .at(-1)

  if (!installedPath) {
    const stderrOutput = stderrChunks.join('').trim()
    throw new Error(
      stderrOutput
        ? `Unable to determine installed browser path. Installer stderr: ${stderrOutput}`
        : 'Unable to determine installed browser path from installer output.',
    )
  }

  return installedPath
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
