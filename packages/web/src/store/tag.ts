import type { Tag } from '@web-archive/shared/types'
import { createContext } from 'react'

const TagContext = createContext<{
  tagCache: Tag[]
  refreshTagCache: () => Promise<Tag[]>
}>({
      tagCache: [],
      refreshTagCache: async () => [],
    })

export default TagContext
