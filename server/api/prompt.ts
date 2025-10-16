import type { PromptRequest, PromptResponse } from '#shared/types/api'
import process from 'node:process'
import { ISSUE_TYPE_GUIDE, ISSUE_TYPE_PROMPT_VALUES, normalizeIssueType } from '#shared/constants/issue-types'
import { SCOPE_DESCRIPTIONS } from '#shared/constants/scopes'
import OpenAI from 'openai'

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

const SYSTEM_PROMPT = `
You are a Jira co-pilot AI assistant that transforms unstructured input (e.g., Slack messages, notes, ideas) into concise, developer-actionable Jira issues.

${ISSUE_TYPE_GUIDE}

OUTPUT RULES:
1. Always respond with a single valid JSON object (no commentary outside the JSON).
2. If the input provides enough context to create a Jira issue:
   {
     "status": "enough",
     "title": "[SCOPE]: short summary (under 100 chars)",
     "issueType": "<one of: ${ISSUE_TYPE_PROMPT_VALUES}>",
     "description": "Fill each required section for the selected issueType, using the exact headings and checklist style defined above, remaining factual and concise."
   }
3. If the input is unclear or lacks critical details:
   {
     "status": "not_enough",
     "reason": "Explain briefly what is missing or ambiguous.",
     "missing_info_prompt": "Ask ONE concrete, specific question that would clarify the missing part."
   }

NOTES:
- "[SCOPE]" should reflect the relevant feature, module, or context, inferred from input.
- Keep language concise, factual, and neutral — no speculation.
- Avoid generic titles like "Fix bug" or "Improve UX".
- Provide Markdown structure only inside the description field.
`.trim()

function composeWorkingNotes(text: string, clarifications: string[]) {
  if (!clarifications.length)
    return text

  const additions = clarifications.map((entry, index) => `${index + 1}. ${entry}`).join('\n')
  return `${text}\n\nClarifications so far:\n${additions}`
}

function buildPrompt(context: string, scope: string[]) {
  const prefix = scope.length > 1 ? scope.map(s => s.toUpperCase()).join('+') : scope[0].toUpperCase()

  const scopeDetails = scope
    .map(s => `- ${s.toUpperCase()}: ${SCOPE_DESCRIPTIONS.get(s) || 'General scope.'}`)
    .join('\n')

  return `
Input notes:
${context}

Relevant scope(s):
${scopeDetails}

Generate a Jira issue or indicate missing information.
Prefix title with [${prefix}].
`.trim()
}

function stripJsonFences(raw: string) {
  return raw.replace(/```\w*\s*/g, '').replace(/```/g, '').trim()
}

function escapeControlCharacters(raw: string) {
  let result = ''
  let inString = false
  let escapeNext = false

  for (const char of raw) {
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

function sanitizeJsonCandidate(raw: string) {
  return escapeControlCharacters(stripJsonFences(raw))
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

function extractChoicePayload(choice: ChatChoice | undefined, stage: 'primary' | 'fallback') {
  const message = choice?.message
  if (!message) {
    console.error(`[${stage}] No message in choice:`, choice)
    throw createError({ statusCode: 502, message: `Missing assistant message (${stage}).` })
  }

  console.warn(`[${stage}] Message:`, JSON.stringify({
    role: message.role,
    contentType: typeof message.content,
    contentPreview: typeof message.content === 'string' ? message.content.slice(0, 100) : message.content,
    hasToolCalls: !!message.tool_calls,
    toolCallsCount: message.tool_calls?.length || 0,
    refusal: message.refusal,
  }, null, 2))

  const raw = flattenMessageContent(message.content)
  if (raw && raw.trim()) {
    console.warn(`[${stage}] Using content, length:`, raw.trim().length)
    return sanitizeJsonCandidate(raw)
  }

  for (const call of message.tool_calls || []) {
    if (call?.type !== 'function')
      continue

    const fn = (call as { function?: { arguments?: unknown } }).function
    if (fn && typeof fn.arguments === 'string' && fn.arguments.trim()) {
      console.warn(`[${stage}] Using tool call arguments`)
      return sanitizeJsonCandidate(fn.arguments)
    }
  }

  if (typeof message.refusal === 'string' && message.refusal.trim())
    throw createError({ statusCode: 502, message: `OpenAI refused request (${stage}).` })

  console.error(`[${stage}] Empty response - message dump:`, message)
  throw createError({ statusCode: 502, message: `Empty response from OpenAI (${stage}).` })
}

async function createCompletion(openai: OpenAI, model: string, messages: ChatMessage[], tokens = 400) {
  const res = await openai.chat.completions.create({
    model,
    messages,
    max_completion_tokens: tokens,
  })
  const cleaned = extractChoicePayload(res.choices[0], 'primary')
  return cleaned
}

function safeJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw)
  }
  catch {
    return null
  }
}

