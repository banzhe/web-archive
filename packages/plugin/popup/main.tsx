import '../styles'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { initTheme } from '../utils/theme'
import PopupContainer from './PopupPage'
import '@web-archive/shared/global.css'

const root = document.getElementById('root')
if (!root) {
  throw new Error('Root element not found')
}

initTheme()

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <PopupContainer></PopupContainer>
  </React.StrictMode>,
)
