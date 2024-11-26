import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Web Archive",
  description: "Free web archiving and sharing service based on Cloudflare.",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config

    socialLinks: [
      { icon: 'github', link: 'https://github.com/ray-d-song/web-archive' }
    ]
  },
  locales: {
    root: {
      label: 'Chinese',
      lang: 'zh',
      themeConfig: {
        nav: [
          { text: '快速开始', link: '/deploy' },
          { text: '关于', link: '/about' },
        ],
        sidebar: [
          {
            text: '目录',
            items: [
              { text: '快速开始', link: '/deploy' },
              { text: '功能', link: '/feat' },
              { text: '使用指南', link: '/usage' },
              { text: '贡献指南', link: '/contribute' },
              { text: '关于', link: '/about' },
            ]
          }
        ],
      }
    },
    en: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        nav: [
          { text: 'Quick Start', link: '/en/deploy' },
          { text: 'About', link: '/en/about' },
        ],
        sidebar: [
          {
            text: 'Directory',
            items: [
              { text: 'Quick Start', link: '/en/deploy' },
              { text: 'Feature', link: '/en/feat' },
              { text: 'Usage', link: '/en/usage' },
              { text: 'Contribute', link: '/en/contribute' },
              { text: 'About', link: '/en/about' },
            ]
          }
        ]
      }
    }
  },
  markdown: {
    theme: {
      light: 'github-dark',
      dark: 'github-dark'
    }
  }
})
