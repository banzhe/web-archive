import { Button } from '@web-archive/shared/components/button'
import { useRequest } from 'ahooks'
import { History, House, LogOut, Settings, SquareLibrary } from 'lucide-react'
import { sendMessage } from 'webext-bridge/popup'
import { isNil } from '@web-archive/shared/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@web-archive/shared/components/tooltip'
import { useTranslation } from 'react-i18next'
import { getCurrentTab } from '../utils/tab'
import SavedPageList from './SavedPageList'
import { ThemeToggle } from '~/popup/components/ThemeToggle'
import type { PageType } from '~/popup/PopupPage'

interface PluginHomePageProps {
  setActivePage: (tab: PageType) => void
}

function PluginHomePage({ setActivePage }: PluginHomePageProps) {
  const { t } = useTranslation()
  async function logout() {
    await sendMessage('logout', {})
    setActivePage('login')
  }

  async function openServerPage() {
    const { serverUrl } = await sendMessage('get-server-url', {})
    window.open(serverUrl, '_blank')
  }

  async function openShowCasePage() {
    const { serverUrl } = await sendMessage('get-server-url', {})
    window.open(`${serverUrl}/#/showcase/folder`, '_blank')
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
      <TooltipProvider>
        <div className="h-6 mb-2 items-center flex justify-between">
          <div className="flex space-x-3">
            <Tooltip>
              <TooltipTrigger>
                <House
                  className="cursor-pointer"
                  onClick={openServerPage}
                >
                </House>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">{t('open-home-page')}</div>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <SquareLibrary
                  className="cursor-pointer"
                  onClick={openShowCasePage}
                >
                </SquareLibrary>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">{t('open-showcase-page')}</div>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <ThemeToggle></ThemeToggle>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">{t('toggle-theme')}</div>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <Settings
                  className="cursor-pointer"
                  onClick={() => { setActivePage('setting') }}
                >
                </Settings>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">{t('change-plugin-settings')}</div>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <History
                  className="cursor-pointer"
                  onClick={() => { setActivePage('history') }}
                />
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">{t('view-save-history')}</div>
              </TooltipContent>
            </Tooltip>

          </div>

          <Tooltip>
            <TooltipTrigger>
              <LogOut
                className="cursor-pointer"
                onClick={logout}
              />
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-sm">{t('logout')}</div>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
      <Button
        className="w-full select-none"
        disabled={!saveAvailabel}
        onClick={() => { setActivePage('upload') }}
      >
        {
          !saveAvailabel ? t('save-page-not-available') : t('save-page')
        }
      </Button>
      {
        saveAvailabel && (
          <SavedPageList>
          </SavedPageList>
        )
      }

    </div>
  )
}

export default PluginHomePage
