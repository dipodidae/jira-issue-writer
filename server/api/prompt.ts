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

function logDebug(step: string, data: unknown) {
  if (process.env.NODE_ENV !== 'production')
    console.warn(`[api/prompt] ${step}`, data)
}

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

type ChatCompletionChoice = OpenAI.Chat.Completions.ChatCompletion.Choice

function flattenMessageContent(content: any): string {
  if (!content)
    return ''
  if (typeof content === 'string')
    return content
  if (Array.isArray(content))
    return content.map(flattenMessageContent).join('')
  if (typeof content === 'object') {
    if (typeof content.text === 'string')
      return content.text
    if (Array.isArray(content.text))
      return content.text.map(flattenMessageContent).join('')
    if (typeof content.text?.value === 'string')
      return content.text.value
    if (Array.isArray(content.text?.content))
      return content.text.content.map(flattenMessageContent).join('')
    if (typeof content.content === 'string')
      return content.content
    if (Array.isArray(content.content))
      return content.content.map(flattenMessageContent).join('')
    if (typeof content.arguments === 'string')
      return content.arguments
  }
  return ''
}

function sanitizeJsonCandidate(raw: string) {
  const withoutFences = raw.replace(/```(json)?\n?/g, '').trim()
  return escapeControlCharactersInJsonStrings(withoutFences).trim()
}

function extractJsonPayload(choice: ChatCompletionChoice | undefined) {
  const message: any = choice?.message

  if (!message)
    return null

  // Models can answer either via plain content or by invoking a tool call that carries JSON arguments.
  const rawContent = flattenMessageContent(message.content)

  if (rawContent && rawContent.trim()) {
    const cleaned = sanitizeJsonCandidate(rawContent)
    return {
      raw: rawContent,
      cleaned: cleaned || rawContent.trim(),
    }
  }

  const toolCall = message.tool_calls?.find((call: any) =>
    call?.type === 'function'
    && typeof call.function?.arguments === 'string'
    && call.function.arguments.trim(),
  )

  if (toolCall) {
    const rawArgs = toolCall.function.arguments
    const cleanedArgs = sanitizeJsonCandidate(rawArgs) || rawArgs.trim()
    return { raw: rawArgs, cleaned: cleanedArgs }
  }

  const refusal = typeof message.refusal === 'string' ? message.refusal.trim() : ''

  if (refusal) {
    throw createError({
      statusCode: 502,
      message: `OpenAI refused to comply: ${refusal}`,
    })
  }

  return null
}

function escapeControlCharactersInJsonStrings(jsonCandidate: string) {
  let result = ''
  let inString = false
  let escapeNext = false

  for (let i = 0; i < jsonCandidate.length; i++) {
    const char = jsonCandidate[i]

    if (!inString) {
      result += char

      if (char === '"')
        inString = true

      continue
    }

    if (escapeNext) {
      result += char
      escapeNext = false
      continue
    }

    if (char === '\\') {
      result += char
      escapeNext = true
      continue
    }

    if (char === '"') {
      result += char
      inString = false
      continue
    }

    if (char === '\n') {
      result += '\\n'
      continue
    }

    if (char === '\r') {
      result += '\\r'
      continue
    }

    if (char === '\t') {
      result += '\\t'
      continue
    }

    if (char < ' ') {
      const hex = char.charCodeAt(0).toString(16).padStart(4, '0')
      result += `\\u${hex}`
      continue
    }

    result += char
  }

  return result
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

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      message: 'OpenAI API key is not configured. Set NUXT_OPENAI_API_KEY.',
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
    let payload = extractJsonPayload(response.choices[0])

    logDebug('initial payload', {
      hasChoice: Boolean(response.choices[0]),
      rawPreview: payload?.raw?.slice(0, 160),
      cleanedLength: payload?.cleaned?.length,
    })

    if (!payload?.cleaned) {
      throw createError({
        statusCode: 502,
        message: 'Empty response from OpenAI',
      })
    }

    let cleaned = payload.cleaned
    let jiraTask: any

    try {
      jiraTask = JSON.parse(cleaned)
    }
    catch (parseErr: any) {
      logDebug('parse error initial', {
        error: parseErr?.message,
        cleanedPreview: cleaned.slice(0, 160),
      })
      throw createError({
        statusCode: 502,
        message: `Invalid JSON output from model: ${parseErr.message}`,
      })
    }

    // Validate and retry once if needed
    if (!validateJiraOutput(jiraTask)) {
      const retryMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        ...baseMessages,
      ]

      if (payload.raw) {
        retryMessages.push({
          role: 'assistant',
          content: payload.raw,
        })
      }

      retryMessages.push({
        role: 'user',
        content: 'Your previous output did not follow the required JSON format. Please ensure you return a valid JSON object with "title" starting with [SCOPE]: and "description" fields. Return ONLY the JSON object, no markdown code fences.',
      })

      response = await createCompletion(retryMessages)
      payload = extractJsonPayload(response.choices[0])

      logDebug('retry payload', {
        hasChoice: Boolean(response.choices[0]),
        rawPreview: payload?.raw?.slice(0, 160),
        cleanedLength: payload?.cleaned?.length,
      })

      if (!payload?.cleaned) {
        throw createError({
          statusCode: 502,
          message: 'Empty response from OpenAI on retry',
        })
      }

      cleaned = payload.cleaned

      try {
        jiraTask = JSON.parse(cleaned)
      }
      catch (retryParseErr: any) {
        logDebug('parse error retry', {
          error: retryParseErr?.message,
          cleanedPreview: cleaned.slice(0, 160),
        })
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
