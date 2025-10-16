import type { PromptRequest, PromptResponse } from '#shared/types/api'
import process from 'node:process'
import OpenAI from 'openai'

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam
type ChatChoice = OpenAI.Chat.Completions.ChatCompletion.Choice
type CompletionStage = 'initial' | 'retry'

interface CompletionPayload {
  raw: string
  cleaned: string
}

interface JiraTask {
  title: string
  description: string
}

let openaiClient: OpenAI | null = null
let cachedApiKey: string | null = null

function getOpenAIClient(apiKey: string) {
  if (!openaiClient || cachedApiKey !== apiKey) {
    openaiClient = new OpenAI({ apiKey, maxRetries: 3, timeout: 30_000 })
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
- Description: Use clear paragraphs separated by \n\n.
- Structure the description with:
  • Problem statement (what is broken/needed)
  • Context or impact (why it matters)
  • Expected behavior (what should happen)
- Avoid markdown formatting, bullet lists, and code fences.
- Return raw JSON only.
- Some scope labels are internal (e.g., "proactive-frame") — only include them when they explain the cause or fix location.
`.trim()

const SCOPE_DESCRIPTIONS = {
  'ui': 'User interface components, styling, and visual presentation.',
  'api': 'Backend endpoints, server logic, and data processing.',
  'ux': 'User experience, workflows, and overall product usability.',
  'proactive-frame': 'Legacy iframe collaborating with the modern app; only mention when it materially affects the issue.',
} as const

function buildPrompt(text: string, scopes: string[]) {
  const descriptions = scopes
    .map(scopeKey => {
      const description = SCOPE_DESCRIPTIONS[scopeKey as keyof typeof SCOPE_DESCRIPTIONS]
      return `- ${scopeKey.toUpperCase()}: ${description ?? 'Scope description missing.'}`
    })
    .join('\n')

  const prefix = scopes.length > 1
    ? scopes.map(scopeKey => scopeKey.toUpperCase()).join('+')
    : scopes[0].toUpperCase()

  return `
Input:
${text}

Relevant scope(s):
${descriptions}

Write a Jira issue describing the problem and expected outcome.
Prefix the title with [${prefix}].
`.trim()
}

function logDebug(step: string, data: unknown) {
  if (process.env.NODE_ENV !== 'production')
    console.warn(`[api/prompt] ${step}`, data)
}

function flattenMessageContent(content: unknown): string {
  if (!content)
    return ''

  if (typeof content === 'string')
    return content

  if (Array.isArray(content))
    return content.map(flattenMessageContent).join('')

  if (typeof content === 'object') {
    const record = content as Record<string, unknown>
    return (
      flattenMessageContent(record.text)
      || flattenMessageContent(record.content)
      || (typeof record.arguments === 'string' ? record.arguments : '')
    )
  }

  return ''
}

function stripJsonFences(raw: string) {
  return raw.replace(/```(json)?\n?/gi, '')
}

