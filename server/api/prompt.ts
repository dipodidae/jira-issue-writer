import type { PromptRequest, PromptResponse } from '#shared/types/api'
import process from 'node:process'
import OpenAI from 'openai'

let openaiClient: OpenAI | null = null
let cachedApiKey: string | null = null

function getOpenAIClient(apiKey: string) {
  if (!openaiClient || cachedApiKey !== apiKey) {
    openaiClient = new OpenAI({
      apiKey,
      maxRetries: 3,
      timeout: 30_000, // 30 seconds
    })
    cachedApiKey = apiKey
  }
  return openaiClient
}

const SYSTEM_PROMPT = `
You are a Jira expert who creates concise, developer-actionable issues.
Always output valid JSON matching this schema:

{
  "title": "[SCOPE]: short, concrete summary of the problem or task",
  "description": "Detailed, factual context explaining what is wrong, why it matters, and what should happen instead."
}

Guidelines:
- Title: under 100 characters, always starts with [SCOPE].
- Description: Use clear paragraphs separated by double newlines (\\n\\n). Structure it with:
  • Problem statement (what is broken/needed)
  • Context or impact (why it matters)
  • Expected behavior (what should happen)
- Use simple formatting: newlines for readability, but avoid markdown headers, code fences, or bullets.
- Return raw JSON only.
- Some scope labels are internal (e.g., "proactive-frame") — use them only when they directly explain *why* the problem occurs or where it must be fixed, not as filler context.

Example:
{
  "title": "[UI]: Dropdown flickers when opening user menu",
  "description": "When clicking the user menu dropdown in the top bar, it flickers rapidly before stabilizing. This affects Chrome and Safari on both desktop and mobile.\n\nThe flickering creates a jarring user experience and makes the interface feel unpolished.\n\nExpected behavior: dropdown opens smoothly and remains stable until dismissed."
}
`.trim()

function JIRA_PROMPT_TEMPLATE(text: string, scopes: string[]) {
  const scopeContext = {
    'ui': 'User interface components, styling, and visual presentation.',
    'api': 'Backend endpoints, server logic, and data processing.',
    'ux': 'User experience, workflows, and overall product usability.',
    'proactive-frame': 'A legacy server-rendered iframe application that interacts with modern views. Mention only if relevant to the problem cause or resolution.',
  } as const

  const scopeDescriptions = scopes
    .map(s => `- ${s.toUpperCase()}: ${scopeContext[s as keyof typeof scopeContext]}`)
    .join('\n')

  const scopePrefix = scopes.length === 1
    ? scopes[0].toUpperCase()
    : scopes.map(s => s.toUpperCase()).join('+')

  return `
Input:
${text}

Relevant scope(s):
${scopeDescriptions}

Write a Jira issue describing the problem and expected outcome.
If the issue involves cross-behavior between the modern app and legacy iframe (proactive-frame), mention it only when it materially affects cause, navigation, or data consistency.
Prefix the title with [${scopePrefix}] to indicate scope.
`.trim()
}

function validateJiraOutput(jiraTask: any): boolean {
  const titlePattern = /^\[[A-Z0-9+-]+\]:/
  const hasValidTitle = jiraTask?.title?.match(titlePattern)
  const hasValidDescription = jiraTask?.description && jiraTask.description.length >= 40

  return hasValidTitle && hasValidDescription
}

