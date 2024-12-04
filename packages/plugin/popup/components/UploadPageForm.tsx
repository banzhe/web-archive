import { Input } from '@web-archive/shared/components/input'
import { Label } from '@web-archive/shared/components/label'
import type { PageType } from 'popup/PopupPage'
import type { ChangeEvent } from 'react'
import { useState } from 'react'
import { sendMessage } from 'webext-bridge/popup'
import { Textarea } from '@web-archive/shared/components/textarea'
import { Button } from '@web-archive/shared/components/button'
import { useRequest } from 'ahooks'
import { isNil } from '@web-archive/shared/utils'
import toast from 'react-hot-toast'
import { Switch } from '@web-archive/shared/components/switch'
import FolderSelectWithCache, { getLastChooseFolderId } from './FolderSelectWithCache'
import TagInputWithCache from './TagInputWithCache'
import { getSingleFileSetting } from '~/popup/utils/singleFile'
import { takeScreenshot } from '~/popup/utils/screenshot'
import { getCurrentTab } from '~/popup/utils/tab'
import LoadingPage from '~/popup/components/LoadingPage'

interface UploadPageFormProps {
  setActivePage: (page: PageType) => void
}

async function scrapePageData() {
  const tab = await getCurrentTab()

  if (!tab?.id) {
    return {
      title: '',
      pageDesc: '',
      href: '',
      screenshot: undefined,
    }
  }

  const [pageData, screenshot] = await Promise.all([
    sendMessage('get-basic-page-data', {}, `content-script@${tab.id}`),
    takeScreenshot(tab.windowId),
  ])

  return {
    title: pageData.title,
    pageDesc: pageData.pageDesc,
    href: pageData.href,
    screenshot,
  }
}

function UploadPageForm({ setActivePage }: UploadPageFormProps) {
  const [uploadPageData, setUploadPageData] = useState({
    title: '',
    pageDesc: '',
    href: '',
    folderId: getLastChooseFolderId(),
    screenshot: undefined as undefined | string,
    bindTags: [] as string[],
    isShowcased: false,
  })

  function handleChange(e: ChangeEvent<HTMLInputElement> | ChangeEvent<HTMLTextAreaElement> | ChangeEvent<HTMLSelectElement>) {
    const { name, value } = e.target
    setUploadPageData(prevData => ({
      ...prevData,
      [name]: value,
    }))
  }

  function handleFolderSelect(newFolder: string | undefined) {
    setUploadPageData(prevData => ({
      ...prevData,
      folderId: newFolder,
    }))
  }

  function handleTagSelect(newTags: string[]) {
    setUploadPageData(prevData => ({
      ...prevData,
      bindTags: newTags,
    }))
  }

  const { loading: isInitPageData } = useRequest(
    scrapePageData,
    {
      onSuccess: (data) => {
        setUploadPageData({
          ...uploadPageData,
          ...data,
        })
      },
    },
  )

  function handleCancel() {
    setActivePage('home')
  }

  async function handleSavePage() {
    // todo await folderlist to check folder extists?
    if (isNil(uploadPageData.folderId)) {
      toast.error('Please select a folder')
      return
    }
    const tab = await getCurrentTab()
    if (isNil(tab.id)) {
      toast.error('Can not get current tab info')
      return
    }
    await sendMessage('add-save-page-task', {
      tabId: tab.id,
      singleFileSetting: getSingleFileSetting(),
      pageForm: {
        title: uploadPageData.title,
        pageDesc: uploadPageData.pageDesc,
        href: uploadPageData.href,
        folderId: uploadPageData.folderId,
        screenshot: uploadPageData.screenshot,
        bindTags: uploadPageData.bindTags,
        isShowcased: uploadPageData.isShowcased,
      },
    })
    toast.success('Add save page task success')
    setActivePage('home')
  }

  if (isInitPageData) {
    return (
      <LoadingPage
        loadingText="Scraping Page Data..."
      />
    )
  }

  return (
    <div className="w-80 max-h-[600px] p-4 space-y-4 flex flex-col scrollbar-hide overflow-auto">
      <div className="flex flex-col space-y-2">
        <Label
          htmlFor="title"
        >
          Title
        </Label>
        <Input
          type="text"
          id="title"
          name="title"
          value={uploadPageData.title}
          onChange={handleChange}
        />
      </div>

      <div className="flex flex-col space-y-2">
        <Label
          htmlFor="pageDesc"
        >
          Page Description
        </Label>
        <Textarea
          id="pageDesc"
          name="pageDesc"
          value={uploadPageData.pageDesc}
          rows={3}
          onChange={handleChange}
        >
        </Textarea>
      </div>

      <div className="flex flex-col space-y-2">
        <Label
          htmlFor="showcased"
        >
          Showcased
        </Label>
        <Switch
          checked={uploadPageData.isShowcased}
          onCheckedChange={value => setUploadPageData(prevData => ({
            ...prevData,
            isShowcased: value,
          }))}
        >
        </Switch>
      </div>

      <div className="flex flex-col space-y-2">
        <Label>Tags</Label>
        <TagInputWithCache
          title={uploadPageData.title}
          description={uploadPageData.pageDesc}
          onValueChange={handleTagSelect}
        >
        </TagInputWithCache>
      </div>

      <div className="flex flex-col space-y-2">
        <Label
          htmlFor="folderId"
        >
          Folder
        </Label>
        <FolderSelectWithCache
          value={uploadPageData.folderId}
          onValueChange={handleFolderSelect}
        >
        </FolderSelectWithCache>
      </div>

      <div className="flex justify-between">
        <Button
          onClick={handleCancel}
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          disabled={isNil(uploadPageData.folderId)}
          onClick={handleSavePage}
        >
          Confirm
        </Button>
      </div>
    </div>
  )
}

export default UploadPageForm
