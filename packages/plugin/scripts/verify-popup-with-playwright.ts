import { access, mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { type BrowserContext, type CDPSession, type Page, type Worker, chromium } from 'playwright'
import {
  pluginRoot,
  readInstalledChromeExecutablePath,
} from './playwright-plugin-config.ts'

const localAppUrl = 'http://localhost:7749'
const localApiUrl = 'http://localhost:9981'
const localToken = '12345678'
const verifyFolderName = 'Playwright Verify'
const targetPageUrl = process.env.PLUGIN_VERIFY_PAGE_URL ?? localAppUrl
const extensionOutputPath = path.resolve(pluginRoot, '../../dist/extension')
const extensionManifestPath = path.join(extensionOutputPath, 'manifest.json')
const popupOpenTimeoutMs = 15_000
const defaultTimeoutMs = 30_000

type VerifyFolder = {
  id: number
  name: string
}

type ExpectedPageInfo = {
  title: string
  href: string
  pageDesc: string
}

type StoredTask = {
  status?: string
  href?: string
  title?: string
  pageDesc?: string
  errorMessage?: string
}

type TargetInfo = {
  targetId: string
  url: string
  type: string
}

type PopupRuntime = {
  evaluate: <T = unknown>(expression: string) => Promise<T>
  dispose: () => Promise<void>
}

async function main() {
  await ensureLocalServices()
  await ensureExtensionBuildOutput()

  const verifyFolder = await ensureVerifyFolder()
  const executablePath = await readInstalledChromeExecutablePath()
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'web-archive-plugin-popup-'))

  let context: BrowserContext | undefined

  try {
    context = await chromium.launchPersistentContext(userDataDir, {
      executablePath,
      headless: false,
      args: [
        '--disable-features=DisableLoadExtensionCommandLineSwitch,DisableDisableExtensionsExceptCommandLineSwitch',
        `--disable-extensions-except=${extensionOutputPath}`,
        `--load-extension=${extensionOutputPath}`,
      ],
    })

    const serviceWorker = await waitForServiceWorker(context)
    const extensionId = getExtensionId(serviceWorker)
    const browserSession = await context.browser()!.newBrowserCDPSession()

    await seedExtensionStorage(serviceWorker)

    const page = context.pages()[0] ?? await context.newPage()
    await page.goto(targetPageUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')

    const expectedPageInfo = await getExpectedPageInfo(page)
    const popupTarget = await openPopup(browserSession, serviceWorker, extensionId)
    const popupRuntime = await attachToPopupTarget(browserSession, popupTarget.targetId)

    try {
      await seedPopupLocalStorage(popupRuntime, verifyFolder)
      await assertPopupActiveTab(popupRuntime, expectedPageInfo.href)

      await clickSavePage(popupRuntime)
      await assertPrefilledForm(popupRuntime, expectedPageInfo)
      await clickConfirm(popupRuntime)
      await assertTaskDone(serviceWorker, expectedPageInfo)
    }
    finally {
      await popupRuntime.dispose()
    }

    console.log('Popup verification passed.')
    console.log(JSON.stringify({
      extensionId,
      targetPageUrl,
      expectedPageInfo,
      verifyFolder,
    }, null, 2))
  }
  finally {
    await context?.close()
    await rm(userDataDir, { recursive: true, force: true })
  }
}

async function ensureLocalServices() {
  await assertHttpOk(localAppUrl, '本地前端不可访问')

  const authStatuses: number[] = []
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
    `本地后端认证初始化失败，返回状态码: ${authStatuses.join(', ')}`,
  )
}

