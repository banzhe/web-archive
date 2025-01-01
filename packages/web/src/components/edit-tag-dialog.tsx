import { Button } from '@web-archive/shared/components/button'
import { Dialog, DialogContent, DialogTitle } from '@web-archive/shared/components/dialog'
import { Input } from '@web-archive/shared/components/input'
import { isNil } from '@web-archive/shared/utils'
import { useRequest } from 'ahooks'
import { useContext, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { updateTag } from '~/data/tag'
import TagContext from '~/store/tag'

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
  const { t } = useTranslation()
  const { tagCache } = useContext(TagContext)
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
        toast.success(t('tag-updated-successfully'))
        afterSubmit()
      },
      onError: (error) => {
        toast.error(error.message)
      },
    },
  )
  const handleSubmit = () => {
    if (tagName.length === 0) {
      toast.error(t('tag-name-is-required'))
      return
    }
    if (tagName === editTag?.name) {
      setOpen(false)
      toast.success(t('tag-updated-successfully'))
      return
    }
    if (isNil(editTag?.id)) {
      toast.error(t('tag-id-is-required'))
      return
    }
    if (tagCache?.find(tag => tag.name === tagName)) {
      toast.error(t('tag-name-already-exists'))
      return
    }
    run({ id: editTag.id, name: tagName })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogTitle>{t('edit-tag')}</DialogTitle>
        <Input
          value={tagName}
          onChange={e => setTagName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder={t('tag-name')}
        />
        <Button onClick={handleSubmit}>{t('update')}</Button>
      </DialogContent>
    </Dialog>
  )
}

export default EditTagDialog
