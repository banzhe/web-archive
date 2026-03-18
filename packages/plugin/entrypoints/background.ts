import { ensureBackgroundRuntime } from '~/background/background'

export default defineBackground({
  persistent: {
    chrome: false,
    firefox: true,
  },
  type: 'module',
  main() {
    void ensureBackgroundRuntime()
  },
})
