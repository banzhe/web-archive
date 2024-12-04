import type { AITagConfig } from '@web-archive/shared/types'
import fetcher from '~/utils/fetcher'

async function getShouldShowRecent(): Promise<boolean> {
  return fetcher('/config/should_show_recent', {
    method: 'GET',
  })
}

async function setShouldShowRecent(shouldShowRecent: boolean) {
  return fetcher('/config/should_show_recent', {
    method: 'POST',
    body: { shouldShowRecent },
  })
}

async function getAITagConfig(): Promise<AITagConfig> {
  return fetcher('/config/ai_tag', {
    method: 'GET',
  })
}

async function setAITagConfig(config: AITagConfig) {
  return fetcher('/config/ai_tag', {
    method: 'POST',
    body: { ...config },
  })
}

export {
  getShouldShowRecent,
  setShouldShowRecent,
  getAITagConfig,
  setAITagConfig,
}