export default defineEventHandler(async (event): Promise<PromptResponse> => {
  const config = useRuntimeConfig(event)
  const body = await readBody<PromptRequest>(event)

  const text = body?.text?.trim()
  const agent = body?.agent || 'gpt-5-mini'
  const scope = body?.scope || ['ui']

  if (!text)
    throw createError({ statusCode: 400, message: 'No text provided' })
  if (!agent)
    throw createError({ statusCode: 400, message: 'No agent specified' })
  if (!scope || !Array.isArray(scope) || scope.length === 0)
    throw createError({ statusCode: 400, message: 'At least one scope must be specified' })

  if (!config.openaiApiKey) {
    throw createError({
      statusCode: 500,
      message: 'OpenAI API key not configured. Set NUXT_OPENAI_API_KEY.',
    })
  }

  // Validate API key format (should start with sk-)
  const apiKey = (config.openaiApiKey || process.env.NUXT_OPENAI_API_KEY || '').trim()

  if (!apiKey.startsWith('sk-')) {
    throw createError({
      statusCode: 500,
      message: 'Invalid OpenAI API key format. Key should start with "sk-"',
    })
  }

  const openai = getOpenAIClient(apiKey)

  try {
    const baseMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JIRA_PROMPT_TEMPLATE(text.replace(/\s+/g, ' '), scope) },
    ]

    const createCompletion = async (messages: typeof baseMessages) =>
      await openai.chat.completions.create({
        model: agent,
        max_completion_tokens: 1000,
        messages,
      })

    let response = await createCompletion(baseMessages)
    let content = response.choices[0]?.message?.content?.trim()

    if (!content) {
      throw createError({
        statusCode: 502,
        message: 'Empty response from OpenAI',
      })
    }

    // Clean up and parse
    let cleaned = content.replace(/```(json)?\n?/g, '').trim()
    let jiraTask: any

    try {
      jiraTask = JSON.parse(cleaned)
    }
    catch (parseErr: any) {
      throw createError({
        statusCode: 502,
        message: `Invalid JSON output from model: ${parseErr.message}`,
      })
    }

    // Validate and retry once if needed
    if (!validateJiraOutput(jiraTask)) {
      const retryMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        ...baseMessages,
        { role: 'assistant', content } as OpenAI.Chat.Completions.ChatCompletionMessageParam,
        { role: 'user', content: 'Your previous output did not follow the required JSON format. Please ensure you return a valid JSON object with "title" starting with [SCOPE]: and "description" fields. Return ONLY the JSON object, no markdown code fences.' } as OpenAI.Chat.Completions.ChatCompletionMessageParam,
      ]
      response = await createCompletion(retryMessages)
      content = response.choices[0]?.message?.content?.trim()

      cleaned = content?.replace(/```(json)?\n?/g, '').trim() || ''

      try {
        jiraTask = JSON.parse(cleaned)
      }
      catch (retryParseErr: any) {
        throw createError({
          statusCode: 502,
          message: `Invalid JSON output from model on retry: ${retryParseErr.message}`,
        })
      }
    }

    if (!validateJiraOutput(jiraTask)) {
      throw createError({
        statusCode: 502,
        message: 'AI output missing required fields (title or description)',
        data: { output: jiraTask },
      })
    }

    return {
      title: jiraTask.title,
      description: jiraTask.description,
    }
  }
  catch (err: any) {
    if (err instanceof OpenAI.APIError) {
      if (err instanceof OpenAI.AuthenticationError) {
        throw createError({
          statusCode: 500,
          message: 'Invalid OpenAI API key. Please check your NUXT_OPENAI_API_KEY environment variable.',
          data: {
            error: 'Authentication failed with OpenAI',
            hint: 'Verify the API key is correct and active at https://platform.openai.com/api-keys',
          },
        })
      }

      if (err instanceof OpenAI.RateLimitError) {
        const headers = err.headers
        throw createError({
          statusCode: 429,
          message: 'Rate limit exceeded. Please try again later.',
          data: {
            retryAfter: headers?.get('retry-after') || 'unknown',
            resetTime: headers?.get('x-ratelimit-reset-requests') || 'unknown',
          },
        })
      }

      throw createError({
        statusCode: err.status || 502,
        message: err.message || 'OpenAI API error',
        data: { requestID: err.requestID },
      })
    }

    throw createError({
      statusCode: 502,
      message: err.message || 'Failed to generate Jira task',
    })
  }
})
