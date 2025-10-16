import type { PromptRequest, PromptResponse } from '#shared/types/api'
import process from 'node:process'
import { ISSUE_TYPE_GUIDE, ISSUE_TYPE_PROMPT_VALUES, normalizeIssueType } from '#shared/constants/issue-types'
import { SCOPE_DESCRIPTIONS } from '#shared/constants/scopes'
import OpenAI from 'openai'
import {
  buildClarificationSystemPrompt,
  buildClarificationUserPrompt,
  buildIssuePrompt,
  buildSystemPrompt,
} from '../prompts'

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam
type ChatChoice = OpenAI.Chat.Completions.ChatCompletion.Choice

interface JiraTask {
  title?: string
  description?: string
  issueType?: unknown
  type?: unknown
}

interface SufficiencyResult {
  status: 'enough' | 'not_enough'
  reason?: string
  missing_info_prompt?: string
}

const MAX_CLARIFICATION_ROUNDS = 3

let openaiClient: OpenAI | null = null
let cachedApiKey: string | null = null

function getOpenAIClient(apiKey: string) {
  if (!openaiClient || cachedApiKey !== apiKey) {
    openaiClient = new OpenAI({ apiKey, maxRetries: 2, timeout: 30_000 })
    cachedApiKey = apiKey
  }
  return openaiClient
}

const SYSTEM_PROMPT = buildSystemPrompt({
  issueGuide: ISSUE_TYPE_GUIDE,
  issueTypeValues: ISSUE_TYPE_PROMPT_VALUES,
})

function appendClarifications(text: string, clarifications: string[]) {
  if (!clarifications.length)
    return text

  const numberedClarifications = clarifications
    .map((clarification, index) => `${index + 1}. ${clarification}`)
    .join('\n')

  return `${text}\n\nClarifications so far:\n${numberedClarifications}`
}

function buildIssueContextPrompt(context: string, scope: string[]) {
  const prefix = scope.length > 1 ? scope.map(scopeName => scopeName.toUpperCase()).join('+') : scope[0].toUpperCase()

  const scopeDetails = scope
    .map(scopeName => `- ${scopeName.toUpperCase()}: ${SCOPE_DESCRIPTIONS.get(scopeName) || 'General scope.'}`)
    .join('\n')

  return buildIssuePrompt({
    context,
    scopeDetails,
    prefix,
  })
}

function removeJsonCodeFences(jsonString: string) {
  return jsonString.replace(/```\w*\s*/g, '').replace(/```/g, '').trim()
}

function shouldEscapeCharacter(char: string): boolean {
  return char === '\n' || char === '\r' || char === '\t' || char < ' '
}

function escapeCharacter(char: string): string {
  if (char === '\n')
    return '\\n'
  if (char === '\r')
    return '\\r'
  if (char === '\t')
    return '\\t'
  if (char < ' ') {
    const hex = char.charCodeAt(0).toString(16).padStart(4, '0')
    return `\\u${hex}`
  }
  return char
}

function escapeControlCharacters(jsonString: string) {
  let result = ''
  let inString = false
  let escapeNext = false

  for (const char of jsonString) {
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

    if (shouldEscapeCharacter(char)) {
      result += escapeCharacter(char)
      continue
    }

    result += char
  }

  return result
}

function sanitizeJsonResponse(jsonString: string) {
  return escapeControlCharacters(removeJsonCodeFences(jsonString))
}

function flattenMessageContent(content: OpenAI.Chat.Completions.ChatCompletionMessage['content']): string {
  if (!content)
    return ''

  if (typeof content === 'string')
    return content

  if (Array.isArray(content))
    return (content as unknown[]).map(part => flattenMessageContent(part as OpenAI.Chat.Completions.ChatCompletionMessage['content'])).join('')

  if (typeof content === 'object') {
    const chunk = content as Record<string, unknown>
    return (
      flattenMessageContent(chunk.text as any)
      || flattenMessageContent(chunk.content as any)
      || (typeof chunk.arguments === 'string' ? chunk.arguments : '')
    )
  }

  return ''
}

function logMessageDebugInfo(message: OpenAI.Chat.Completions.ChatCompletionMessage, stage: string) {
  console.warn(`[${stage}] Message:`, JSON.stringify({
    role: message.role,
    contentType: typeof message.content,
    contentPreview: typeof message.content === 'string' ? message.content.slice(0, 100) : message.content,
    hasToolCalls: !!message.tool_calls,
    toolCallsCount: message.tool_calls?.length || 0,
    refusal: message.refusal,
  }, null, 2))
}

function extractContentFromMessage(message: OpenAI.Chat.Completions.ChatCompletionMessage, stage: string): string | null {
  const rawContent = flattenMessageContent(message.content)
  if (rawContent && rawContent.trim()) {
    console.warn(`[${stage}] Using content, length:`, rawContent.trim().length)
    return sanitizeJsonResponse(rawContent)
  }
  return null
}

function extractContentFromToolCalls(message: OpenAI.Chat.Completions.ChatCompletionMessage, stage: string): string | null {
  for (const call of message.tool_calls || []) {
    if (call?.type !== 'function')
      continue

    const functionCall = (call as { function?: { arguments?: unknown } }).function
    if (functionCall && typeof functionCall.arguments === 'string' && functionCall.arguments.trim()) {
      console.warn(`[${stage}] Using tool call arguments`)
      return sanitizeJsonResponse(functionCall.arguments)
    }
  }
  return null
}

