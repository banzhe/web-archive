import { Readability } from '@mozilla/readability'
import { useEffect, useRef } from 'react'

interface ReadabilityPageContentProps {
  pageHtml: string
}

function ReadabilityPageContent({ pageHtml }: ReadabilityPageContentProps) {
  const article = new Readability(
    new DOMParser().parseFromString(pageHtml, 'text/html'),
  ).parse()

  const articleContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (articleContainerRef.current) {
      articleContainerRef.current.innerHTML = article?.content || ''
    }
  }, [article?.content])

  return (
    <main className="flex flex-col gap-4 items-center w-full h-full">
      <h1 className="text-2xl font-bold">{article?.title}</h1>
      <h3 className="text-sm text-muted-foreground max-w-prose">{article?.excerpt}</h3>
      <div className="prose dark:prose-invert w-full" ref={articleContainerRef}></div>
    </main>
  )
}

export default ReadabilityPageContent