async function ensureExtensionBuildOutput() {
  try {
    await access(extensionManifestPath)
  }
  catch {
    throw new Error(
      [
        '扩展构建产物不存在。',
        '请先运行 `pnpm --filter plugin build`。',
        `期望文件: ${extensionManifestPath}`,
      ].join('\n'),
    )
  }
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
      `请求失败 ${url}: ${response.status} ${payload.message ?? payload.error ?? 'Unknown error'}`,
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

async function waitForServiceWorker(context: BrowserContext) {
  const existingWorker = context.serviceWorkers()[0]
  if (existingWorker) {
    return existingWorker
  }

  try {
    return await context.waitForEvent('serviceworker', {
      timeout: defaultTimeoutMs,
    })
  }
  catch {
    throw new Error('扩展 service worker 未出现')
  }
}

function getExtensionId(serviceWorker: Worker) {
  const extensionId = serviceWorker.url().split('/')[2]
  if (!extensionId) {
    throw new Error(`无法从 service worker URL 解析扩展 ID: ${serviceWorker.url()}`)
  }

  return extensionId
}

async function seedExtensionStorage(serviceWorker: Worker) {
  await serviceWorker.evaluate(async ({ appUrl, token }) => {
    await chrome.storage.local.set({
      serverUrl: appUrl,
      token,
      loginStatus: true,
      tasks: [],
    })
  }, {
    appUrl: localAppUrl,
    token: localToken,
  })
}

async function getExpectedPageInfo(page: Page): Promise<ExpectedPageInfo> {
  const pageDesc = await page.locator('meta[name="description"]').evaluateAll((elements) => {
    const first = elements[0] as HTMLMetaElement | undefined
    return first?.content ?? ''
  })

  return {
    title: await page.title(),
    href: page.url(),
    pageDesc,
  }
}

async function openPopup(
  browserSession: CDPSession,
  serviceWorker: Worker,
  extensionId: string,
) {
  try {
    await serviceWorker.evaluate(async () => {
      await chrome.action.openPopup()
    })
  }
  catch (error) {
    throw new Error(
      `chrome.action.openPopup() 调用失败: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  return await waitFor(async () => {
    const targets = await browserSession.send('Target.getTargets') as { targetInfos: TargetInfo[] }
    return targets.targetInfos.find(candidate => (
      candidate.type === 'page'
      && candidate.url.startsWith(`chrome-extension://${extensionId}/popup.html`)
    ))
  }, {
    timeoutMs: popupOpenTimeoutMs,
    errorMessage: '调用 chrome.action.openPopup() 后未出现 popup 页面',
  })
}

async function attachToPopupTarget(browserSession: CDPSession, targetId: string): Promise<PopupRuntime> {
  const pending = new Map<number, {
    resolve: (value: any) => void
    reject: (error: Error) => void
  }>()
  let nextMessageId = 0

  const attached = await browserSession.send('Target.attachToTarget', {
    targetId,
    flatten: false,
  }) as { sessionId: string }

  const onMessage = (event: { sessionId?: string, message: string }) => {
    if (event.sessionId !== attached.sessionId) {
      return
    }

    const message = JSON.parse(event.message) as {
      id?: number
      error?: { message?: string }
      result?: unknown
    }

    if (!message.id || !pending.has(message.id)) {
      return
    }

    const task = pending.get(message.id)!
    pending.delete(message.id)

    if (message.error) {
      task.reject(new Error(message.error.message ?? JSON.stringify(message.error)))
      return
    }

    task.resolve(message.result)
  }

  browserSession.on('Target.receivedMessageFromTarget', onMessage)

  async function sendToTarget(method: string, params: Record<string, unknown> = {}) {
    const id = ++nextMessageId
    const resultPromise = new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
    })

    await browserSession.send('Target.sendMessageToTarget', {
      sessionId: attached.sessionId,
      message: JSON.stringify({
        id,
        method,
        params,
      }),
    })

    return await resultPromise
  }

  await sendToTarget('Runtime.enable')

  return {
    async evaluate<T>(expression: string) {
      const result = await sendToTarget('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
      }) as {
        result?: {
          value?: T
        }
        exceptionDetails?: {
          text?: string
        }
      }

      if (result.exceptionDetails) {
        throw new Error(result.exceptionDetails.text ?? 'Popup runtime evaluation failed')
      }

      return result.result?.value as T
    },
    async dispose() {
      browserSession.off('Target.receivedMessageFromTarget', onMessage)
      pending.forEach(({ reject }) => reject(new Error('Popup runtime session disposed')))
      pending.clear()
      await browserSession.send('Target.detachFromTarget', {
        sessionId: attached.sessionId,
      }).catch(() => {})
    },
  }
}

async function seedPopupLocalStorage(popupRuntime: PopupRuntime, verifyFolder: VerifyFolder) {
  await popupRuntime.evaluate(`(() => {
    localStorage.setItem('folderList', ${JSON.stringify(JSON.stringify([verifyFolder]))})
    localStorage.setItem('lastChooseFolderId', ${JSON.stringify(String(verifyFolder.id))})
    return true
  })()`)
}

async function assertPopupActiveTab(popupRuntime: PopupRuntime, expectedHref: string) {
  const activeTabs = await popupRuntime.evaluate<Array<{ id?: number, url?: string, title?: string, active?: boolean }>>(`chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => tabs.map(tab => ({
    id: tab.id,
    url: tab.url,
    title: tab.title,
    active: tab.active,
  })))`)

  if (!activeTabs.length) {
    throw new Error('popup 未解析到当前活动标签页')
  }

  if (String(activeTabs[0].url ?? '') !== expectedHref) {
    throw new Error(`popup 解析到的活动标签页不是业务页: ${JSON.stringify(activeTabs)}`)
  }
}

