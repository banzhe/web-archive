import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import puppeteer, { type Browser, type Page, type WebWorker } from 'puppeteer-core'
import {
  assertExtensionBuildOutput,
  buildPuppeteerLaunchOptions,
  resolveBrowserExecutablePath,
} from '../scripts/puppeteer-plugin-runtime.ts'

declare const chrome: any

const localAppUrl = 'http://localhost:7749'
const localApiUrl = 'http://localhost:9981'
const localToken = '12345678'
const verifyFolderName = 'Puppeteer Verify'
const targetPageUrl = process.env.PLUGIN_VERIFY_PAGE_URL ?? localAppUrl
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

async function main() {
  await ensureLocalServices()
  await assertExtensionBuildOutput()

  const verifyFolder = await ensureVerifyFolder()
  const executablePath = await resolveBrowserExecutablePath()
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'web-archive-plugin-popup-'))

  let browser: Browser | undefined

  try {
    browser = await puppeteer.launch(buildPuppeteerLaunchOptions({
      executablePath,
      userDataDir,
    }))

    const serviceWorker = await waitForServiceWorker(browser)
    const extensionId = getExtensionId(serviceWorker)

    await seedExtensionStorage(serviceWorker)

    const page = await browser.newPage()
    await page.goto(targetPageUrl, { waitUntil: 'domcontentloaded' })
    await page.bringToFront()

    const expectedPageInfo = await getExpectedPageInfo(page)
    const popupPage = await openPopup(browser, serviceWorker, extensionId)

    try {
      await seedPopupLocalStorage(popupPage, verifyFolder)
      await assertPopupActiveTab(popupPage, expectedPageInfo.href)
      await clickSavePage(popupPage)
      await assertPrefilledForm(popupPage, expectedPageInfo)
      await clickConfirm(popupPage)
      await assertTaskDone(serviceWorker, expectedPageInfo)
    }
    finally {
      await popupPage.close().catch(() => {})
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
    if (browser) {
      await browser.close().catch(() => {})
    }
    await rm(userDataDir, { recursive: true, force: true })
  }
}

