import { PlusIcon } from 'lucide-react'
import { Button } from '@web-archive/shared/components/button'
import { isNotNil } from '@web-archive/shared/utils'
import { sendMessage } from 'webext-bridge/popup'
import { useRequest } from 'ahooks'
import { useState } from 'react'
import FolderCombobox from './FolderCombobox'
import NewFolderDialog from './NewFolderDialog'

interface FolderSelectWithCacheProps {
  value: string | undefined
  onValueChange: (value: string | undefined) => void
}

async function getAllFolders() {
  const { folders } = await sendMessage('get-all-folders', {})
  await new Promise(resolve => setTimeout(resolve, 2000))
  return folders
}

export function getLastChooseFolderId() {
  return localStorage.getItem('lastChooseFolderId') || undefined
}

function FolderSelectWithCache({ value, onValueChange }: FolderSelectWithCacheProps) {
  const lastChooseFolderId = getLastChooseFolderId()
  const { data: folderList, refresh: refreshFolderList, mutate: setFolderList } = useRequest(getAllFolders, {
    cacheKey: 'folderList',
    setCache: (data) => {
      localStorage.setItem('folderList', JSON.stringify(data))
    },
    getCache: () => {
      const cache = localStorage.getItem('folderList')
      return cache ? JSON.parse(cache) : []
    },
    onSuccess: (data) => {
      if (isNotNil(value) && !data.some(folder => folder.id.toString() === value)) {
        onValueChange(undefined)
        lastChooseFolderId && localStorage.removeItem('lastChooseFolderId')
      }
    },
  })

  const [newFolderDialogVisible, setNewFolderDialogVisible] = useState(false)
  function handleNewFolderAdded(folder: { id: number, name: string }) {
    setFolderList(prevList => [
      ...(prevList ?? []),
      folder,
    ])
    onValueChange(folder.id.toString())
    localStorage.setItem('lastChooseFolderId', folder.id.toString())
    refreshFolderList()
  }

  function handleFolderSelect(newFolder: string) {
    localStorage.setItem('lastChooseFolderId', newFolder)
    onValueChange(newFolder)
  }

  return (
    <div className="flex space-x-2">
      <NewFolderDialog
        open={newFolderDialogVisible}
        afterSubmit={handleNewFolderAdded}
        setOpen={setNewFolderDialogVisible}
      >
      </NewFolderDialog>
      <div className="flex-1">
        {/*
              use combobox instead of select due to Select(v2.1.2) will auto close when resize event is fired
              and popup in firefox will fire resize event after DOM mutations
              https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Popups#:~:text=In%20Firefox%2C%20the%20size%20is%20calculated%20just%20before%20the%20popup%20is%20shown%2C%20and%20at%20most%2010%20times%20per%20second%20after%20DOM%20mutations.
            */}
        <FolderCombobox
          value={value}
          onValueChange={handleFolderSelect}
          options={(folderList ?? []).map(folder => ({
            value: folder.id.toString(),
            label: folder.name,
          }))}
        >
        </FolderCombobox>
      </div>
      <Button
        variant="secondary"
        className="h-10"
        size="icon"
        onClick={() => setNewFolderDialogVisible(true)}
      >
        <PlusIcon size={18}></PlusIcon>
      </Button>
    </div>
  )
}

export default FolderSelectWithCache
