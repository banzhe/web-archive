import { createContext } from 'react'

const AppContext = createContext<{
  view: 'card' | 'list'
  setView: (view: 'card' | 'list') => void
  readMode: boolean
  setReadMode: (readMode: boolean) => void
}>({
      view: 'card',
      setView: () => { },
      readMode: false,
      setReadMode: (value: boolean) => { },
    })

export default AppContext
