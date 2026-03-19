import { spawn } from 'node:child_process'
import process from 'node:process'
import {
  pluginRoot,
  readInstalledChromeExecutablePath,
  tryReadInstalledChromeExecutablePath,
  writeResolvedPlaywrightPluginConfig,
} from './playwright-plugin-config.ts'

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
  const { runtimeConfigPath } = await writeResolvedPlaywrightPluginConfig({
    executablePath,
  })

  const cliArgs = ['open', `--config=${runtimeConfigPath}`, ...forwardedArgs]
  const child = spawn(
    process.platform === 'win32' ? 'playwright-cli.cmd' : 'playwright-cli',
    cliArgs,
    {
      cwd: pluginRoot,
      stdio: 'inherit',
    },
  )

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
      return
    }

    process.exit(code ?? 1)
  })
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
