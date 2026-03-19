import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import {
  pluginRoot,
  readInstalledChromeExecutablePath,
  writeResolvedPlaywrightPluginConfig,
} from './playwright-plugin-config.ts'

const sessionName = 'plugin-popup-verify'
const configFilename = 'playwright-plugin.verify.resolved.json'
const localAppUrl = 'http://localhost:7749'
const localApiUrl = 'http://localhost:9981'
const localToken = '12345678'
const verifyFolderName = 'Playwright Verify'
const extensionOutputPath = path.resolve(pluginRoot, '../../dist/extension')

async function main() {
  await ensureLocalServices()
  const folder = await ensureVerifyFolder()
  const executablePath = await readInstalledChromeExecutablePath()
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'web-archive-plugin-popup-'))
  const { runtimeConfigPath } = await writeResolvedPlaywrightPluginConfig({
    filename: configFilename,
    executablePath,
  })
  await patchRuntimeConfig(runtimeConfigPath, userDataDir)

  await safeCloseSession()

  try {
    await runPlaywrightCli([
      `-s=${sessionName}`,
      'open',
      '--persistent',
      `--config=${runtimeConfigPath}`,
      localAppUrl,
    ])

    await runPlaywrightCli([
      `-s=${sessionName}`,
      'run-code',
      buildVerificationCode(folder.id),
    ], { captureOutput: true })
  }
  finally {
    await safeCloseSession()
    await rm(userDataDir, { recursive: true, force: true })
  }
}

async function ensureLocalServices() {
  await assertHttpOk(localAppUrl, 'Local frontend is not reachable')

  const authStatuses = []
  for (let index = 0; index < 2; index += 1) {
    const response = await fetch(`${localApiUrl}/api/auth`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localToken}`,
      },
    })
    authStatuses.push(response.status)

    if (response.ok && response.status !== 201) {
      return
    }
  }

  throw new Error(
    `Local backend auth setup failed. Observed statuses: ${authStatuses.join(', ')}`,
  )
}

async function ensureVerifyFolder() {
  const folders = await fetchJson<Array<{ id: number, name: string }>>(
    `${localApiUrl}/api/folders/all`,
    {
      method: 'GET',
    },
  )
  const existingFolder = folders.find(folder => folder.name === verifyFolderName)
  if (existingFolder) {
    return existingFolder
  }

  return await fetchJson<{ id: number, name: string }>(
    `${localApiUrl}/api/folders/create`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: verifyFolderName }),
    },
  )
}

async function fetchJson<T>(url: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${localToken}`,
      ...(init.headers ?? {}),
    },
  })

  const payload = await response.json() as {
    code?: number
    data?: T
    message?: string
    error?: string
  }

  if (!response.ok || payload.code !== 200 || payload.data === undefined) {
    throw new Error(
      `Request failed for ${url}: ${response.status} ${payload.message ?? payload.error ?? 'Unknown error'}`,
    )
  }

  return payload.data
}

