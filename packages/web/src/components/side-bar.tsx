import { ScrollArea } from '@web-archive/shared/components/scroll-area'
import { Separator } from '@web-archive/shared/components/separator'
import { Button } from '@web-archive/shared/components/button'
import { LogOut, Plus, Settings, Trash } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { Folder as FolderType } from '@web-archive/shared/types'
import Folder from '@web-archive/shared/components/folder'
import { useRequest } from 'ahooks'
import { useEffect, useState } from 'react'
import NewFolderDialog from './new-folder-dialog'
import fetcher from '~/utils/fetcher'
import emitter from '~/utils/emitter'

function SideBar() {
  const navigate = useNavigate()
  const fetchFolders = fetcher<FolderType[]>('/folders/all', { method: 'GET' })
  const { data: folders, refresh } = useRequest(fetchFolders)

  const [openedFolder, setOpenedFolder] = useState<number | null>(null)
  const handleFolderClick = (id: number) => {
    setOpenedFolder(id)
  }

  useEffect(() => {
    if (openedFolder !== null) {
      navigate(`/folder/${openedFolder}`)
    }
  }, [openedFolder])

  emitter.on('refreshSideBar', refresh)

  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <div className="w-64 border-r h-screen">
      <NewFolderDialog afterSubmit={refresh} open={newFolderDialogOpen} setOpen={setNewFolderDialogOpen} />
      <ScrollArea className="h-full">
        <div className="p-4 min-h-full flex flex-col">
          <Button variant="ghost" className="w-full text-sm justify-center bg-green-600 hover:bg-green-700 hover:text-white" onClick={() => setNewFolderDialogOpen(true)}>
            <Plus className="w-5 h-5 mr-2" />
            New Directory
          </Button>
          <Separator className="my-2" />
          <nav className="flex-1">
            <ul className="flex flex-col gap-2 justify-center items-center py-4">
              {folders?.map(folder => (
                <Folder key={folder.id} name={folder.name} id={folder.id} isOpen={openedFolder === folder.id} onClick={handleFolderClick} />
              ))}
            </ul>
          </nav>
          <Separator className="my-2" />
          <Button variant="ghost" className="w-full text-sm justify-start">
            <Settings className="w-5 h-5 mr-2" />
            Settings
          </Button>
          <Button variant="ghost" className="w-full text-sm justify-start">
            <Trash className="w-5 h-5 mr-2" />
            Deleted
          </Button>
          <Button
            variant="ghost"
            className="w-full text-sm justify-start"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-2" />
            Logout
          </Button>
        </div>
      </ScrollArea>
    </div>
  )
}

export default SideBar
