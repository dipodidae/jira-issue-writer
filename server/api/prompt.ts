import type { IssueType, PromptRequest, PromptResponse } from '#shared/types/api'
import process from 'node:process'
import { parseIssueGenerationResult } from '#shared/types/issue-generation'
import OpenAI from 'openai'
import { ISSUE_TYPE_GUIDE, ISSUE_TYPE_PROMPT_VALUES, normalizeIssueType } from '~/constants/issue-types'
import { SCOPE_DESCRIPTIONS } from '~/constants/scopes'
// (Import ordering enforced above)
import {
  buildClarificationSystemPrompt,
  buildClarificationUserPrompt,
  buildIssuePrompt,
  buildSystemPrompt,
} from '../prompts'
import { sanitizeJsonResponse } from '../utils/json-sanitizer'

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam
type ChatChoice = OpenAI.Chat.Completions.ChatCompletion.Choice

// Legacy fallback structures retained for backward compatibility.
interface LegacyJiraTask {
  title?: string
  description?: string
  issueType?: unknown
  type?: unknown
}

interface LegacySufficiencyResult {
  status: 'enough' | 'not_enough'
  reason?: string
  missing_info_prompt?: string
}

const MAX_CLARIFICATIONS = 3
const SYSTEM_PROMPT = buildSystemPrompt({
  issueGuide: ISSUE_TYPE_GUIDE,
  issueTypeValues: ISSUE_TYPE_PROMPT_VALUES,
})

let openaiClient: OpenAI | null = null
let cachedApiKey: string | null = null

function getOpenAIClient(apiKey: string) {
  if (!openaiClient || cachedApiKey !== apiKey) {
    openaiClient = new OpenAI({ apiKey, maxRetries: 2, timeout: 30_000 })
    cachedApiKey = apiKey
  }
  return openaiClient
}

function flatten(content: any): string {
  if (!content)
    return ''
  if (typeof content === 'string')
    return content
  if (Array.isArray(content))
    return content.map(flatten).join('')
  if (typeof content === 'object')
    return flatten(content.text ?? content.content ?? content.arguments)
  return ''
}

function extractPayload(choice: ChatChoice | undefined, stage: string) {
  const message = choice?.message
  if (!message)
    throw createError({ statusCode: 502, message: `Missing assistant message (${stage}).` })

  const raw = flatten(message.content)
  if (raw?.trim())
    return sanitizeJsonResponse(raw)

  for (const call of message.tool_calls || []) {
    const args = call?.type === 'function' && call.function?.arguments
    if (typeof args === 'string' && args.trim())
      return sanitizeJsonResponse(args)
  }

  if (message.refusal?.trim())
    throw createError({ statusCode: 502, message: `OpenAI refused request (${stage}).` })

  throw createError({ statusCode: 502, message: `Empty response from OpenAI (${stage}).` })
}

async function complete(openai: OpenAI, model: string, messages: ChatMessage[], maxTokens = 400) {
  const res = await openai.chat.completions.create({ model, messages, max_completion_tokens: maxTokens })
  return extractPayload(res.choices[0], 'primary')
}

function getApiKey(cfg: any): string {
  const key = (cfg.openaiApiKey || process.env.NUXT_OPENAI_API_KEY || '').trim()
  if (!key)
    throw createError({ statusCode: 500, message: 'Missing OpenAI API key' })
  return key
}

function ensureText(text?: string): string {
  const trimmed = text?.trim()
  if (!trimmed)
    throw createError({ statusCode: 400, message: 'No text provided' })
  return trimmed
}

const normalize = {
  scope: (s: unknown) => (Array.isArray(s) && s.length ? s : ['ui']),
  clarifications: (c: unknown) => (Array.isArray(c) ? c.map(i => String(i).trim()).filter(Boolean) : []),
}

function appendClarifications(text: string, clarifications: string[]) {
  return clarifications.length
    ? `${text}\n\nClarifications so far:\n${clarifications.map((c, i) => `${i + 1}. ${c}`).join('\n')}`
    : text
}

function buildIssueContext(context: string, scope: string[]) {
  const prefix = scope.map(s => s.toUpperCase()).join('+')
  const details = scope
    .map(s => `- ${s.toUpperCase()}: ${SCOPE_DESCRIPTIONS.get(s) || 'General scope.'}`)
    .join('\n')
  return buildIssuePrompt({ context, scopeDetails: details, prefix })
}

