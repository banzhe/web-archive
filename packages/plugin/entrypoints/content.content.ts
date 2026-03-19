import { onMessage } from 'webext-bridge/content-script'
import { getCurrentPageData } from '~/utils/singleFile'

function createModal() {
  const modal = document.createElement('div')
  modal.innerHTML = `
    <div>
      Scraping Page Data...
      <br />
      <span></span>
    </div>
  `
  Object.assign(modal.style, {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0, 0, 0, 0.5)',
    color: 'white',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999999,
  })
  // add this class to make singlefile ignore this element when save page
  modal.classList.add('single-file-ui-element')
  return modal
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  async main() {
    await import('~/lib/browser-polyfill.min.js')
    await import('~/lib/single-file-bootstrap.js')

    onMessage('scrape-page-data', async ({ data: singleFileSetting }) => {
      const modal = createModal()
      document.documentElement.appendChild(modal)

      const pageData = await getCurrentPageData({
        ...singleFileSetting,
        onprogress: (_data) => {
        },
      })

      modal.remove()
      return pageData
    })

    onMessage('get-basic-page-data', async () => {
      const descriptionList = document.getElementsByName('description')
      const description = descriptionList?.[0]?.getAttribute('content') ?? ''
      return {
        title: document.title,
        href: window.location.href,
        pageDesc: description,
      }
    })
  },
})
