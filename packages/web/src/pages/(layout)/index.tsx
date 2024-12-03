import { useInfiniteScroll, useRequest, useWhyDidYouUpdate } from 'ahooks'
import type { Ref } from '@web-archive/shared/components/scroll-area'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Page } from '@web-archive/shared/types'
import { ScrollArea } from '@web-archive/shared/components/scroll-area'
import { useOutletContext } from 'react-router-dom'
import { isNil, isNotNil } from '@web-archive/shared/utils'
import { useMediaQuery } from '~/hooks/useMediaQuery'
import PageDataPieCard from '~/components/page-data-pie-card'
import R2UsageCard from '~/components/r2-usage-card'
import { deletePage, getRecentSavePage, queryPage } from '~/data/page'
import PageCard from '~/components/page-card'
import { getR2Usage } from '~/data/data'
import Header from '~/components/header'
import LoadingWrapper from '~/components/loading-wrapper'
import CardView from '~/components/card-view'
import LoadingMore from '~/components/loading-more'
import { useShouldShowRecent } from '~/hooks/useShouldShowRecent'

function RecentSavePageView() {
  const { data: r2Data, loading: r2Loading } = useRequest(getR2Usage)

  const { shouldShowRecent } = useShouldShowRecent()
  const [pages, setPages] = useState<Page[]>([])
  useRequest(getRecentSavePage, {
    onSuccess: (data) => {
      setPages(data ?? [])
    },
    ready: shouldShowRecent,
  })
  const { '2xl': is2xlScreen, xl: isXlScreen, md: isMdScreen } = useMediaQuery()

  const columnCount = useMemo(() => {
    if (is2xlScreen)
      return 4
    if (isXlScreen)
      return 3
    if (isMdScreen)
      return 2
    return 1
  }, [is2xlScreen, isXlScreen, isMdScreen])

  const { run: handleDeletePage } = useRequest(deletePage, {
    manual: true,
    onSuccess: (data) => {
      setPages(pages.filter(page => page.id !== data?.id))
    },
  })
  const reorganizedPages = useMemo(() => {
    const result = Array.from({ length: columnCount }, () => [])
    return result.map((_, idx) =>
      pages
        .filter((_, index) => index % columnCount === idx)
        .map(page => (
          <PageCard key={page.id} page={page} onPageDelete={handleDeletePage} />
        )),
    )
  }, [pages, columnCount])

  return (
    <ScrollArea className="p-4 overflow-auto  h-[calc(100vh-58px)]">
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {
          shouldShowRecent
            ? reorganizedPages.map((item, idx) => (
              <div key={idx} className="flex flex-col gap-4">
                {idx === 0 && <PageDataPieCard />}
                {columnCount === 1 ? <R2UsageCard loading={r2Loading} data={r2Data} /> : idx === 1 && <R2UsageCard loading={r2Loading} data={r2Data} />}
                {item}
              </div>
            ))
            : (
                [
                  <div key={1}>
                    <PageDataPieCard key={1} />
                  </div>,
                  <div key={2}>
                    <R2UsageCard loading={r2Loading} data={r2Data} key={2} />
                  </div>,
                ].map(item => (item))
              )
        }

      </div>
    </ScrollArea>
  )
}

function SearchiPageView() {
  const scrollRef = useRef<Ref>(null)
  const { keyword, searchTrigger, selectedTag } = useOutletContext<{ keyword: string, searchTrigger: boolean, selectedTag: number | null, setKeyword: (keyword: string) => void, handleSearch: () => void }>()
  const PAGE_SIZE = 14
  const { data: pagesData, loading: pagesLoading, mutate: setPageData, loadingMore, reload } = useInfiniteScroll(
    async (d) => {
      const pageNumber = d?.pageNumber ?? 1
      const res = await queryPage({
        pageNumber,
        pageSize: PAGE_SIZE,
        keyword,
        tagId: selectedTag,
      })
      return {
        list: res.list ?? [],
        pageNumber: pageNumber + 1,
        total: res.total,
      }
    },
    {
      target: scrollRef.current?.viewport,
      isNoMore: (d) => {
        if (!d)
          return false
        return d.list.length >= d.total || d.pageNumber > Math.ceil(d.total / PAGE_SIZE)
      },
    },
  )
  useEffect(() => {
    reload()
  }, [searchTrigger])

  useWhyDidYouUpdate('SearchiPageView', { pagesData, pagesLoading, loadingMore, keyword, selectedTag })

  const { run: handleDeletePage } = useRequest(deletePage, {
    manual: true,
    onSuccess: (data) => {
      setPageData({ list: pagesData?.list.filter(page => page.id !== data?.id) ?? [] })
    },
  })
  return (
    <ScrollArea ref={scrollRef} className="p-4 overflow-auto  h-[calc(100vh-58px)]">
      <LoadingWrapper loading={pagesLoading || (!pagesData)}>
        <div className="h-full">
          <CardView pages={pagesData?.list} onPageDelete={handleDeletePage} />
          {loadingMore && <LoadingMore />}
        </div>
      </LoadingWrapper>
    </ScrollArea>
  )
}

function ArchiveHome() {
  const { keyword, selectedTag, setKeyword, handleSearch } = useOutletContext<{ keyword: string, searchTrigger: boolean, selectedTag: number | null, setKeyword: (keyword: string) => void, handleSearch: () => void }>()
  const [showSearchView, setShowSearchView] = useState(false)
  const handleStartSearch = () => {
    if (isNil(keyword) || keyword === '') {
      setShowSearchView(false)
    }
    else {
      setShowSearchView(true)
      handleSearch()
    }
  }
  useEffect(() => {
    setShowSearchView(isNotNil(selectedTag))
  }, [selectedTag])
  return (
    <div className="flex flex-col flex-1">
      <Header keyword={keyword} setKeyword={setKeyword} handleSearch={handleStartSearch}></Header>
      {showSearchView
        ? <SearchiPageView></SearchiPageView>
        : <RecentSavePageView></RecentSavePageView>}

    </div>
  )
}

export default ArchiveHome
