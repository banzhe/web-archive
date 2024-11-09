import { Button } from '@web-archive/shared/components/button'
import { Dialog, DialogContent, DialogTitle } from '@web-archive/shared/components/dialog'
import { Input } from '@web-archive/shared/components/input'
import { isNil } from '@web-archive/shared/utils'
import { useRequest } from 'ahooks'
import { useContext, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { updateTag } from '~/data/tag'
import AppContext from '~/store/app'

interface EditTagProps {
  afterSubmit: () => void
  open: boolean
  setOpen: (open: boolean) => void
  editTag?: {
    id: number
    name: string
  }
}

function EditTagDialog({ afterSubmit, open, setOpen, editTag }: EditTagProps) {
  const { tagCache } = useContext(AppContext)
  const [tagName, setTagName] = useState(editTag?.name ?? '')
  useEffect(() => {
    setTagName(editTag?.name ?? '')
  }, [editTag])
  const { run } = useRequest(
    updateTag,
    {
      manual: true,
      onSuccess: () => {
        setOpen(false)
        toast.success('Tag updated successfully')
        afterSubmit()
      },
      onError: (error) => {
        toast.error(error.message)
      },
    },
  )
  const handleSubmit = () => {
    if (tagName.length === 0) {
      toast.error('Tag name is required')
      return
    }
    if (tagName === editTag?.name) {
      setOpen(false)
      toast.success('Tag updated successfully')
      return
    }
    if (isNil(editTag?.id)) {
      toast.error('Tag id is required')
      return
    }
    if (tagCache?.find(tag => tag.name === tagName)) {
      toast.error('Tag name already exists')
      return
    }
    run({ id: editTag.id, name: tagName })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogTitle>Edit Tag</DialogTitle>
        <Input value={tagName} onChange={e => setTagName(e.target.value)} placeholder="Tag Name" />
        <Button onClick={handleSubmit}>Update</Button>
      </DialogContent>
    </Dialog>
  )
}

export default EditTagDialog
