import type { IssueType, PromptDraftData, PromptRequest, PromptResponse } from '#shared/types/api'
import process from 'node:process'
import { parseIssueGenerationResult } from '#shared/types/issue-generation'
import OpenAI from 'openai'
import { ISSUE_TYPE_GUIDE, ISSUE_TYPE_PROMPT_VALUES, normalizeIssueType } from '~/constants/issue-types'
import { SCOPE_DESCRIPTIONS } from '~/constants/scopes'
import {
  buildClarificationSystemPrompt,
  buildClarificationUserPrompt,
  buildIssuePrompt,
  buildRefinementPrompt,
  buildSystemPrompt,
} from '../prompts'
import { sanitizeJsonResponse } from '../utils/json-sanitizer'

const RE_TRAILING_COMMA = /,(\s*[}\]])/g

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

interface ClarificationFields {
  clarificationRequest?: string
  missing_info_prompt?: string
  reason?: string
}

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

function flatten(content: unknown): string {
  if (!content)
    return ''
  if (typeof content === 'string')
    return content
  if (Array.isArray(content))
    return content.map(flatten).join('')
  if (typeof content === 'object')
    return flatten((content as Record<string, unknown>).text ?? (content as Record<string, unknown>).content ?? (content as Record<string, unknown>).arguments)
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
  try {
    const res = await openai.chat.completions.create({ model, messages, max_completion_tokens: maxTokens })
    return extractPayload(res.choices[0], 'primary')
  }
  catch (err: unknown) {
    console.error('[prompt] OpenAI API error:', err)

    if (err instanceof OpenAI.APIError) {
      if (err.status === 401)
        throw createError({ statusCode: 500, message: 'Invalid OpenAI API key' })
      if (err.status === 429)
        throw createError({ statusCode: 429, message: 'OpenAI rate limit exceeded. Please try again shortly.' })
      if (err.status === 400)
        throw createError({ statusCode: 502, message: `Invalid request to OpenAI: ${err.message}` })
    }

    if (err instanceof Error && 'code' in err) {
      const { code } = err as NodeJS.ErrnoException
      if (code === 'ENOTFOUND' || code === 'ETIMEDOUT')
        throw createError({ statusCode: 503, message: 'Cannot reach OpenAI API. Please check network connectivity.' })
    }

    const message = err instanceof Error ? err.message : 'Unknown error'
    throw createError({ statusCode: 502, message: `OpenAI API error: ${message}` })
  }
}

function getApiKey(cfg: { openaiApiKey?: string }): string {
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

function buildRefinementContext(
  request: string,
  currentDraft: PromptDraftData,
  scope: string[],
  originalPrompt?: string,
  clarifications?: string[],
) {
  const normalizedScope = scope.length ? scope : [currentDraft.scope || 'ui']
  const prefix = normalizedScope.map(s => s.toUpperCase()).join('+')
  const details = normalizedScope
    .map(s => `- ${s.toUpperCase()}: ${SCOPE_DESCRIPTIONS.get(s) || 'General scope.'}`)
    .join('\n')

  const conversationHistory = clarifications?.length
    ? clarifications.map((c, i) => `${i + 1}. ${c}`).join('\n')
    : undefined

  return buildRefinementPrompt({
    currentDraft: JSON.stringify(currentDraft, null, 2),
    request,
    scopeDetails: details,
    prefix,
    originalContext: originalPrompt,
    conversationHistory,
  })
}

function parseJson<T>(input: string): T | null {
  try {
    return JSON.parse(input)
  }
  catch {
    try {
      const fixed = input
        .replace(RE_TRAILING_COMMA, '$1')
        .trim()

      if (fixed !== input)
        return JSON.parse(fixed)
    }
    catch {
      // If fix attempt fails, return null
    }
    return null
  }
}

function ensureDraft(draft: unknown): PromptDraftData {
  if (!draft || typeof draft !== 'object')
    throw createError({ statusCode: 400, message: 'Missing current draft for refinement' })

  const normalizedDraft = draft as Record<string, unknown>
  const title = typeof normalizedDraft.title === 'string' ? normalizedDraft.title.trim() : ''
  const description = typeof normalizedDraft.description === 'string' ? normalizedDraft.description.trim() : ''
  const issueType = normalizeIssueType(normalizedDraft.issueType)

  if (!title || !description || !issueType) {
    throw createError({
      statusCode: 400,
      message: 'Current draft is incomplete and cannot be refined',
    })
  }

  return {
    title,
    description,
    issueType,
    scope: typeof normalizedDraft.scope === 'string' ? normalizedDraft.scope : undefined,
    priority: normalizedDraft.priority as PromptDraftData['priority'],
    severity: normalizedDraft.severity as PromptDraftData['severity'],
    labels: Array.isArray(normalizedDraft.labels) ? normalizedDraft.labels.filter(label => typeof label === 'string') as string[] : undefined,
    components: Array.isArray(normalizedDraft.components) ? normalizedDraft.components.filter(component => typeof component === 'string') as string[] : undefined,
    epicLink: typeof normalizedDraft.epicLink === 'string' || normalizedDraft.epicLink === null ? normalizedDraft.epicLink as string | null : undefined,
    parent: typeof normalizedDraft.parent === 'string' || normalizedDraft.parent === null ? normalizedDraft.parent as string | null : undefined,
    dependencies: Array.isArray(normalizedDraft.dependencies) ? normalizedDraft.dependencies.filter(dependency => typeof dependency === 'string') as string[] : undefined,
    estimate: typeof normalizedDraft.estimate === 'string' || normalizedDraft.estimate === null ? normalizedDraft.estimate as string | null : undefined,
    riskAreas: Array.isArray(normalizedDraft.riskAreas) ? normalizedDraft.riskAreas.filter(area => typeof area === 'string') as string[] : undefined,
    dataSensitivity: normalizedDraft.dataSensitivity as PromptDraftData['dataSensitivity'],
    acceptanceCriteria: Array.isArray(normalizedDraft.acceptanceCriteria) ? normalizedDraft.acceptanceCriteria.filter(criteria => typeof criteria === 'string') as string[] : undefined,
    multiItem: typeof normalizedDraft.multiItem === 'boolean' ? normalizedDraft.multiItem : undefined,
  }
}

async function buildFallbackClarification(client: OpenAI, model: string, text: string, prev: string[]): Promise<string> {
  try {
    const msgs: ChatMessage[] = [
      { role: 'system', content: buildClarificationSystemPrompt() },
      { role: 'user', content: buildClarificationUserPrompt({ text, clarifications: prev.length ? prev.join(' | ') : 'none' }) },
    ]
    return (await complete(client, model, msgs, 100)) || 'Could you provide more detail about what is missing?'
  }
  catch (err) {
    console.error('[prompt] Failed to generate fallback clarification:', err)
    return 'Could you provide more detail about what is missing?'
  }
}

async function handleNeedsInfo(
  parsed: ClarificationFields,
  prevClarifications: string[],
  client: OpenAI,
  model: string,
  text: string,
): Promise<PromptResponse> {
  const prompt = parsed.clarificationRequest?.trim()
    || parsed.missing_info_prompt?.trim()
    || await buildFallbackClarification(client, model, text, prevClarifications)

  return {
    status: 'needs_info',
    reason: parsed.reason || 'More detail is needed.',
    missingInfoPrompt: prompt,
  }
}

function handleJiraEnhanced(rawObj: Record<string, unknown>, raw: string): PromptResponse {
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
    title: rawObj.title as string,
    description: rawObj.description as string,
    issueType,
  }
}

