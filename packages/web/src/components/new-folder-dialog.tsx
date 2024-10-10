import { Dialog, DialogContent } from '@web-archive/shared/components/dialog'
import { Button } from '@web-archive/shared/components/button'
import { Input } from '@web-archive/shared/components/input'
import { useState } from 'react'
import { DialogTitle } from '@radix-ui/react-dialog'
import toast from 'react-hot-toast'
import { useRequest } from 'ahooks'
import fetcher from '~/utils/fetcher'

interface NewFolderProps {
  afterSubmit: () => void
  open: boolean
  setOpen: (open: boolean) => void
}

function NewFolderDialog({ afterSubmit, open, setOpen }: NewFolderProps) {
  const [name, setName] = useState('')
  const { run } = useRequest(
    fetcher('/folders/create', { method: 'POST', body: { name } }),
    {
      manual: true,
      onSuccess: () => {
        setOpen(false)
        afterSubmit()
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
    run()
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogTitle>Create New Folder</DialogTitle>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Folder Name" />
        <Button onClick={handleSubmit}>Create</Button>
      </DialogContent>
    </Dialog>
  )
}

export default NewFolderDialog
