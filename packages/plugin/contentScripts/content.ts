import { onMessage, sendMessage } from 'webext-bridge/content-script'
import { getCurrentPageData } from '../utils/singleFile'

onMessage('get-current-page-data', async () => {
  console.log('get-current-page-data')
  return await getCurrentPageData((data) => {
    sendMessage('scrape-page-progress', { stage: data.type }, 'popup')
  })
})
