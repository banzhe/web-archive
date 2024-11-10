import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import '@web-archive/shared/global.css'
import { useLocalStorageState, useRequest } from 'ahooks'
import { useMemo } from 'react'
import { ThemeProvider } from '@web-archive/shared/components/theme-provider'
import AppContext from './store/app'
import router from './utils/router'
import { getAllTag } from './data/tag'

function Routes() {
  const [view, setView] = useLocalStorageState('view', {
    defaultValue: 'card',
  })
  const [readMode, setReadMode] = useLocalStorageState('readMode', {
    defaultValue: false,
  })
  const {
    data: tagCache,
    runAsync: refreshTagCache,
  } = useRequest(getAllTag)
  return (
    <AppContext.Provider value={
      useMemo(() => ({
        view: view as 'card' | 'list',
        setView,
        tagCache,
        refreshTagCache,
        readMode: readMode as boolean,
        setReadMode,
      }), [view, setView, tagCache, refreshTagCache, readMode, setReadMode])
}
    >
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <RouterProvider router={router} />
      </ThemeProvider>
    </AppContext.Provider>
  )
}

createRoot(document.getElementById('root')!).render(<Routes />)
