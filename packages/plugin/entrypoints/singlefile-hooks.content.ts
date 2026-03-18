export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  allFrames: true,
  matchAboutBlank: true,
  matchOriginAsFallback: true,
  world: 'MAIN',
  async main() {
    await import('~/lib/single-file-hooks-frames.js')
  },
})
