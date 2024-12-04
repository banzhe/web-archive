interface IframePageContentProps {
  pageContentUrl: string
}

function IframePageContent({ pageContentUrl }: IframePageContentProps) {
  return (
    <iframe
      src={pageContentUrl}
      className="w-full h-full bg-white"
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
    />
  )
}

export default IframePageContent
