export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  async main() {
    await import('~/lib/browser-polyfill.min.js')
    await import('~/lib/single-file-bootstrap.js')
    await import('~/contentScripts/content')
  },
})
