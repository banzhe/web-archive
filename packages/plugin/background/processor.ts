import { sendMessage } from 'webext-bridge/background'
import Browser from 'webextension-polyfill'
import { request } from './background'
import { keepAlive } from './keepAlive'
import type { SingleFileSetting } from '~/utils/singleFile'
import { base64ToBlob } from '~/utils/file'

export interface SeriableSingleFileTask {
  uuid: string
  status: 'init' | 'scraping' | 'uploading' | 'done' | 'failed'
  progress: number
  href: string
  tabId: number
  title: string
  pageDesc: string
  folderId: string
  bindTags: string[]
  isShowcased: boolean
  startTimeStamp: number
  endTimeStamp?: number
  errorMessage?: string
}

async function markUnfinishedTasksAsFailed() {
  const tasks = await getTaskList()
  tasks.forEach((task: SeriableSingleFileTask) => {
    if (task.status !== 'done' && task.status !== 'failed') {
      task.status = 'failed'
      task.endTimeStamp = Date.now()
      task.errorMessage = 'Failed because of service worker restart'
    }
  })
  await saveTaskList(tasks)
}

let isInit = false
Browser.runtime.onConnect.addListener(() => {
  console.log('connect', isInit)
  if (!isInit) {
    isInit = true
    markUnfinishedTasksAsFailed()
  }
})

async function getTaskList(): Promise<SeriableSingleFileTask[]> {
  const { tasks } = await Browser.storage.local.get('tasks')
  return tasks || []
}

async function saveTaskList(tasks: SeriableSingleFileTask[]) {
  await Browser.storage.local.set({ tasks })
}

async function saveTask(task: SeriableSingleFileTask) {
  const tasks = await getTaskList()

  const index = tasks.findIndex(t => t.uuid === task.uuid)
  if (index === -1) {
    tasks.push(task)
  }
  else {
    tasks[index] = task
  }
  await Browser.storage.local.set({ tasks })
}

async function clearFinishedTaskList() {
  const tasks = await getTaskList()

  const newTasks = tasks.filter(task => task.status !== 'done' && task.status !== 'failed')
  await saveTaskList(newTasks)
}

type CreateTaskOptions = {
  tabId: number
  pageForm: {
    href: string
    title: string
    pageDesc: string
    folderId: string
    screenshot?: string
    bindTags: string[]
    isShowcased: boolean
  }
  singleFileSetting: SingleFileSetting
}

async function scrapePageData(singleFileSetting: SingleFileSetting, tabId: number) {
  await Browser.scripting.executeScript({
    target: { tabId },
    files: ['/lib/single-file.js', '/lib/single-file-extension-core.js'],
  })
  const { content } = await sendMessage('scrape-page-data', singleFileSetting, `content-script@${tabId}`)
  return content
}

async function uploadPageData(pageForm: CreateTaskOptions['pageForm'] & { content: string }) {
  const { href, title, pageDesc, folderId, screenshot, content, isShowcased } = pageForm

  const form = new FormData()
  form.append('title', title)
  form.append('pageUrl', href)
  form.append('pageDesc', pageDesc)
  form.append('folderId', folderId)
  form.append('bindTags', JSON.stringify(pageForm.bindTags))
  form.append('pageFile', new Blob([content], { type: 'text/html' }))
  form.append('isShowcased', isShowcased ? '1' : '0')
  if (screenshot) {
    form.append('screenshot', base64ToBlob(screenshot, 'image/webp'))
  }
  const timeout = 5 * 60 * 1000
  keepAlive(timeout)
  await request('/pages/upload_new_page', {
    method: 'POST',
    body: form,
    timeout,
  })
}

async function createAndRunTask(options: CreateTaskOptions) {
  const { singleFileSetting, tabId, pageForm } = options
  const { href, title, pageDesc, folderId, screenshot, bindTags, isShowcased } = pageForm

  const uuid = crypto.randomUUID()
  const task: SeriableSingleFileTask = {
    uuid,
    status: 'init',
    progress: 0,
    tabId,
    href,
    title,
    pageDesc,
    folderId,
    bindTags,
    isShowcased,
    startTimeStamp: Date.now(),
  }

  // todo wait refactor, add progress
  async function run() {
    task.status = 'scraping'
    await saveTask(task)
    const content = await scrapePageData(singleFileSetting, tabId)

    task.status = 'uploading'
    await saveTask(task)

    await uploadPageData({ content, href, title, pageDesc, folderId, screenshot, bindTags, isShowcased })
    task.status = 'done'
    task.endTimeStamp = Date.now()
    await saveTask(task)
  }

  await saveTask(task)
  try {
    await run()
  }
  catch (e: any) {
    task.status = 'failed'
    task.endTimeStamp = Date.now()
    console.error('task failed', e, task)
    task.errorMessage = typeof e === 'string' ? e : e.message
    await saveTask(task)
  }
}

export {
  createAndRunTask,
  getTaskList,
  clearFinishedTaskList,
}
