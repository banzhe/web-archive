import '~/styles'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from '@web-archive/shared/components/theme-provider'
import '@web-archive/shared/global.css'
import '~/i18n'
import PopupContainer from '~/popup/PopupPage'

const root = document.getElementById('root')
if (!root) {
  throw new Error('Root element not found')
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <PopupContainer />
    </ThemeProvider>
  </React.StrictMode>,
)
