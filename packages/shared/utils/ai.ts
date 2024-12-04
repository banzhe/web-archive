import type { AITagConfig } from 'types/config'

export type GenerateTagProps = {
  title: string
  pageDesc: string
} & AITagConfig

interface GenerateTagResponse {
  choices: [
    {
      message: {
        content: string
        role: string
      }
    },
  ]
  created: number
  id: string
  model: string
  usage: {
    completion_tokens: number
    prompt_tokens: number
    total_tokens: number
  }
}

export function buildGenerateTagMessage(props: {
  title: string
  pageDesc: string
  tagLanguage: string
  preferredTags: string[]
}) {
  return [
    {
      role: 'system' as const,
      content: generateChatCompletion(props.tagLanguage, props.preferredTags),
    },
    {
      role: 'user' as const,
      content: JSON.stringify({
        title: props.title,
        pageDesc: props.pageDesc,
      }),
    },
  ]
}

function generateChatCompletion(tagLanguage: string, preferredTags: string[]): string {
  return `What tags would you give to the input content? Please follow these rules:
    1. Use ${tagLanguage === 'zh' ? 'chinese' : 'english'} for most tags
    2. Keep common technical terms and abbreviations as-is
    3. Keep brand names in their original form
    4. Note that tags should be keywords related to the content, not explanations of the content
    5. Return format must be: {"tags": ["tag1", "tag2", ...]}
    6. Do not return any explanatory text
    7. Please prioritize these tags and add other relevant tags based on the content: [${preferredTags.join(', ')}]
    8. Keep tags concise and focused. Return no more than 5 tags in total
    9. Select the most representative and important tags only
  `
}

export async function generateTagByOpenAI(props: GenerateTagProps): Promise<Array<string>> {
  if (props.type !== 'openai') {
    throw new Error('Invalid AI tag config')
  }
  const res = await fetch(props.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${props.apiKey}`,
    },
    body: JSON.stringify({
      messages: buildGenerateTagMessage(props),
      model: props.model,
    }),
  })

  if (!res.ok) {
    const content = await res.json()
    throw new Error(content.error.message)
  }

  try {
    const data = await res.json() as GenerateTagResponse
    const content = data.choices[0].message.content
    const tagJson = JSON.parse(content)
    return tagJson.tags.slice(0, 5)
  }
  catch (error) {
    throw new Error('Failed to parse response, please try again or change model')
  }
}