async function assertHttpOk(url: string, errorPrefix: string) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
  }
  catch (error) {
    throw new Error(
      `${errorPrefix}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

async function runPlaywrightCli(
  args: string[],
  options?: {
    quiet?: boolean
    captureOutput?: boolean
  },
) {
  try {
    const output = execFileSync('playwright-cli', args, {
      cwd: pluginRoot,
      stdio: options?.captureOutput
        ? 'pipe'
        : options?.quiet
          ? 'ignore'
          : 'inherit',
      encoding: options?.captureOutput ? 'utf8' : undefined,
    })

    if (options?.captureOutput && typeof output === 'string') {
      process.stdout.write(output)
      if (output.includes('### Error')) {
        throw new Error('playwright-cli reported a runtime error')
      }
    }
  }
  catch (error: any) {
    throw new Error(
      `playwright-cli ${args[0] ?? ''} failed: ${error?.message ?? String(error)}`,
    )
  }
}

async function safeCloseSession() {
  try {
    await runPlaywrightCli([`-s=${sessionName}`, 'close'], { quiet: true })
  }
  catch {
    // ignore missing session or already closed browser
  }
}

async function patchRuntimeConfig(runtimeConfigPath: string, userDataDir: string) {
  const runtimeConfig = JSON.parse(
    await readFile(runtimeConfigPath, 'utf8'),
  ) as {
    browser?: {
      userDataDir?: string
    }
  }

  runtimeConfig.browser = {
    ...(runtimeConfig.browser ?? {}),
    userDataDir,
  }

  await writeFile(runtimeConfigPath, `${JSON.stringify(runtimeConfig, null, 2)}\n`, 'utf8')
}

function buildVerificationCode(folderId: number) {
  const escapedAppUrl = JSON.stringify(localAppUrl)
  const escapedToken = JSON.stringify(localToken)

  return `
async page => {
  const appUrl = ${escapedAppUrl}
  const token = ${escapedToken}
  const expectedPageDesc = await page.evaluate(() => document.getElementsByName('description')[0]?.getAttribute('content') ?? '')
  const expectedPageInfo = {
    title: await page.title(),
    href: page.url(),
    pageDesc: expectedPageDesc,
  }

  const browser = page.context().browser()
  if (!browser?.newBrowserCDPSession) {
    throw new Error('Current playwright-cli runtime does not expose browser.newBrowserCDPSession()')
  }

  const serviceWorker = await waitForServiceWorker(page.context())
  const extensionId = getExtensionId(serviceWorker)
  const browserSession = await browser.newBrowserCDPSession()

  await serviceWorker.evaluate(async ({ appUrl, token }) => {
    await chrome.storage.local.set({
      serverUrl: appUrl,
      token,
      loginStatus: true,
      tasks: [],
    })
  }, { appUrl, token })

  const currentTargets = await browserSession.send('Target.getTargets')
  const pageTarget = currentTargets.targetInfos.find((target) => {
    return target.type === 'page' && target.url === page.url()
  })

  if (!pageTarget?.targetId) {
    throw new Error(\`Unable to resolve targetId for business page: \${page.url()}\`)
  }

  await serviceWorker.evaluate(async () => {
    await chrome.action.openPopup()
  }).catch((error) => {
    throw new Error(\`chrome.action.openPopup() failed: \${String(error)}\`)
  })

  const popupTarget = await waitForPopupTarget(browserSession, extensionId)
  const popupRuntime = await attachToTarget(browserSession, popupTarget.targetId)

  await popupRuntime.evaluate(\`localStorage.setItem('folderList', JSON.stringify([{ id: ${folderId}, name: 'Playwright Verify' }])); localStorage.setItem('lastChooseFolderId', '${folderId}'); true\`)

  const activeTabs = await popupRuntime.evaluate(\`chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => tabs.map(tab => ({ id: tab.id, url: tab.url, title: tab.title, active: tab.active })))\`)
  if (!Array.isArray(activeTabs) || !activeTabs.length) {
    throw new Error('Popup did not report any active tab')
  }
  if (!String(activeTabs[0].url || '').startsWith(appUrl)) {
    throw new Error(\`Popup resolved the wrong active tab: \${JSON.stringify(activeTabs)}\`)
  }

  await waitFor(
    () => popupRuntime.evaluate(\`(() => [...document.querySelectorAll('button')].some(button => { const text = (button.textContent || '').trim().toLowerCase(); return !button.disabled && (text.includes('保存页面') || text.includes('save page')); }))()\`),
    'Save page button did not become clickable in popup',
  )

  await popupRuntime.evaluate(\`(() => { const button = [...document.querySelectorAll('button')].find(button => { const text = (button.textContent || '').trim().toLowerCase(); return !button.disabled && (text.includes('保存页面') || text.includes('save page')); }); if (!button) throw new Error('Save page button not found'); button.click(); return true; })()\`)

  await waitFor(
    () => popupRuntime.evaluate(\`Boolean(document.querySelector('input[name="title"]'))\`),
    'Upload page form did not appear',
  )

  const formState = await popupRuntime.evaluate(\`({ title: document.querySelector('input[name="title"]')?.value ?? null, pageDesc: document.querySelector('textarea[name="pageDesc"]')?.value ?? null, text: document.body.innerText })\`)
  if (formState.title !== expectedPageInfo.title) {
    throw new Error(\`Prefilled title mismatch. Expected "\${expectedPageInfo.title}", got "\${formState.title}"\`)
  }
  if (formState.pageDesc !== expectedPageInfo.pageDesc) {
    throw new Error(\`Prefilled pageDesc mismatch. Expected "\${expectedPageInfo.pageDesc}", got "\${formState.pageDesc}"\`)
  }

  await popupRuntime.evaluate(\`(() => { const button = [...document.querySelectorAll('button')].find(button => { const text = (button.textContent || '').trim().toLowerCase(); return !button.disabled && (text.includes('确认') || text.includes('confirm')); }); if (!button) throw new Error('Confirm button not found'); button.click(); return true; })()\`)

  await waitFor(async () => {
    const { tasks } = await serviceWorker.evaluate(async () => {
      return await chrome.storage.local.get('tasks')
    })
    const taskList = Array.isArray(tasks) ? tasks : []
    const latestTask = taskList.at(-1)
    if (!latestTask) {
      return false
    }
    if (latestTask.status === 'failed') {
      throw new Error(\`Task failed: \${latestTask.errorMessage || 'Unknown error'}\`)
    }
    if (latestTask.status !== 'done') {
      return false
    }
    if (latestTask.href !== expectedPageInfo.href) {
      throw new Error(\`Saved href mismatch. Expected "\${expectedPageInfo.href}", got "\${latestTask.href}"\`)
    }
    if (latestTask.title !== expectedPageInfo.title) {
      throw new Error(\`Saved title mismatch. Expected "\${expectedPageInfo.title}", got "\${latestTask.title}"\`)
    }
    if (latestTask.pageDesc !== expectedPageInfo.pageDesc) {
      throw new Error(\`Saved pageDesc mismatch. Expected "\${expectedPageInfo.pageDesc}", got "\${latestTask.pageDesc}"\`)
    }
    return latestTask
  }, 'Save task did not reach done status', 30_000)

  return {
    extensionId,
    popupTargetId: popupTarget.targetId,
    activeTabs,
    expectedPageInfo,
    formState,
  }

  async function waitForServiceWorker(context) {
    const existingWorker = context.serviceWorkers()[0]
    if (existingWorker) {
      return existingWorker
    }

    return await context.waitForEvent('serviceworker', { timeout: 10_000 })
  }

  function getExtensionId(serviceWorker) {
    const extensionId = serviceWorker.url().split('/')[2]
    if (!extensionId) {
      throw new Error(\`Unable to resolve extension ID from service worker URL: \${serviceWorker.url()}\`)
    }

    return extensionId
  }

  async function waitForPopupTarget(session, extensionId) {
    const popupUrlPrefix = \`chrome-extension://\${extensionId}/popup.html\`
    return await waitFor(async () => {
      const targets = await session.send('Target.getTargets')
      return targets.targetInfos.find(target => (target.url || '').startsWith(popupUrlPrefix))
    }, 'Popup target did not appear after Extensions.triggerAction')
  }

  async function attachToTarget(session, targetId) {
    let nextMessageId = 0
    const pending = new Map()
    const onMessage = (event) => {
      const message = JSON.parse(event.message)
      if (!message.id || !pending.has(message.id)) {
        return
      }

      const entry = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) {
        entry.reject(new Error(message.error.message || JSON.stringify(message.error)))
      }
      else {
        entry.resolve(message.result)
      }
    }

    session.on('Target.receivedMessageFromTarget', onMessage)
    const attached = await session.send('Target.attachToTarget', {
      targetId,
      flatten: false,
    })

    const sendToTarget = async (method, params = {}) => {
      const id = ++nextMessageId
      const resultPromise = new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
      await session.send('Target.sendMessageToTarget', {
        sessionId: attached.sessionId,
        message: JSON.stringify({ id, method, params }),
      })
      return await resultPromise
    }

    await sendToTarget('Runtime.enable')

    return {
      async evaluate(expression) {
        const result = await sendToTarget('Runtime.evaluate', {
          expression,
          awaitPromise: true,
          returnByValue: true,
        })
        return result.result?.value
      },
    }
  }

  async function waitFor(fn, errorMessage, timeoutMs = 10_000) {
    const startedAt = Date.now()
    while (Date.now() - startedAt < timeoutMs) {
      const result = await fn()
      if (result) {
        return result
      }
      await page.waitForTimeout(250)
    }
    throw new Error(errorMessage)
  }
}
  `.trim()
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
