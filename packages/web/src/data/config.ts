import fetcher from '~/utils/fetcher'

async function getShouldShowRecent(): Promise<boolean> {
  return fetcher('/config/should_show_rencent', {
    method: 'GET',
  })
}

async function setShouldShowRecent(shouldShowRecent: boolean) {
  return fetcher('/config/should_show_rencent', {
    method: 'POST',
    body: { shouldShowRecent },
  })
}

export {
  getShouldShowRecent,
  setShouldShowRecent,
}
