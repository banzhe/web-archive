import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@web-archive/shared/components/dialog'
import { Button } from '@web-archive/shared/components/button'
import { Input } from '@web-archive/shared/components/input'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useRequest } from 'ahooks'
import { sendMessage } from 'webext-bridge/popup'

interface NewFolderProps {
  afterSubmit: (folder: { id: number, name: string }) => void
  open: boolean
  setOpen: (open: boolean) => void
}

async function createFolder(name: string): Promise<{ id: number, name: string }> {
  const newFolder = await sendMessage('create-folder', { name })
  if (!newFolder) {
    throw new Error('Failed to create folder')
  }
  return newFolder
}

function NewFolderDialog({ afterSubmit, open, setOpen }: NewFolderProps) {
  const [name, setName] = useState('')
  const { run } = useRequest(
    createFolder,
    {
      manual: true,
      onSuccess: (folder) => {
        toast.success('Folder created')
        setOpen(false)
        setName('')
        afterSubmit(folder)
      },
      onError: (error) => {
        toast.error(error.message)
      },
    },
  )
  const handleSubmit = () => {
    if (name.length === 0) {
      toast.error('Folder name is required')
      return
    }
    run(name)
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-64">
        <DialogTitle>Create New Folder</DialogTitle>
        <DialogDescription></DialogDescription>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Folder Name" />
        <Button onClick={handleSubmit}>Create</Button>
      </DialogContent>
    </Dialog>
  )
}

export default NewFolderDialog
