import { useRequest } from 'ahooks'
import toast from 'react-hot-toast'
import { getShouldShowRecent, setShouldShowRecent } from '~/data/config'

export function useShouldShowRecent() {
  const cachedKey = 'config/should_show_recent'
  const { data: shouldShowRecent, mutate } = useRequest(
    getShouldShowRecent,
    {
      cacheKey: cachedKey,
      setCache: (data) => {
        console.log('update cache', data)
        localStorage.setItem(cachedKey, JSON.stringify(data))
      },
      getCache: () => {
        return JSON.parse(localStorage.getItem(cachedKey) ?? 'true')
      },
    },
  )

  const updateShouldShowRecent = async (newValue: boolean) => {
    const previousValue = shouldShowRecent
    mutate(newValue)
    try {
      await setShouldShowRecent(newValue)
    }
    catch (error) {
      mutate(previousValue)
      toast.error('Failed to update config')
    }
  }

  return { shouldShowRecent, updateShouldShowRecent }
}
