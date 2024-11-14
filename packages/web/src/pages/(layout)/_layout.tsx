import { Toaster } from 'react-hot-toast'
import { Outlet } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { SidebarProvider } from '@web-archive/shared/components/side-bar'
import { useRequest } from 'ahooks'
import SideBar from '~/components/side-bar'
import Hamburger from '~/components/hamburger'
import { getAllTag } from '~/data/tag'
import TagContext from '~/store/tag'

function Layout() {
  const [keyword, setKeyword] = useState('')
  // todo refactor rename searchTrigger
  const [searchTrigger, setSearchTrigger] = useState(false)

  const handleSearch = () => {
    setSearchTrigger(prev => !prev)
  }
  const {
    data: tagCache,
    runAsync: refreshTagCache,
  } = useRequest(getAllTag)
  const [selectedTag, setSelectedTag] = useState<number | null>(null)
  const setSelectedTagAndReload = (tag: number | null) => {
    setSelectedTag(tag)
    handleSearch()
  }
  return (
    <TagContext.Provider value={
      useMemo(() => ({
        tagCache: tagCache || [],
        refreshTagCache,
      }), [tagCache, refreshTagCache])
    }
    >
      <main className="flex min-h-screen">
        <Toaster
          position="top-center"
          reverseOrder={false}
        />
        <SidebarProvider>
          <div className="flex-1 flex">
            <SideBar
              selectedTag={selectedTag}
              setSelectedTag={setSelectedTagAndReload}
            />
            <div className="flex-1">
              <Hamburger className="lg:hidden block fixed top-[50%] left-0 cursor-pointer z-50" />
              <Outlet context={{ keyword, searchTrigger, handleSearch, setKeyword, selectedTag }} />
            </div>
          </div>
        </SidebarProvider>
      </main>
    </TagContext.Provider>
  )
}

export default Layout
