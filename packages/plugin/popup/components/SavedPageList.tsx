import { isNil } from '@web-archive/shared/utils'
import { sendMessage } from 'webext-bridge/popup'
import { useRequest } from 'ahooks'
import { LoaderCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getCurrentTab } from '../utils/tab'

async function getSavedPages() {
  const currentTab = await getCurrentTab()
  if (isNil(currentTab?.id) || isNil(currentTab.url)) {
    return []
  }

  const { pages } = await sendMessage('query-by-url', {
    pageUrl: currentTab.url,
  })

  return pages
}

function formatTime(date: string) {
  const timestamp = Date.parse(`${date}Z`)
  const dateObj = new Date(timestamp)
  return dateObj.toLocaleString()
}

function SavedPageList() {
  const { t } = useTranslation()
  const { data: savedPages, loading } = useRequest(getSavedPages)

  async function handlePageClick(pageId: number) {
    const { serverUrl } = await sendMessage('get-server-url', {})
    window.open(`${serverUrl}/#/page/${pageId}`, '_blank')
  }

  if (loading) {
    return (
      <div className="w-full h-8 bg-secondary rounded flex items-center justify-center">
        <LoaderCircle size={14} className="animate-spin mr-2"></LoaderCircle>
        <div>{t('loading-archived-list')}</div>
      </div>
    )
  }

  if (!savedPages?.length) {
    return (
      <div className="w-full h-8 bg-secondary rounded flex items-center justify-center">
        <div className="text-secondary-foreground select-none">{t('no-archived-pages')}</div>
      </div>
    )
  }

  return (
    <div>
      <div className="w-full max-h-32 overflow-auto rounded space-y-2 custom-scrollbar pr-[4px] mr-[-4px]">
        {
          savedPages?.map((page) => {
            return (
              <div
                key={page.id}
                className="flex justify-between bg-primary/20 rounded p-2 select-none cursor-pointer"
                onClick={() => handlePageClick(page.id)}
              >
                <div className="flex-1 text-nowrap text-ellipsis overflow-hidden">{page.title}</div>
                <div>{formatTime(page.createdAt)}</div>
              </div>
            )
          })
        }
      </div>
    </div>
  )
}

export default SavedPageList
