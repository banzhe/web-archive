import { resolve } from 'node:path'
import process from 'node:process'
import { defineConfig } from 'wxt'
import { viteStaticCopy } from 'vite-plugin-static-copy'

const isFirefox = process.argv.includes('firefox')

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifestVersion: 3,
  outDir: resolve(__dirname, '../../dist'),
  outDirTemplate: isFirefox ? 'extension-firefox' : 'extension',
  alias: {
    '~': resolve(__dirname),
  },
  manifest: ({ browser }) => ({
    name: 'web-archive',
    author: 'Ray-D-Song',
    description: 'SingleFile with categories and exhibition pages',
    version: '0.1.2',
    icons: {
      16: 'assets/icon.png',
      48: 'assets/icon.png',
      64: 'assets/icon.png',
      128: 'assets/icon.png',
    },
    action: {
      default_icon: 'assets/icon.png',
    },
    host_permissions: ['<all_urls>'],
    permissions: ['activeTab', 'storage', 'tabs', 'scripting'],
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              id: '{bafa7bca-e0ab-44f2-a343-4a6b7b52ba24}',
              strict_min_version: '109.0',
            },
          },
        }
      : {}),
  }),
  vite: () => ({
    plugins: [
      viteStaticCopy({
        targets: [
          { src: 'lib', dest: '.' },
          { src: 'assets', dest: '.' },
        ],
      }),
    ],
  }),
})