async function ensureLocalServices() {
  await assertHttpOk(localAppUrl, 'Local frontend is not reachable')

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

async function waitForServiceWorker(browser: Browser) {
  const serviceWorkerTarget = await browser.waitForTarget(target => (
    target.type() === 'service_worker'
    && target.url().startsWith('chrome-extension://')
  ), {
    timeout: defaultTimeoutMs,
  }).catch(() => undefined)

  if (!serviceWorkerTarget) {
    throw new Error('Extension service worker did not appear')
  }

  const worker = await serviceWorkerTarget.worker()
  if (!worker) {
    throw new Error(`Unable to attach to service worker target: ${serviceWorkerTarget.url()}`)
  }

  return worker
}

function getExtensionId(serviceWorker: WebWorker) {
  const url = serviceWorker.url()
  const extensionId = url.split('/')[2]
  if (!extensionId) {
    throw new Error(`Unable to resolve extension ID from service worker URL: ${url}`)
  }

  return extensionId
}

async function seedExtensionStorage(serviceWorker: WebWorker) {
  await waitFor(async () => {
    return await serviceWorker.evaluate(() => {
      return Boolean(globalThis.chrome?.storage?.local)
    }).catch(() => false)
  }, 'Extension storage API did not become ready')

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
  const pageDesc = await page.evaluate(() => (
    document.querySelector('meta[name="description"]')?.getAttribute('content') ?? ''
  ))

  return {
    title: await page.title(),
    href: page.url(),
    pageDesc,
  }
}

async function openPopup(browser: Browser, serviceWorker: WebWorker, extensionId: string) {
  await serviceWorker.evaluate(async () => {
    await chrome.action.openPopup()
  }).catch((error) => {
    throw new Error(`chrome.action.openPopup() failed: ${String(error)}`)
  })

  const popupTarget = await browser.waitForTarget(target => (
    target.type() === 'page'
    && target.url().startsWith(`chrome-extension://${extensionId}/popup.html`)
  ), {
    timeout: popupOpenTimeoutMs,
  }).catch(() => undefined)

  if (!popupTarget) {
    throw new Error('Popup target did not appear after chrome.action.openPopup()')
  }

  const popupPage = await popupTarget.asPage()

  await popupPage.waitForFunction(() => document.readyState === 'complete', {
    timeout: defaultTimeoutMs,
  }).catch(() => {})

  return popupPage
}

async function seedPopupLocalStorage(popupPage: Page, verifyFolder: VerifyFolder) {
  await popupPage.evaluate((folder) => {
    localStorage.setItem('folderList', JSON.stringify([folder]))
    localStorage.setItem('lastChooseFolderId', String(folder.id))
  }, verifyFolder)
}

async function assertPopupActiveTab(popupPage: Page, expectedHref: string) {
  const activeTabs = await popupPage.evaluate(() => (
    chrome.tabs.query({ active: true, currentWindow: true }).then((tabs: any[]) => tabs.map((tab: any) => ({
      id: tab.id,
      url: tab.url,
      title: tab.title,
      active: tab.active,
    })))
  )) as Array<{ id?: number, url?: string, title?: string, active?: boolean }>

  if (!activeTabs.length) {
    throw new Error('Popup did not resolve the active tab')
  }

  if (String(activeTabs[0].url ?? '') !== expectedHref) {
    throw new Error(`Popup resolved the wrong active tab: ${JSON.stringify(activeTabs)}`)
  }
}

async function clickSavePage(popupPage: Page) {
  await waitFor(async () => {
    return await hasClickableButton(popupPage, ['保存页面', 'save page'])
  }, 'Save page button did not become clickable in popup')

  await clickButton(popupPage, ['保存页面', 'save page'])
}

async function assertPrefilledForm(popupPage: Page, expectedPageInfo: ExpectedPageInfo) {
  await waitFor(async () => {
    const state = await popupPage.evaluate(() => ({
      title: (document.querySelector('input[name="title"]') as HTMLInputElement | null)?.value ?? null,
      pageDesc: (document.querySelector('textarea[name="pageDesc"]') as HTMLTextAreaElement | null)?.value ?? null,
    })) as { title: string | null, pageDesc: string | null }

    return state.title !== null && state.pageDesc !== null ? state : undefined
  }, 'Upload page form did not appear')

  const formState = await popupPage.evaluate(() => ({
    title: (document.querySelector('input[name="title"]') as HTMLInputElement | null)?.value ?? null,
    pageDesc: (document.querySelector('textarea[name="pageDesc"]') as HTMLTextAreaElement | null)?.value ?? null,
  })) as { title: string | null, pageDesc: string | null }

  if (formState.title !== expectedPageInfo.title) {
    throw new Error(`Prefilled title mismatch. Expected "${expectedPageInfo.title}", got "${formState.title}"`)
  }

  if (formState.pageDesc !== expectedPageInfo.pageDesc) {
    throw new Error(`Prefilled pageDesc mismatch. Expected "${expectedPageInfo.pageDesc}", got "${formState.pageDesc}"`)
  }
}

async function clickConfirm(popupPage: Page) {
  await waitFor(async () => {
    return await hasClickableButton(popupPage, ['确认', 'confirm'])
  }, 'Confirm button did not become clickable')

  await clickButton(popupPage, ['确认', 'confirm'])
}

async function assertTaskDone(serviceWorker: WebWorker, expectedPageInfo: ExpectedPageInfo) {
  const task = await waitFor(async () => {
    const { tasks } = await serviceWorker.evaluate(async () => {
      return await chrome.storage.local.get('tasks')
    }) as { tasks?: StoredTask[] }

    const latestTask = tasks?.at(-1)
    if (!latestTask) {
      return undefined
    }

    if (latestTask.status === 'failed') {
      throw new Error(`Save task failed: ${latestTask.errorMessage || 'Unknown error'}`)
    }

    if (latestTask.status !== 'done') {
      return undefined
    }

    return latestTask
  }, 'Save task did not reach done status', 60_000)

  if (task.href !== expectedPageInfo.href) {
    throw new Error(`Saved href mismatch. Expected "${expectedPageInfo.href}", got "${task.href}"`)
  }

  if (task.title !== expectedPageInfo.title) {
    throw new Error(`Saved title mismatch. Expected "${expectedPageInfo.title}", got "${task.title}"`)
  }

  if (task.pageDesc !== expectedPageInfo.pageDesc) {
    throw new Error(`Saved pageDesc mismatch. Expected "${expectedPageInfo.pageDesc}", got "${task.pageDesc}"`)
  }
}

async function hasClickableButton(popupPage: Page, buttonTexts: string[]) {
  return await popupPage.evaluate((texts) => {
    return [...document.querySelectorAll('button')].some((button) => {
      const text = (button.textContent || '').trim().toLowerCase()
      return !button.disabled && texts.some(label => text.includes(label.toLowerCase()))
    })
  }, buttonTexts)
}

async function clickButton(popupPage: Page, buttonTexts: string[]) {
  await popupPage.evaluate((texts) => {
    const button = [...document.querySelectorAll('button')].find((item) => {
      const text = (item.textContent || '').trim().toLowerCase()
      return texts.some(label => text.includes(label.toLowerCase()))
    }) as HTMLButtonElement | undefined

    if (!button || button.disabled) {
      throw new Error(`Button not found: ${texts.join(', ')}`)
    }

    button.click()
  }, buttonTexts)
}

async function waitFor<T>(
  fn: () => Promise<T | undefined | false>,
  errorMessage: string,
  timeoutMs = defaultTimeoutMs,
) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const result = await fn()
    if (result) {
      return result
    }

    await new Promise(resolve => setTimeout(resolve, 250))
  }

  throw new Error(errorMessage)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