async function clickSavePage(popupRuntime: PopupRuntime) {
  await waitFor(async () => {
    return await popupRuntime.evaluate<boolean>(`(() => {
      const button = [...document.querySelectorAll('button')].find((item) => {
        const text = (item.textContent || '').trim().toLowerCase()
        return text.includes('保存页面') || text.includes('save page')
      })
      return Boolean(button && !button.disabled)
    })()`)
  }, {
    timeoutMs: defaultTimeoutMs,
    errorMessage: 'popup 中“保存页面”按钮未变为可点击状态',
  })

  await popupRuntime.evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find((item) => {
      const text = (item.textContent || '').trim().toLowerCase()
      return text.includes('保存页面') || text.includes('save page')
    })
    if (!button || button.disabled) {
      throw new Error('Save page button not found')
    }
    button.click()
    return true
  })()`)
}

async function assertPrefilledForm(popupRuntime: PopupRuntime, expectedPageInfo: ExpectedPageInfo) {
  const formState = await waitFor(async () => {
    const state = await popupRuntime.evaluate<{ title: string | null, pageDesc: string | null }>(`(() => ({
      title: document.querySelector('input[name="title"]')?.value ?? null,
      pageDesc: document.querySelector('textarea[name="pageDesc"]')?.value ?? null,
    }))()`)
    return state.title !== null && state.pageDesc !== null ? state : undefined
  }, {
    timeoutMs: defaultTimeoutMs,
    errorMessage: '点击“保存页面”后未出现上传表单',
  })

  if (formState.title !== expectedPageInfo.title) {
    throw new Error(`预填 title 不匹配。期望 "${expectedPageInfo.title}"，实际 "${formState.title}"`)
  }

  if (formState.pageDesc !== expectedPageInfo.pageDesc) {
    throw new Error(`预填 pageDesc 不匹配。期望 "${expectedPageInfo.pageDesc}"，实际 "${formState.pageDesc}"`)
  }
}

async function clickConfirm(popupRuntime: PopupRuntime) {
  await waitFor(async () => {
    return await popupRuntime.evaluate<boolean>(`(() => {
      const button = [...document.querySelectorAll('button')].find((item) => {
        const text = (item.textContent || '').trim().toLowerCase()
        return text === '确认' || text === 'confirm'
      })
      return Boolean(button && !button.disabled)
    })()`)
  }, {
    timeoutMs: defaultTimeoutMs,
    errorMessage: '上传表单中的“确认”按钮不可点击',
  })

  await popupRuntime.evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find((item) => {
      const text = (item.textContent || '').trim().toLowerCase()
      return text === '确认' || text === 'confirm'
    })
    if (!button || button.disabled) {
      throw new Error('Confirm button not found')
    }
    button.click()
    return true
  })()`)
}

async function assertTaskDone(serviceWorker: Worker, expectedPageInfo: ExpectedPageInfo) {
  const task = await waitFor(async () => {
    const { tasks } = await serviceWorker.evaluate(async () => {
      return await chrome.storage.local.get('tasks')
    }) as { tasks?: StoredTask[] }

    const latestTask = tasks?.at(-1)
    if (!latestTask) {
      return undefined
    }

    if (latestTask.status === 'failed') {
      throw new Error(`保存任务失败: ${latestTask.errorMessage ?? 'Unknown error'}`)
    }

    if (latestTask.status !== 'done') {
      return undefined
    }

    return latestTask
  }, {
    timeoutMs: 60_000,
    errorMessage: '保存任务未在超时时间内进入 done 状态',
  })

  if (task.href !== expectedPageInfo.href) {
    throw new Error(`保存任务的 href 不匹配。期望 "${expectedPageInfo.href}"，实际 "${task.href}"`)
  }

  if (task.title !== expectedPageInfo.title) {
    throw new Error(`保存任务的 title 不匹配。期望 "${expectedPageInfo.title}"，实际 "${task.title}"`)
  }

  if (task.pageDesc !== expectedPageInfo.pageDesc) {
    throw new Error(`保存任务的 pageDesc 不匹配。期望 "${expectedPageInfo.pageDesc}"，实际 "${task.pageDesc}"`)
  }
}

async function waitFor<T>(
  fn: () => Promise<T | undefined | false>,
  options: {
    timeoutMs: number
    errorMessage: string
    intervalMs?: number
  },
) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < options.timeoutMs) {
    const result = await fn()
    if (result) {
      return result
    }

    await new Promise(resolve => setTimeout(resolve, options.intervalMs ?? 250))
  }

  throw new Error(options.errorMessage)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