function parseJson<T>(input: string): T | null {
  try {
    return JSON.parse(input)
  }
  catch {
    // Attempt to fix common issues: trailing commas, unescaped quotes
    try {
      // Remove trailing commas before } or ]
      const fixed = input
        .replace(/,(\s*[}\]])/g, '$1')
        // Try to fix incomplete JSON by adding closing brackets
        .trim()

      if (fixed !== input) {
        console.warn('[prompt] Attempting to fix malformed JSON')
        return JSON.parse(fixed)
      }
    }
    catch {
      // If fix attempt fails, return null
    }
    return null
  }
}

async function buildFallbackClarification(client: OpenAI, model: string, text: string, prev: string[]): Promise<string> {
  const msgs: ChatMessage[] = [
    { role: 'system', content: buildClarificationSystemPrompt() },
    { role: 'user', content: buildClarificationUserPrompt({ text, clarifications: prev.length ? prev.join(' | ') : 'none' }) },
  ]
  return (await complete(client, model, msgs, 100)) || 'Could you provide more detail about what is missing?'
}

async function handleNeedsInfo(
  parsed: any,
  prevClarifications: string[],
  client: OpenAI,
  model: string,
  text: string,
): Promise<PromptResponse> {
  // Enhanced path: if clarificationRequest present from new schema use it.
  if (prevClarifications.length >= MAX_CLARIFICATIONS)
    return { status: 'error', reason: `Reached the maximum number of clarification rounds (${MAX_CLARIFICATIONS}).` }

  const prompt = parsed.clarificationRequest?.trim()
    || parsed.missing_info_prompt?.trim()
    || await buildFallbackClarification(client, model, text, prevClarifications)

  return {
    status: 'needs_info',
    reason: parsed.reason || 'More detail is needed.',
    missingInfoPrompt: prompt,
  }
}

function handleJiraEnhanced(rawObj: any, raw: string): PromptResponse {
  // Try enhanced schema first.
  const parsedEnhanced = parseIssueGenerationResult(rawObj)
  if (parsedEnhanced.ok && parsedEnhanced.value && parsedEnhanced.value.status === 'enough') {
    const v = parsedEnhanced.value
    return {
      status: 'done',
      title: v.title,
      description: v.description,
      issueType: v.issueType as IssueType,
      scope: v.scope,
      priority: v.priority,
      severity: v.severity,
      labels: v.labels,
      components: v.components,
      epicLink: v.epicLink,
      parent: v.parent,
      dependencies: v.dependencies,
      estimate: v.estimate,
      riskAreas: v.riskAreas,
      dataSensitivity: v.dataSensitivity,
      acceptanceCriteria: v.acceptanceCriteria,
      multiItem: v.multiItem,
      // Legacy fields preserved; UI can be extended to fetch enriched data separately if needed.
    }
  }
  // Fallback to legacy structure.
  const issueType = normalizeIssueType(rawObj.issueType ?? rawObj.type)
  if (!issueType || !rawObj.title || !rawObj.description) {
    throw createError({
      statusCode: 502,
      message: 'Unexpected AI response — missing required fields',
      data: { preview: raw.slice(0, 200) },
    })
  }
  return {
    status: 'done',
    title: rawObj.title,
    description: rawObj.description,
    issueType,
  }
}

export default defineEventHandler(async (event): Promise<PromptResponse> => {
  const cfg = useRuntimeConfig(event)
  const body = await readBody<PromptRequest>(event)
  const apiKey = getApiKey(cfg)
  const text = ensureText(body.text)
  const scope = normalize.scope(body.scope)
  const clarifications = normalize.clarifications(body.previousClarifications)
  const client = getOpenAIClient(apiKey)
  const model = body.agent ?? 'gpt-4o-mini'

  console.warn(`[prompt] Using model: ${model}`)

  const userContent = buildIssueContext(appendClarifications(text, clarifications), scope)
  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ]

  const raw = await complete(client, model, messages, 800) // Increased for enhanced schema
  const parsed = parseJson<LegacySufficiencyResult & LegacyJiraTask & Record<string, any>>(raw)
  if (!parsed) {
    console.error('[prompt] Invalid JSON from model:', raw.slice(0, 500))
    throw createError({
      statusCode: 502,
      message: 'Invalid JSON returned by model',
      data: { preview: raw.slice(0, 300) },
    })
  }

  if (parsed.status === 'not_enough') {
    // Attempt enhanced not_enough parsing for potential richer clarification.
    const enhanced = parseIssueGenerationResult(parsed)
    if (enhanced.ok && enhanced.value && enhanced.value.status === 'not_enough') {
      return handleNeedsInfo({
        reason: enhanced.value.reason,
        clarificationRequest: enhanced.value.clarificationRequest,
        missing_info_prompt: parsed.missing_info_prompt,
      }, clarifications, client, model, text)
    }
    return handleNeedsInfo(parsed, clarifications, client, model, text)
  }
  return handleJiraEnhanced(parsed, raw)
})