function handleSuggestSplit(parsed: Record<string, unknown>): PromptResponse {
  const tasks = parsed.proposedTasks as Record<string, unknown>[]
  return {
    status: 'suggest_split',
    reason: String(parsed.reason || 'This looks like it should be multiple tickets.'),
    proposedTasks: tasks.map(t => ({
      title: String(t.title || ''),
      issueType: normalizeIssueType(t.issueType) || 'task',
      scope: String(t.scope || 'ui'),
      reason: String(t.reason || ''),
    })),
  }
}

async function dispatchAIResponse(
  parsed: LegacySufficiencyResult & LegacyJiraTask & Record<string, unknown>,
  raw: string,
  clarifications: string[],
  client: OpenAI,
  model: string,
  text: string,
): Promise<PromptResponse> {
  if (parsed.status === 'suggest_split' as string && Array.isArray(parsed.proposedTasks))
    return handleSuggestSplit(parsed)

  if (parsed.status === 'not_enough') {
    const enhanced = parseIssueGenerationResult(parsed)
    if (enhanced.ok && enhanced.value && enhanced.value.status === 'not_enough') {
      return handleNeedsInfo({
        reason: enhanced.value.reason,
        clarificationRequest: enhanced.value.clarificationRequest,
        missing_info_prompt: parsed.missing_info_prompt,
      }, clarifications, client, model, text)
    }
    return handleNeedsInfo(parsed as ClarificationFields, clarifications, client, model, text)
  }

  return handleJiraEnhanced(parsed, raw)
}

export default defineEventHandler(async (event): Promise<PromptResponse> => {
  try {
    const cfg = useRuntimeConfig(event)

    let body: PromptRequest
    try {
      body = await readBody<PromptRequest>(event)
      if (!body || typeof body !== 'object') {
        throw createError({ statusCode: 400, message: 'Invalid request body' })
      }
    }
    catch (err: unknown) {
      console.error('[prompt] Failed to parse request body:', err)
      throw createError({ statusCode: 400, message: 'Invalid or missing request body' })
    }

    const apiKey = getApiKey(cfg)
    const text = ensureText(body.text)
    const scope = normalize.scope(body.scope)
    const clarifications = normalize.clarifications(body.previousClarifications)
    const stage = body.stage ?? 'initial'
    const client = getOpenAIClient(apiKey)
    const model = body.agent ?? 'gpt-4o-mini'

    const userContent = stage === 'refine'
      ? buildRefinementContext(text, ensureDraft(body.currentDraft), scope, body.originalPrompt, clarifications)
      : buildIssueContext(appendClarifications(text, clarifications), scope)
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ]

    const raw = await complete(client, model, messages, 1500)
    const parsed = parseJson<LegacySufficiencyResult & LegacyJiraTask & Record<string, unknown>>(raw)
    if (!parsed) {
      console.error('[prompt] Invalid JSON from model:', raw.slice(0, 500))
      throw createError({
        statusCode: 502,
        message: 'Invalid JSON returned by model',
        data: { preview: raw.slice(0, 300) },
      })
    }

    return await dispatchAIResponse(parsed, raw, clarifications, client, model, text)
  }
  catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      const h3Err = err as { statusCode: number, message: string }
      console.error(`[prompt] Known error (${h3Err.statusCode}):`, h3Err.message)
      throw err
    }

    console.error('[prompt] Unexpected error:', err)
    const message = err instanceof Error ? err.message : String(err)
    throw createError({
      statusCode: 500,
      message: 'An unexpected error occurred while processing your request',
      data: { error: message },
    })
  }
})
