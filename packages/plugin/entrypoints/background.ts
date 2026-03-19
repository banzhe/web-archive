import '~/lib/browser-polyfill.min.js'
import '~/lib/single-file-background.js'
import { registerBackgroundHandlers } from '~/background/background'

export default defineBackground({
  persistent: {
    chrome: false,
    firefox: true,
  },
  type: 'module',
  main() {
    registerBackgroundHandlers()
  },
})
