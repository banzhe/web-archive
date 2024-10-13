import { Button } from '@web-archive/shared/components/button'
import { ExternalLink, Move, Trash } from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@web-archive/shared/components/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@web-archive/shared/components/tooltip'
import { Page } from '@web-archive/shared/types'
import { useDrag, useRequest } from 'ahooks'
import React, { MouseEvent, useRef } from 'react'
import toast from 'react-hot-toast'
import { useNavigate, useParams } from '~/router'
import fetcher from '~/utils/fetcher'
import emitter from '~/utils/emitter'
import { dragIcon } from '~/utils/drag'

function FolderPage() {
  const { slug } = useParams('/folder/:slug')
  const { data: pages, loading: pagesLoading, mutate: setPages } = useRequest(fetcher<Page[]>(`/pages/query`, {
    query: {
      folderId: slug,
    },
  }), {
    refreshDeps: [slug],
  })

  const navigate = useNavigate()
  const { run: deleteFolder } = useRequest(
    fetcher<boolean>('/folders/delete', {
      method: 'DELETE',
      query: {
        id: slug,
      },
    }),
    {
      manual: true,
      onSuccess: (data) => {
        if (data) {
          emitter.emit('refreshSideBar')
          navigate('/')
        }
      },
    },
  )

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this folder?')) {
      deleteFolder()
    }
  }

  emitter.on('movePage', ({ pageId }) => {
    if (!pages)
      return
    setPages(pages.filter(page => page.id !== pageId))
  })

  const handlePageDelete = async (page: Page) => {
    if (!pages)
      return

    try {
      await fetcher('/pages/delete_page', {
        method: 'DELETE',
        query: {
          id: page.id.toString(),
        },
      })()
      toast.success('Page deleted successfully')
      setPages(pages.filter(p => p.id !== page.id))
    }
    catch (e) {
      toast.error('Failed to delete page')
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="p-2 flex justify-end items-center">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Delete current folder
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex-1 p-4 overflow-auto">
        {
          pagesLoading || (!pages)
            ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <div className="m-b-xl h-8 w-8 animate-spin border-4 border-t-transparent rounded-full border-primary"></div>
                <div>Loading...</div>
              </div>
              )
            : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <PageList pages={pages.filter((_, index) => index % 3 === 0)} onPageDelete={handlePageDelete} />
                <PageList pages={pages.filter((_, index) => index % 3 === 1)} onPageDelete={handlePageDelete} />
                <PageList pages={pages.filter((_, index) => index % 3 === 2)} onPageDelete={handlePageDelete} />
              </div>
              )
        }
      </div>
    </div>
  )
}

function PageList({ pages, onPageDelete }: { pages?: Page[], onPageDelete: (page: Page) => void }) {
  return (
    <div className="flex flex-col space-y-4">
      {pages && pages.map(page => (
        <PageCard key={page.id} page={page} onPageDelete={onPageDelete} />
      ))}
    </div>
  )
}

function PageCard({ page, onPageDelete }: { page: Page, onPageDelete?: (page: Page) => void }) {
  const navigate = useNavigate()

  const handleClickPageCard = (page: Page) => {
    navigate('/page/:slug', { params: { slug: String(page.id) } })
  }

  const handleClickPageUrl = (e: React.MouseEvent, page: Page) => {
    e.stopPropagation()
    window.open(page.pageUrl, '_blank')
  }

  const cardDragTarget = useRef(null)
  useDrag(page, cardDragTarget, {
    dragImage: {
      image: dragIcon,
    },
  })

  const handleDeletePage = (e: MouseEvent) => {
    e.stopPropagation()
    if (window.confirm('Are you sure you want to delete this page?')) {
      onPageDelete?.(page)
    }
  }

  return (
    <Card
      key={page.id}
      onClick={() => handleClickPageCard(page)}
      className="cursor-pointer hover:shadow-lg transition-shadow flex flex-col"
    >
      <CardHeader>
        <CardTitle>{page.title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="h-auto text-sm text-gray-600 dark:text-gray-400">{page.pageDesc}</p>
      </CardContent>
      <CardFooter className="flex space-x-2 justify-end">

        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" ref={cardDragTarget}>
                <Move className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Drag to move this page
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={e => handleClickPageUrl(e, page)}>
                <ExternalLink className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Open in new tab
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleDeletePage}>
                <Trash className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Delete this page
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardFooter>
    </Card>
  )
}

export default FolderPage