export default defineEventHandler(async (event): Promise<PromptResponse> => {
  const config = useRuntimeConfig(event)
  const body = await readBody<PromptRequest>(event)
  const apiKey = (config.openaiApiKey || process.env.NUXT_OPENAI_API_KEY || '').trim()
  if (!apiKey)
    throw createError({ statusCode: 500, message: 'Missing OpenAI API key' })

  const text = body?.text?.trim()
  if (!text)
    throw createError({ statusCode: 400, message: 'No text provided' })

  const scope = Array.isArray(body.scope) && body.scope.length ? body.scope : ['ui']
  const previousClarifications = (body.previousClarifications || []).map(s => s.trim()).filter(Boolean)
  const client = getOpenAIClient(apiKey)
  const model = body.agent ?? 'gpt-4o-mini'

  console.warn(`[prompt] Using model: ${model}`)

  const workingNotes = composeWorkingNotes(text, previousClarifications)

  // === Step 1: evaluate sufficiency or generate issue directly ===
  const systemMsg: ChatMessage = { role: 'system', content: SYSTEM_PROMPT }
  const userMsg: ChatMessage = { role: 'user', content: buildPrompt(workingNotes, scope) }

  const raw = await createCompletion(client, model, [systemMsg, userMsg])
  const parsed = safeJson<SufficiencyResult & JiraTask>(raw)

  if (!parsed)
    throw createError({ statusCode: 502, message: 'Invalid JSON returned by model' })

  if (parsed.status === 'not_enough') {
    if (previousClarifications.length >= MAX_CLARIFICATION_ROUNDS) {
      return {
        status: 'error',
        reason: `Reached the maximum number of clarification rounds (${MAX_CLARIFICATION_ROUNDS}).`,
      }
    }

    // === Step 2: AI generates *fully* autonomous clarification prompt ===
    const clarificationPrompt = parsed.missing_info_prompt?.trim()
    if (clarificationPrompt) {
      return {
        status: 'needs_info',
        reason: parsed.reason || 'More detail is needed.',
        missingInfoPrompt: clarificationPrompt,
      }
    }

    // fallback if model gave no question at all
    const fallbackMessages: ChatMessage[] = [
      { role: 'system', content: 'You are a Jira triage assistant. Ask ONE concise follow-up question to get missing info, no formatting.' },
      {
        role: 'user',
        content: `Original notes: ${text}\nClarifications so far: ${previousClarifications.length ? previousClarifications.join(' | ') : 'none'}.`,
      },
    ]
    const missingInfoPrompt = await createCompletion(client, model, fallbackMessages, 100)
    return {
      status: 'needs_info',
      reason: parsed.reason || 'More detail required.',
      missingInfoPrompt: missingInfoPrompt || 'Could you provide more detail about what is missing?',
    }
  }

  // === Step 3: produce Jira issue ===
  if (parsed.status === 'enough' && parsed.title && parsed.description) {
    const issueType = normalizeIssueType((parsed as JiraTask).issueType ?? (parsed as JiraTask).type)
    if (!issueType) {
      throw createError({
        statusCode: 502,
        message: 'Unexpected AI response — missing or invalid issue type',
        data: { preview: raw.slice(0, 200) },
      })
    }

    return { status: 'done', title: parsed.title, description: parsed.description, issueType }
  }

  throw createError({
    statusCode: 502,
    message: 'Unexpected AI response — missing title or description',
    data: { preview: raw.slice(0, 200) },
  })
})
