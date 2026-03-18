export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  allFrames: true,
  matchAboutBlank: true,
  matchOriginAsFallback: true,
  async main() {
    await import('~/lib/browser-polyfill.min.js')
    await import('~/lib/single-file-frames.js')
    await import('~/lib/single-file-extension-frames.js')
  },
})
