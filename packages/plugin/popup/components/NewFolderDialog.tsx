import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@web-archive/shared/components/dialog'
import { Button } from '@web-archive/shared/components/button'
import { Input } from '@web-archive/shared/components/input'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useRequest } from 'ahooks'
import { sendMessage } from 'webext-bridge/popup'
import { useTranslation } from 'react-i18next'

interface NewFolderProps {
  afterSubmit: (folder: { id: number, name: string }) => void
  open: boolean
  setOpen: (open: boolean) => void
}

async function createFolder(name: string, errorMsg: string): Promise<{ id: number, name: string }> {
  const newFolder = await sendMessage('create-folder', { name })
  if (!newFolder) {
    throw new Error(errorMsg)
  }
  return newFolder
}

function NewFolderDialog({ afterSubmit, open, setOpen }: NewFolderProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const { run } = useRequest(
    createFolder,
    {
      manual: true,
      onSuccess: (folder) => {
        toast.success(t('create-folder-success'))
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
      toast.error(t('folder-name-required'))
      return
    }
    run(name, t('create-folder-failed'))
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-64">
        <DialogTitle>{t('create-new-folder')}</DialogTitle>
        <DialogDescription></DialogDescription>
        <Input

          value={name}

          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}

          placeholder={t('create-folder-input-placeholder')}

        />
        <Button onClick={handleSubmit}>{t('create')}</Button>
      </DialogContent>
    </Dialog>
  )
}

export default NewFolderDialog
