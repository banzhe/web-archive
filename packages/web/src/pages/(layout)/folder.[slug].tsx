import { Button } from '@web-archive/shared/components/button'
import { Move, Trash } from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@web-archive/shared/components/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@web-archive/shared/components/tooltip'
import { Page } from '@web-archive/shared/types'
import { useDrag, useRequest } from 'ahooks'
import React, { useRef } from 'react'
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
          pagesLoading
            ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <div className="m-b-xl h-8 w-8 animate-spin border-4 border-t-transparent rounded-full border-primary"></div>
                <div>Loading...</div>
              </div>
              )
            : (
              <PageCardContainer pages={pages} />
              )
        }
      </div>
    </div>
  )
}

function PageCardContainer({ pages }: { pages: Page[] | undefined }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {pages && pages.map(page => (
        <PageCard key={page.id} page={page} />
      ))}
    </div>
  )
}

function PageCard({ page }: { page: Page }) {
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

  return (
    <Card
      key={page.id}
      onClick={() => handleClickPageCard(page)}
      className="cursor-pointer hover:shadow-lg transition-shadow flex flex-col"
    >
      <CardHeader>
        <CardTitle>{page.title}</CardTitle>
        <CardDescription
          onClick={e => handleClickPageUrl(e, page)}
          className="cursor-pointer hover:underline break-words"
        >
          {page.pageUrl}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="h-auto text-sm text-gray-600 dark:text-gray-400">{page.pageDesc}</p>
      </CardContent>
      <CardFooter className="flex">
        <div ref={cardDragTarget}>
          <Move />
        </div>
      </CardFooter>
    </Card>
  )
}

export default FolderPage
