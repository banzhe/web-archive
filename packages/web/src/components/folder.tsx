import { Folder as FolderIcon, FolderOpen as FolderOpenIcon, Pencil, Trash } from 'lucide-react'
import { useRef, useState } from 'react'
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@web-archive/shared/components/context-menu'
import { useTranslation } from 'react-i18next'

interface FolderProps {
  id: number
  name: string
  isOpen: boolean
  onClick?: (id: number) => void
  onDelete?: (folderId: number) => void
  onEdit?: (folderId: number) => void
}

function Folder({ id, name, isOpen, onClick, onDelete, onEdit }: FolderProps) {
  const { t } = useTranslation()
  function handleClick() {
    onClick?.(id)
  }

  const folderRef = useRef(null)
  const [isHover, setIsHover] = useState(false)

  return (
    <ContextMenu>
      <ContextMenuTrigger className={`cursor-pointer hover:bg-accent w-full rounded-md ${isOpen || isHover ? 'bg-accent' : ''}`}>
        <li onClick={handleClick} ref={folderRef} className="p-2 px-1 flex flex-col justify-center ">
          <div className="flex items-center ">
            {isOpen ? <FolderOpenIcon className="w-4 h-4 mr-2 ml-2" /> : <FolderIcon className="w-4 h-4 mr-2 ml-2" />}
            <div className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm">
              {name}
            </div>
          </div>
        </li>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem className="flex items-center space-x-2 cursor-pointer" onClick={() => onEdit?.(id)}>
          <Pencil size={12} />
          <div>{t('edit')}</div>
        </ContextMenuItem>
        <ContextMenuItem className="flex items-center space-x-2 cursor-pointer" onClick={() => onDelete?.(id)}>
          <Trash size={12} />
          <div>{t('delete')}</div>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>

  )
}

export default Folder
