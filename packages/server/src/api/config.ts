import { Hono } from 'hono'
import { validator } from 'hono/validator'
import type { AITagConfig } from '@web-archive/shared/types'
import { z } from 'zod'
import type { HonoTypeUserInformation } from '~/constants/binding'
import { getAITagConfig, getShouldShowRecent, setAITagConfig, setShouldShowRecent } from '~/model/store'
import result from '~/utils/result'

const app = new Hono<HonoTypeUserInformation>()

app.get('/should_show_recent', async (c) => {
  try {
    const shouldShowRecent = await getShouldShowRecent(c.env.DB)
    return c.json(result.success(shouldShowRecent))
  }
  catch (error) {
    console.error(error)
    return c.json(result.error(500, 'Failed to get config'))
  }
})

app.post(
  '/should_show_recent',
  validator('json', (value, c) => {
    if (typeof value.shouldShowRecent !== 'boolean') {
      return c.json(result.error(400, 'shouldShowRecent is required'))
    }

    return {
      shouldShowRecent: value.shouldShowRecent as boolean,
    }
  }),
  async (c) => {
    const { shouldShowRecent } = c.req.valid('json')
    try {
      await setShouldShowRecent(c.env.DB, shouldShowRecent)
      return c.json(result.success(shouldShowRecent))
    }
    catch (error) {
      console.error(error)
      return c.json(result.error(500, 'Failed to update config'))
    }
  },
)

app.get('/ai_tag', async (c) => {
  try {
    const aiTagConfig = await getAITagConfig(c.env.DB)
    return c.json(result.success(aiTagConfig))
  }
  catch (error) {
    console.error(error)
    return c.json(result.error(500, 'Failed to get config'))
  }
})

app.post(
  '/ai_tag',
  validator('json', (value, c) => {
    const modelError = {
      message: 'Model name is required',
    }
    const apiUrlError = {
      message: 'API URL is required',
    }
    const apiKeyError = {
      message: 'API Key is required',
    }
    const cloudflareSchema = z.object({
      type: z.literal('cloudflare'),
      tagLanguage: z.enum(['en', 'zh']).default('en'),
      model: z.string(modelError).min(1, modelError),
      preferredTags: z.array(z.string()).default([]),
    })
    const openaiSchema = z.object({
      type: z.literal('openai'),
      tagLanguage: z.enum(['en', 'zh']).default('en'),
      model: z.string(modelError).min(1, modelError),
      preferredTags: z.array(z.string()).default([]),
      apiUrl: z.string(apiUrlError).min(1, apiUrlError),
      apiKey: z.string(apiKeyError).min(1, apiKeyError),
    })

    const schema = z.discriminatedUnion('type', [
      cloudflareSchema,
      openaiSchema,
    ])
    const parsed = schema.safeParse(value)
    if (!parsed.success) {
      if (parsed.error.errors.length > 0) {
        return c.json(result.error(400, parsed.error.errors[0].message))
      }
      return c.json(result.error(400, 'Invalid request'))
    }

    // todo set tsconfig strict to avoid type assertion
    return parsed.data as AITagConfig
  }),
  async (c) => {
    const aiTagConfig = c.req.valid('json')
    try {
      await setAITagConfig(c.env.DB, aiTagConfig)
      return c.json(result.success(aiTagConfig))
    }
    catch (error) {
      console.error(error)
      return c.json(result.error(500, 'Failed to update config'))
    }
  },
)

export default app
