enum ConfigKey {
  shouldShowRecent = 'config/should_show_recent',
  aiTag = 'config/ai_tag',
}

type AITagConfig = CloudFlareAITagConfig | OpenAIConfig

interface BaseAITagConfig {
  tagLanguage: 'en' | 'zh'
  model: string
  preferredTags: string[]
}

interface CloudFlareAITagConfig extends BaseAITagConfig {
  type: 'cloudflare'
}

interface OpenAIConfig extends BaseAITagConfig {
  type: 'openai'
  apiKey: string
  apiUrl: string
}

export { ConfigKey, AITagConfig, OpenAIConfig, CloudFlareAITagConfig }
