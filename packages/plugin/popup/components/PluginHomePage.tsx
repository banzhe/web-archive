import { Button } from '@web-archive/shared/components/button'
import { useRequest } from 'ahooks'
import { History, House, LogOut, Settings } from 'lucide-react'
import { sendMessage } from 'webext-bridge/popup'
import { isNil } from '@web-archive/shared/utils'
import { getCurrentTab } from '../utils/tab'
import { ThemeToggle } from '~/popup/components/ThemeToggle'
import type { PageType } from '~/popup/PopupPage'

interface PluginHomePageProps {
  setActivePage: (tab: PageType) => void
}

function PluginHomePage({ setActivePage }: PluginHomePageProps) {
  async function logout() {
    await sendMessage('logout', {})
    setActivePage('login')
  }

  async function openServerPage() {
    const { serverUrl } = await sendMessage('get-server-url', {})
    window.open(serverUrl, '_blank')
  }

  const { data: saveAvailabel } = useRequest(async () => {
    const currentTab = await getCurrentTab()
    if (isNil(currentTab?.id)) {
      return false
    }
    const { available } = await sendMessage('scrape-available', { tabId: currentTab.id })
    return available
  })

  return (
    <div className="w-80 space-y-2 p-4">
      <div className="h-6 mb-2 items-center flex justify-between">
        <div className="flex space-x-3">
          <House
            className="cursor-pointer"
            onClick={openServerPage}
          >
          </House>
          <ThemeToggle></ThemeToggle>
          <Settings
            className="cursor-pointer"
            onClick={() => { setActivePage('setting') }}
          >
          </Settings>
          <History
            className="cursor-pointer"
            onClick={() => { setActivePage('history') }}
          />
        </div>

        <LogOut
          className="cursor-pointer"
          onClick={logout}
        />
      </div>
      <Button
        className="w-full select-none"
        disabled={!saveAvailabel}
        onClick={() => { setActivePage('upload') }}
      >
        {
          !saveAvailabel ? 'Save Page (Not Available)' : 'Save Page'
        }
      </Button>
    </div>
  )
}

export default PluginHomePage
