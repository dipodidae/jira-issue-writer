import type { PromptRequest, PromptResponse } from '#shared/types/api'
import process from 'node:process'
import OpenAI from 'openai'

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam
type ChatChoice = OpenAI.Chat.Completions.ChatCompletion.Choice
type CompletionStage = 'initial' | 'retry' | 'sufficiency' | 'sufficiency-retry'

interface CompletionPayload {
  raw: string
  cleaned: string
}

type SufficiencyStatus = 'enough' | 'not_enough'

interface SufficiencyResult {
  status: SufficiencyStatus
  reason?: string
  missing_info_prompt?: string
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
You are a Jira co-pilot AI assistant helping users turn rough notes into developer-actionable Jira issues.

Follow this process:
1. Evaluate whether the provided information is sufficient to create a high-quality Jira issue.
   - If anything critical is missing, respond with {"status":"not_enough","reason":"why the input is insufficient","missing_info_prompt":"concise clarifying question"}.
2. When the information is sufficient, respond with {"status":"enough","title":"[SCOPE]: short, concrete summary","description":"Detailed, factual explanation of the problem, its impact, and the expected outcome."}.

Guidelines:
- Title stays under 100 characters and always begins with [SCOPE]. When multiple scopes apply, join them with + (e.g., [UI+API]).
- Description uses plain text paragraphs separated by \n\n and covers problem, impact, and expected outcome.
- Avoid bullet lists, markdown formatting, and code fences.
- Use product terminology from the context when it improves clarity and avoid speculation.
- Always return valid JSON with double quotes and no trailing commentary.
`.trim()

const SUFFICIENCY_SYSTEM_PROMPT = `
You are evaluating whether the provided context is sufficient to draft a high-quality Jira issue.
Return a JSON object only.
- If the information is sufficient, respond with {"status":"enough"}.
- If the information is insufficient, respond with {"status":"not_enough","reason":"short explanation","missing_info_prompt":"single clarifying question"}.
The missing_info_prompt must be a single, specific question that references relevant product terms when available.
`.trim()

const MAX_CLARIFICATION_ROUNDS = 3

const SCOPE_DESCRIPTIONS = {
  'ui': 'User interface components, styling, and visual presentation.',
  'api': 'Backend endpoints, server logic, and data processing.',
  'ux': 'User experience, workflows, and overall product usability.',
  'proactive-frame': 'Legacy iframe collaborating with the modern app; only mention when it materially affects the issue.',
} as const

function buildPrompt(text: string, scopes: string[]) {
  const descriptions = scopes
    .map((scopeKey) => {
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

function buildSufficiencyPrompt(text: string, clarifications: string[], scopes: string[]) {
  const clarificationsBlock = clarifications.length
    ? `Additional clarifications provided so far:\n${clarifications.map((entry, index) => `${index + 1}. ${entry}`).join('\n')}`
    : 'No additional clarifications have been collected yet.'

  return `
User provided notes:
${text}

${clarificationsBlock}

Relevant scopes: ${scopes.join(', ')}

Decide if this information is enough to write a high-quality Jira issue.
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

function parseSufficiencyResult(payload: CompletionPayload, stage: CompletionStage): SufficiencyResult {
  try {
    return JSON.parse(payload.cleaned) as SufficiencyResult
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown JSON parse error'
    logDebug(`${stage} sufficiency parse error`, {
      error: message,
      cleanedPreview: payload.cleaned.slice(0, 160),
    })
    throw createError({ statusCode: 502, message: `Invalid JSON from model (${stage}): ${message}` })
  }
}

function ensureValidSufficiency(result: SufficiencyResult, stage: CompletionStage) {
  if (result.status === 'enough')
    return

  if (result.status === 'not_enough' && result.missing_info_prompt)
    return

  throw createError({
    statusCode: 502,
    message: `AI sufficiency check missing required fields during ${stage} stage.`,
    data: result,
  })
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

function buildSufficiencyRetryMessages(baseMessages: ChatMessage[], assistantRaw: string): ChatMessage[] {
  return [
    ...baseMessages,
    { role: 'assistant', content: assistantRaw },
    {
      role: 'user',
      content: 'Return only a JSON object with status and, when status is "not_enough", include reason and missing_info_prompt.',
    },
  ]
}

async function generateJiraTask(params: { openai: OpenAI, agent: string, baseMessages: ChatMessage[] }) {
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

async function checkInformationSufficiency(params: {
  openai: OpenAI
  agent: string
  text: string
  scope: string[]
  clarifications: string[]
}) {
  const { openai, agent, text, scope, clarifications } = params
  const messages: ChatMessage[] = [
    { role: 'system', content: SUFFICIENCY_SYSTEM_PROMPT },
    { role: 'user', content: buildSufficiencyPrompt(text, clarifications, scope) },
  ]

  const initialResult = await openai.chat.completions.create({
    model: agent,
    messages,
    max_completion_tokens: 300,
  })
  let payload = extractCompletionPayload(initialResult.choices[0], 'sufficiency')
  let result = parseSufficiencyResult(payload, 'sufficiency')
  ensureValidSufficiency(result, 'sufficiency')

  if (result.status === 'enough' || result.missing_info_prompt)
    return result

  const retryMessages = buildSufficiencyRetryMessages(messages, payload.raw)

  const retryResult = await openai.chat.completions.create({
    model: agent,
    messages: retryMessages,
    max_completion_tokens: 300,
  })
  payload = extractCompletionPayload(retryResult.choices[0], 'sufficiency-retry')
  result = parseSufficiencyResult(payload, 'sufficiency-retry')
  ensureValidSufficiency(result, 'sufficiency-retry')
  return result
}

export default defineEventHandler(async (event): Promise<PromptResponse> => {
  const config = useRuntimeConfig(event)
  const body = await readBody<PromptRequest>(event)

  const trimmedText = body?.text?.trim()
  const agent = body?.agent ?? 'gpt-5-mini'
  const scope = Array.isArray(body?.scope) && body.scope.length ? body.scope : ['ui']
  const previousClarifications = Array.isArray(body?.previousClarifications)
    ? body.previousClarifications.map(entry => entry?.toString?.().trim()).filter((entry): entry is string => Boolean(entry))
    : []

  if (!trimmedText)
    throw createError({ statusCode: 400, message: 'No text provided' })

  const apiKey = (config.openaiApiKey || process.env.NUXT_OPENAI_API_KEY || '').trim()
  if (!apiKey)
    throw createError({ statusCode: 500, message: 'Missing OpenAI API key (NUXT_OPENAI_API_KEY).' })

  const client = getOpenAIClient(apiKey)
  const normalizedText = trimmedText.replace(/\s+/g, ' ')

  const sufficiency = await checkInformationSufficiency({
    openai: client,
    agent,
    text: normalizedText,
    scope,
    clarifications: previousClarifications,
  })

  if (sufficiency.status === 'not_enough') {
    if (previousClarifications.length >= MAX_CLARIFICATION_ROUNDS) {
      return {
        status: 'error',
        reason: `Reached the maximum number of clarification rounds (${MAX_CLARIFICATION_ROUNDS}).`,
      }
    }

    return {
      status: 'needs_info',
      reason: sufficiency.reason || 'More detail is required to draft a useful Jira issue.',
      missingInfoPrompt: sufficiency.missing_info_prompt || 'What additional details would clarify the issue?',
    }
  }

  const fullContext = [normalizedText, ...previousClarifications].join('\n\n')
  const baseMessages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildPrompt(fullContext, scope) },
  ]

  try {
    const jiraTask = await generateJiraTask({ openai: client, agent, baseMessages })
    return { status: 'done', title: jiraTask.title, description: jiraTask.description }
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