function escapeControlCharactersInJsonStrings(jsonCandidate: string) {
  let result = ''
  let inString = false
  let escapeNext = false

  for (let index = 0; index < jsonCandidate.length; index++) {
    const char = jsonCandidate[index]

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

function sanitizeCompletionJson(raw: string) {
  return escapeControlCharactersInJsonStrings(stripJsonFences(raw).trim())
}

function extractCompletionPayload(choice: ChatChoice | undefined, stage: CompletionStage): CompletionPayload {
  const message: Record<string, unknown> | undefined = choice?.message as any

  if (!message)
    throw createError({ statusCode: 502, message: `Missing assistant message during ${stage} completion.` })

  const raw = flattenMessageContent(message.content)
  if (raw && raw.trim()) {
    const cleaned = sanitizeCompletionJson(raw)
    logDebug(`${stage} payload`, {
      rawPreview: raw.slice(0, 160),
      cleanedLength: cleaned.length,
    })
    return { raw, cleaned }
  }

  const toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : []
  const toolCall = toolCalls.find(call =>
    call?.type === 'function'
    && typeof call.function?.arguments === 'string'
    && call.function.arguments.trim(),
  ) as { function?: { arguments?: string } } | undefined

  if (toolCall?.function?.arguments) {
    const args = toolCall.function.arguments
    const cleaned = sanitizeCompletionJson(args)
    logDebug(`${stage} tool payload`, {
      rawPreview: args.slice(0, 160),
      cleanedLength: cleaned.length,
    })
    return { raw: args, cleaned }
  }

  const refusal = typeof message.refusal === 'string' ? message.refusal.trim() : ''
  if (refusal)
    throw createError({ statusCode: 502, message: `OpenAI refused: ${refusal}` })

  throw createError({ statusCode: 502, message: `Empty response from OpenAI during ${stage} completion.` })
}

function parseJiraTask(payload: CompletionPayload, stage: CompletionStage): JiraTask {
  try {
    return JSON.parse(payload.cleaned) as JiraTask
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown JSON parse error'
    logDebug(`${stage} parse error`, {
      error: message,
      cleanedPreview: payload.cleaned.slice(0, 160),
    })
    throw createError({ statusCode: 502, message: `Invalid JSON from model (${stage}): ${message}` })
  }
}

function isValidJiraTask(candidate: JiraTask | null | undefined): candidate is JiraTask {
  if (!candidate)
    return false

  const titlePasses = typeof candidate.title === 'string' && /^\[[A-Z0-9+-]+\]:/.test(candidate.title)
  const descriptionPasses = typeof candidate.description === 'string' && candidate.description.length >= 40
  return titlePasses && descriptionPasses
}

function ensureValidJiraTask(task: JiraTask, stage: CompletionStage) {
  if (!isValidJiraTask(task)) {
    throw createError({
      statusCode: 502,
      message: `AI output missing required fields during ${stage} completion.`,
      data: task,
    })
  }
}

async function createChatCompletion(openai: OpenAI, agent: string, messages: ChatMessage[]) {
  return openai.chat.completions.create({ model: agent, max_completion_tokens: 1_000, messages })
}

function buildRetryMessages(baseMessages: ChatMessage[], assistantRaw: string): ChatMessage[] {
  return [
    ...baseMessages,
    { role: 'assistant', content: assistantRaw },
    {
      role: 'user',
      content: 'Your previous output was invalid JSON. Return only a JSON object with both "title" and "description" fields.',
    },
  ]
}

async function generateJiraTask(params: { openai: OpenAI; agent: string; baseMessages: ChatMessage[] }) {
  const { openai, agent, baseMessages } = params

  const initialResult = await createChatCompletion(openai, agent, baseMessages)
  let payload = extractCompletionPayload(initialResult.choices[0], 'initial')
  let jiraTask = parseJiraTask(payload, 'initial')

  if (isValidJiraTask(jiraTask))
    return jiraTask

  const retryMessages = buildRetryMessages(baseMessages, payload.raw)
  const retryResult = await createChatCompletion(openai, agent, retryMessages)
  payload = extractCompletionPayload(retryResult.choices[0], 'retry')
  jiraTask = parseJiraTask(payload, 'retry')
  ensureValidJiraTask(jiraTask, 'retry')
  return jiraTask
}

export default defineEventHandler(async (event): Promise<PromptResponse> => {
  const config = useRuntimeConfig(event)
  const body = await readBody<PromptRequest>(event)

  const trimmedText = body?.text?.trim()
  const agent = body?.agent ?? 'gpt-5-mini'
  const scope = body?.scope ?? ['ui']

  if (!trimmedText)
    throw createError({ statusCode: 400, message: 'No text provided' })

  if (!Array.isArray(scope) || scope.length === 0)
    throw createError({ statusCode: 400, message: 'At least one scope required' })

  const apiKey = (config.openaiApiKey || process.env.NUXT_OPENAI_API_KEY || '').trim()
  if (!apiKey)
    throw createError({ statusCode: 500, message: 'Missing OpenAI API key (NUXT_OPENAI_API_KEY).' })

  const client = getOpenAIClient(apiKey)
  const normalizedText = trimmedText.replace(/\s+/g, ' ')
  const baseMessages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildPrompt(normalizedText, scope) },
  ]

  try {
    const jiraTask = await generateJiraTask({ openai: client, agent, baseMessages })
    return { title: jiraTask.title, description: jiraTask.description }
  }
  catch (error: unknown) {
    if (error instanceof OpenAI.APIError) {
      if (error instanceof OpenAI.AuthenticationError) {
        throw createError({
          statusCode: 500,
          message: 'Invalid OpenAI API key',
          data: { hint: 'Verify NUXT_OPENAI_API_KEY at https://platform.openai.com/api-keys' },
        })
      }

      if (error instanceof OpenAI.RateLimitError) {
        throw createError({
          statusCode: 429,
          message: 'Rate limit exceeded',
          data: { retryAfter: error.headers?.get('retry-after') || 'unknown' },
        })
      }

      throw createError({
        statusCode: error.status || 502,
        message: error.message || 'OpenAI API error',
        data: { requestID: error.requestID },
      })
    }

    const fallbackMessage = error instanceof Error ? error.message : 'Failed to generate Jira task'
    throw createError({ statusCode: 502, message: fallbackMessage })
  }
})