function extractChoicePayload(choice: ChatChoice | undefined, stage: 'primary' | 'fallback') {
  const message = choice?.message
  if (!message) {
    console.error(`[${stage}] No message in choice:`, choice)
    throw createError({ statusCode: 502, message: `Missing assistant message (${stage}).` })
  }

  logMessageDebugInfo(message, stage)

  const contentFromMessage = extractContentFromMessage(message, stage)
  if (contentFromMessage)
    return contentFromMessage

  const contentFromToolCalls = extractContentFromToolCalls(message, stage)
  if (contentFromToolCalls)
    return contentFromToolCalls

  if (typeof message.refusal === 'string' && message.refusal.trim())
    throw createError({ statusCode: 502, message: `OpenAI refused request (${stage}).` })

  console.error(`[${stage}] Empty response - message dump:`, message)
  throw createError({ statusCode: 502, message: `Empty response from OpenAI (${stage}).` })
}

async function generateCompletion(openai: OpenAI, model: string, messages: ChatMessage[], maxTokens = 400) {
  const completion = await openai.chat.completions.create({
    model,
    messages,
    max_completion_tokens: maxTokens,
  })
  const cleanedResponse = extractChoicePayload(completion.choices[0], 'primary')
  return cleanedResponse
}

function parseJsonSafely<T>(jsonString: string): T | null {
  try {
    return JSON.parse(jsonString)
  }
  catch {
    return null
  }
}

function getApiKey(config: any): string {
  const apiKey = (config.openaiApiKey || process.env.NUXT_OPENAI_API_KEY || '').trim()
  if (!apiKey)
    throw createError({ statusCode: 500, message: 'Missing OpenAI API key' })
  return apiKey
}

function validateRequestText(text: string | undefined): string {
  const trimmedText = text?.trim()
  if (!trimmedText)
    throw createError({ statusCode: 400, message: 'No text provided' })
  return trimmedText
}

function normalizeScopeArray(scope: unknown): string[] {
  return Array.isArray(scope) && scope.length ? scope : ['ui']
}

function normalizeClarifications(clarifications: unknown): string[] {
  if (!Array.isArray(clarifications))
    return []
  return clarifications.map(item => String(item).trim()).filter(Boolean)
}

function hasReachedMaxClarificationRounds(clarificationCount: number): boolean {
  return clarificationCount >= MAX_CLARIFICATION_ROUNDS
}

async function generateFallbackClarificationPrompt(
  client: OpenAI,
  model: string,
  text: string,
  previousClarifications: string[],
): Promise<string> {
  const fallbackMessages: ChatMessage[] = [
    { role: 'system', content: buildClarificationSystemPrompt() },
    {
      role: 'user',
      content: buildClarificationUserPrompt({
        text,
        clarifications: previousClarifications.length ? previousClarifications.join(' | ') : 'none',
      }),
    },
  ]

  const generatedPrompt = await generateCompletion(client, model, fallbackMessages, 100)
  return generatedPrompt || 'Could you provide more detail about what is missing?'
}

async function handleClarificationRequest(
  parsed: SufficiencyResult & JiraTask,
  previousClarifications: string[],
  client: OpenAI,
  model: string,
  text: string,
): Promise<PromptResponse> {
  if (hasReachedMaxClarificationRounds(previousClarifications.length)) {
    return {
      status: 'error',
      reason: `Reached the maximum number of clarification rounds (${MAX_CLARIFICATION_ROUNDS}).`,
    }
  }

  const clarificationPrompt = parsed.missing_info_prompt?.trim()
  if (clarificationPrompt) {
    return {
      status: 'needs_info',
      reason: parsed.reason || 'More detail is needed.',
      missingInfoPrompt: clarificationPrompt,
    }
  }

  const fallbackPrompt = await generateFallbackClarificationPrompt(client, model, text, previousClarifications)
  return {
    status: 'needs_info',
    reason: parsed.reason || 'More detail required.',
    missingInfoPrompt: fallbackPrompt,
  }
}

function handleJiraIssueResponse(parsed: JiraTask, rawResponse: string): PromptResponse {
  const issueType = normalizeIssueType(parsed.issueType ?? parsed.type)

  if (!issueType) {
    throw createError({
      statusCode: 502,
      message: 'Unexpected AI response — missing or invalid issue type',
      data: { preview: rawResponse.slice(0, 200) },
    })
  }

  if (!parsed.title || !parsed.description) {
    throw createError({
      statusCode: 502,
      message: 'Unexpected AI response — missing title or description',
      data: { preview: rawResponse.slice(0, 200) },
    })
  }

  return {
    status: 'done',
    title: parsed.title,
    description: parsed.description,
    issueType,
  }
}

export default defineEventHandler(async (event): Promise<PromptResponse> => {
  const config = useRuntimeConfig(event)
  const body = await readBody<PromptRequest>(event)

  const apiKey = getApiKey(config)
  const text = validateRequestText(body?.text)
  const scope = normalizeScopeArray(body.scope)
  const previousClarifications = normalizeClarifications(body.previousClarifications)
  const client = getOpenAIClient(apiKey)
  const model = body.agent ?? 'gpt-4o-mini'

  console.warn(`[prompt] Using model: ${model}`)

  const workingNotes = appendClarifications(text, previousClarifications)

  // === Step 1: evaluate sufficiency or generate issue directly ===
  const systemMsg: ChatMessage = { role: 'system', content: SYSTEM_PROMPT }
  const userMsg: ChatMessage = { role: 'user', content: buildIssueContextPrompt(workingNotes, scope) }

  const rawResponse = await generateCompletion(client, model, [systemMsg, userMsg])
  const parsed = parseJsonSafely<SufficiencyResult & JiraTask>(rawResponse)

  if (!parsed)
    throw createError({ statusCode: 502, message: 'Invalid JSON returned by model' })

  if (parsed.status === 'not_enough') {
    return handleClarificationRequest(parsed, previousClarifications, client, model, text)
  }

  return handleJiraIssueResponse(parsed, rawResponse)
})
