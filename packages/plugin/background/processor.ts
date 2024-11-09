import { sendMessage } from 'webext-bridge/background'
import Browser from 'webextension-polyfill'
import { request } from './background'
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
  startTimeStamp: number
  endTimeStamp?: number
  errorMessage?: string
}

const taskList: SeriableSingleFileTask[] = []

let isInit = false
async function initTask() {
  if (isInit) {
    return
  }

  const { tasks } = await Browser.storage.local.get('tasks')
  if (tasks) {
    tasks.forEach((task: SeriableSingleFileTask) => {
      if (task.status !== 'done' && task.status !== 'failed') {
        task.status = 'failed'
        task.endTimeStamp = Date.now()
        task.errorMessage = 'unexpected shutdown'
      }
    })
    taskList.splice(0, taskList.length, ...tasks)
  }
  isInit = true
}

Browser.runtime.onStartup.addListener(async () => {
  console.log('onStartup')
  await initTask()
})

async function getTaskList() {
  await initTask()
  return taskList
}

async function saveTaskList() {
  await Browser.storage.local.set({ tasks: taskList })
}

async function clearFinishedTaskList() {
  const newTaskList = taskList.filter(task => task.status !== 'done')
  taskList.splice(0, taskList.length, ...newTaskList)
  await saveTaskList()
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
  const { href, title, pageDesc, folderId, screenshot, content } = pageForm

  const form = new FormData()
  form.append('title', title)
  form.append('pageUrl', href)
  form.append('pageDesc', pageDesc)
  form.append('folderId', folderId)
  form.append('bindTags', JSON.stringify(pageForm.bindTags))
  form.append('pageFile', new Blob([content], { type: 'text/html' }))
  if (screenshot) {
    form.append('screenshot', base64ToBlob(screenshot, 'image/webp'))
  }
  await request('/pages/upload_new_page', {
    method: 'POST',
    body: form,
  })
}

async function createAndRunTask(options: CreateTaskOptions) {
  const { singleFileSetting, tabId, pageForm } = options
  const { href, title, pageDesc, folderId, screenshot, bindTags } = pageForm

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
    startTimeStamp: Date.now(),
  }

  // todo wait refactor, add progress
  async function run() {
    task.status = 'scraping'
    await saveTaskList()
    const content = await scrapePageData(singleFileSetting, tabId)

    task.status = 'uploading'
    await saveTaskList()

    await uploadPageData({ content, href, title, pageDesc, folderId, screenshot, bindTags })
    task.status = 'done'
    task.endTimeStamp = Date.now()
    await saveTaskList()
  }

  taskList.push(task)
  await saveTaskList()
  try {
    await run()
  }
  catch (e: any) {
    task.status = 'failed'
    task.endTimeStamp = Date.now()
    console.error('tsak failed', e, task)
    task.errorMessage = typeof e === 'string' ? e : e.message
    await saveTaskList()
  }
}

export {
  createAndRunTask,
  getTaskList,
  clearFinishedTaskList,
}
