interface IframePageContentProps {
  pageHtml: string
}

function IframePageContent({ pageHtml }: IframePageContentProps) {
  const pageContentUrl = URL.createObjectURL(new Blob([pageHtml], { type: 'text/html' }))
  return (
    <iframe
      src={pageContentUrl}
      className="w-full h-full bg-white"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
    />
  )
}

export default IframePageContent
