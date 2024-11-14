import { useEventListener, useRequest } from 'ahooks'
import toast from 'react-hot-toast'
import { getShouldShowRecent, setShouldShowRecent } from '~/data/config'

export function useShouldShowRecent() {
  const { data: shouldShowRencent, mutate } = useRequest(
    getShouldShowRecent,
    {
      cacheKey: 'config/should_show_rencent',
      setCache: (data) => {
        console.log('update cache', data)
        localStorage.setItem('config/should_show_rencent', JSON.stringify(data))
      },
      getCache: () => {
        return JSON.parse(localStorage.getItem('config/should_show_rencent') ?? 'true')
      },
    },
  )

  useEventListener('storage', (e) => {
    if (e.key === 'config/should_show_rencent') {
      const newValue = JSON.parse(e.newValue ?? 'true')
      mutate(newValue)
    }
  })

  const updateShouldShowRecent = async (newValue: boolean) => {
    const previousValue = shouldShowRencent
    mutate(newValue)
    try {
      await setShouldShowRecent(newValue)
    }
    catch (error) {
      mutate(previousValue)
      toast.error('Failed to update config')
    }
  }

  return { shouldShowRencent, updateShouldShowRecent }
}
