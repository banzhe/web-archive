import { FileText, Folder as FolderIcon, FolderOpen as FolderOpenIcon } from 'lucide-react'
import { useState } from 'react'

interface FolderProps {
  id: number
  name: string
  isOpen: boolean
  onClick?: (id: number) => void
}

function Folder({ id, name, isOpen, onClick }: FolderProps) {
  function handleClick() {
    onClick?.(id)
  }

  return (
    <li className={`flex flex-col justify-center cursor-pointer hover:bg-zinc-900 w-full p-2 rounded-md ${isOpen ? 'bg-zinc-900' : ''}`}>
      <div onClick={handleClick} className="flex items-center">
        {isOpen ? <FolderOpenIcon className="w-5 h-5 mr-5 ml-2" /> : <FolderIcon className="w-5 h-5 mr-5 ml-2" />}
        {name}
      </div>
    </li>
  )
}

export default Folder
