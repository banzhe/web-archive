import { Button } from '@web-archive/shared/components/button'
import { Page } from '@web-archive/shared/types'
import { useAsyncEffect, useRequest } from 'ahooks'
import { ArrowLeft, Maximize, Trash } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from '~/router'
import fetcher from '~/utils/fetcher'

async function getPageContent(pageId: string | undefined) {
  if (!pageId)
    return ''
  const url = `/api/shelf?pageId=${pageId}`
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'text/html',
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  })
  return await res.text()
}

function ArchivePage() {
  const navigate = useNavigate()
  const { slug } = useParams('/page/:slug')

  useEffect(() => {
    if (!slug) {
      navigate('/')
    }
  })

  const { data: pageDetail, loading: pageDetailLoading } = useRequest(
    fetcher<Page>('/pages/get_page', {
      query: {
        id: slug ?? '',
      },
      method: 'GET',
    }),
    {
      onSuccess: (pageDetail) => {
        if (!pageDetail) {
          navigate('/error/:slug', { params: { slug: '404' } })
        }
      },
    },
  )

  const goBack = () => {
    if (pageDetail)
      navigate('/folder/:slug', { params: { slug: String(pageDetail?.folderId) } })
    else
      window.history.back()
  }

  const { data: pageHtml } = useRequest(async () => {
    return await getPageContent(slug)
  })
  const [pageContent, setPageContent] = useState<string | null>(null)
  useEffect(() => {
    if (!pageHtml)
      return

    const objectUrl = URL.createObjectURL(new Blob([pageHtml], { type: 'text/html' }))
    setPageContent(objectUrl)
    return () => {
      objectUrl && URL.revokeObjectURL(objectUrl)
    }
  }, [pageHtml])

  return (
    <>
      <nav className="p-2 flex justify-between items-center">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="w-5 h-5" onClick={goBack} />
        </Button>
        <div>
          <Button variant="ghost" size="sm" className="mr-2">
            <Maximize className="w-5 h-5" />
          </Button>
          <Button variant="destructive" size="sm">
            <Trash className="w-5 h-5" />
          </Button>
        </div>
      </nav>
      <div className="flex-1 p-4">
        {
          pageContent
            ? (
              <iframe
                src={pageContent}
                className="w-full h-full"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
              )
            : (
              <div className="flex flex-col items-center justify-center">
                <div className="m-b-xl h-8 w-8 animate-spin border-4 border-t-transparent rounded-full border-primary"></div>
                <div>Loading...</div>
              </div>
              )
        }
      </div>
    </>
  )
}

export default ArchivePage
