import { Hono } from 'hono'
import { validator } from 'hono/validator'
import type { HonoTypeUserInformation } from '~/constants/binding'
import { getShouldShowRecent, setShouldShowRecent } from '~/model/store'
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

export default app
