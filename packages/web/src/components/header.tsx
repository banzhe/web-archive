import { Button } from '@web-archive/shared/components/button'
import { Input } from '@web-archive/shared/components/input'
import { Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ViewToggle from './view-toggle'

interface SearchBarProps {
  className?: string
  keyword: string
  setKeyword: (keyword: string) => void
  handleSearch: () => void
}

function SearchBar({ className, keyword, setKeyword, handleSearch }: SearchBarProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const match = location.pathname.startsWith('/folder')

  return (
    <div className={`${className ?? ''} flex items-center m-2 ${match ? 'justify-between' : 'justify-end'}`}>
      {match && <ViewToggle />}
      <div className="flex items-center space-x-2">
        <div className="flex items-center border rounded-md px-3" cmdk-input-wrapper="">
          <Search className="h-4 w-4 shrink-0 opacity-50" />
          <Input
            className="border-none outline-none focus-visible:ring-offset-0 focus-visible:ring-ring w-52"
            placeholder={t('search-placeholder')}
            value={keyword}
            showRing={false}
            onChange={e => setKeyword(e.target.value)}
            onKeyUp={(e) => {
              if (e.key === 'Enter') {
                handleSearch()
              }
            }}
          >
          </Input>
        </div>
        <Button onClick={handleSearch}>{t('search')}</Button>
      </div>
    </div>
  )
}

export default SearchBar
