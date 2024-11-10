import type { Tag } from '@web-archive/shared/types'
import { createContext } from 'react'

const AppContext = createContext<{
  view: 'card' | 'list'
  setView: (view: 'card' | 'list') => void
  tagCache?: Array<Tag>
  refreshTagCache: () => Promise<Array<Tag>>
  readMode: boolean
  setReadMode: (readMode: boolean) => void
}>({
      view: 'card',
      setView: () => { },
      tagCache: [],
      refreshTagCache: async () => { return [] },
      readMode: false,
      setReadMode: (value: boolean) => { },
    })

export default AppContext
