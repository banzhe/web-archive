import { DialogClose, DialogDescription, DialogTitle } from '@radix-ui/react-dialog'
import { Dialog, DialogContent, DialogFooter } from '@web-archive/shared/components/dialog'
import { Input } from '@web-archive/shared/components/input'
import { Switch } from '@web-archive/shared/components/switch'
import { useRequest } from 'ahooks'
import { useForm } from 'react-hook-form'
import { memo, useContext, useEffect } from 'react'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@web-archive/shared/components/form'
import { z } from 'zod'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@web-archive/shared/components/select'
import { Textarea } from '@web-archive/shared/components/textarea'
import { Button } from '@web-archive/shared/components/button'
import { toast } from 'react-hot-toast'
import { useOutletContext } from 'react-router-dom'
import AutoCompleteTagInput from '@web-archive/shared/components/auto-complete-tag-input'
import { useTranslation } from 'react-i18next'
import LoadingWrapper from '~/components/loading-wrapper'
import { getPageDetail, updatePage } from '~/data/page'
import { getAllFolder } from '~/data/folder'
import TagContext from '~/store/tag'

interface CardEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pageId: number
}

function Comp({ open, onOpenChange, pageId }: CardEditDialogProps) {
  const { t } = useTranslation()
  const { handleSearch } = useOutletContext<{ handleSearch: () => void }>()

  const { data: folders, loading: foldersLoading, run: getAllFolderRun } = useRequest(getAllFolder, {
    manual: true,
  })

  const formSchema = z.object({
    title: z.string().min(1, { message: t('title-is-required') }),
    pageDesc: z.string().min(1, { message: t('description-is-required') }),
    pageUrl: z.string().min(1, { message: t('page-url-is-required') }),
    isShowcased: z.number(),
    folderId: z.number(),
    unbindTags: z.array(z.string()),
    bindTags: z.array(z.string()),
  })
  const form = useForm<z.infer<typeof formSchema>>({
    defaultValues: {
      title: '',
      pageDesc: '',
      pageUrl: '',
      isShowcased: 0,
      folderId: 0,
      unbindTags: [],
      bindTags: [],
    },
  })
  const { loading, run: getPageDetailRun } = useRequest(
    getPageDetail,
    {
      manual: true,
      onSuccess: (data) => {
        form.reset({
          title: data.title,
          pageDesc: data.pageDesc,
          pageUrl: data.pageUrl,
          isShowcased: data.isShowcased,
          folderId: data.folderId,
        })
      },
    },
  )

  const { tagCache, refreshTagCache } = useContext(TagContext)
  const selectTags = tagCache?.filter(tag => tag.pageIds.includes(pageId))
  const handleTagChange = ({
    bindTags,
    unbindTags,
  }: {
    bindTags: string[]
    unbindTags: string[]
  }) => {
    form.setValue('bindTags', bindTags)
    form.setValue('unbindTags', unbindTags)
  }

  useEffect(() => {
    if (open) {
      getPageDetailRun(pageId.toString())
      getAllFolderRun()
    }
  }, [open])
  const { run: updatePageRun } = useRequest(updatePage, {
    manual: true,
    onSuccess: () => {
      toast.success(t('page-update-success'))
      refreshTagCache()
      handleSearch()
      onOpenChange(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTitle></DialogTitle>
      <DialogDescription></DialogDescription>
      <DialogContent>
        <LoadingWrapper loading={loading || foldersLoading}>
          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit(data => updatePageRun({
                ...data,
                isShowcased: Number(data.isShowcased),
                id: pageId,
              }))}
            >
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('title')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('input-title-placeholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pageDesc"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('description')}</FormLabel>
                    <FormControl>
                      <Textarea placeholder={t('input-description-placeholder')} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('page-url')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('input-page-url-placeholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isShowcased"
                render={({ field }) => (
                  <FormItem className="flex flex-col gap-2">
                    <FormLabel>{t('showcased')}</FormLabel>
                    <FormControl>
                      <Switch checked={field.value === 1} onCheckedChange={value => field.onChange(Number(value))} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="folderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('folder')}</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        value={String(field.value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('select-a-folder')} />
                        </SelectTrigger>
                        <SelectContent>
                          {folders?.map(folder => (
                            <SelectItem key={folder.id} value={String(folder.id)}>{folder.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                name="tags"
                render={() => (
                  <FormItem>
                    <FormLabel>{t('tags')}</FormLabel>
                    <FormControl>
                      <AutoCompleteTagInput
                        tags={tagCache ?? []}
                        selectTags={selectTags ?? []}
                        onChange={handleTagChange}
                      >
                      </AutoCompleteTagInput>
                    </FormControl>
                  </FormItem>
                )}
              >
              </FormField>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">{t('cancel')}</Button>
                </DialogClose>
                <Button type="submit">{t('save')}</Button>
              </DialogFooter>
            </form>
          </Form>
        </LoadingWrapper>
      </DialogContent>
    </Dialog>
  )
}

const CardEditDialog = memo(Comp)

export default CardEditDialog
