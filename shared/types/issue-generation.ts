import type { IssueGenerationResult, IssueGenerationResultEnough, IssueGenerationResultNotEnough, IssueType } from './api'

// Lightweight runtime validation without external deps.

function isString(v: unknown): v is string {
  return typeof v === 'string'
}
function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v)
}
function isStringArray(v: unknown): v is string[] {
  return isArray(v) && v.every(isString)
}

const ISSUE_TYPES: IssueType[] = ['bug', 'story', 'task', 'spike', 'technical_debt', 'epic', 'improvement', 'chore', 'qa', 'documentation']

function isIssueType(v: unknown): v is IssueType {
  return isString(v) && (ISSUE_TYPES as string[]).includes(v)
}

function isOneOf<T extends string>(v: unknown, values: readonly T[]): v is T {
  return isString(v) && (values as readonly string[]).includes(v)
}

export interface ParseResult<T> {
  ok: boolean
  value?: T
  error?: string
  raw?: unknown
}

export function parseIssueGenerationResult(input: unknown): ParseResult<IssueGenerationResult> {
  if (!input || typeof input !== 'object')
    return { ok: false, error: 'Not an object', raw: input }

  const raw = input as Record<string, unknown>
  const status = raw.status
  if (status !== 'enough' && status !== 'not_enough')
    return { ok: false, error: 'Invalid status', raw }

  if (status === 'not_enough') {
    if (!isString(raw.reason) || !isString(raw.clarificationRequest))
      return { ok: false, error: 'Missing reason or clarificationRequest', raw }
    const missingSections = isStringArray(raw.missingSections) ? raw.missingSections : []
    const suggestedIssueType = isIssueType(raw.suggestedIssueType) ? raw.suggestedIssueType : null
    const result: IssueGenerationResultNotEnough = {
      status: 'not_enough',
      reason: raw.reason,
      clarificationRequest: raw.clarificationRequest,
      suggestedIssueType,
      missingSections,
      title: isString(raw.title) ? raw.title : undefined,
      issueType: isIssueType(raw.issueType) ? raw.issueType : undefined,
      scope: isString(raw.scope) ? raw.scope : undefined,
      description: isString(raw.description) ? raw.description : undefined,
      acceptanceCriteria: isStringArray(raw.acceptanceCriteria) ? raw.acceptanceCriteria : undefined,
      priority: isOneOf(raw.priority, ['highest', 'high', 'medium', 'low'] as const) ? raw.priority : undefined,
      severity: isOneOf(raw.severity, ['critical', 'major', 'minor', 'trivial'] as const) ? raw.severity : undefined,
      labels: isStringArray(raw.labels) ? raw.labels : undefined,
      components: isStringArray(raw.components) ? raw.components : undefined,
      epicLink: isString(raw.epicLink) ? raw.epicLink : (raw.epicLink === null ? null : undefined),
      parent: isString(raw.parent) ? raw.parent : (raw.parent === null ? null : undefined),
      dependencies: isStringArray(raw.dependencies) ? raw.dependencies : undefined,
      estimate: isString(raw.estimate) ? raw.estimate : (raw.estimate === null ? null : undefined),
      riskAreas: isStringArray(raw.riskAreas) ? raw.riskAreas : undefined,
      dataSensitivity: isOneOf(raw.dataSensitivity, ['none', 'contains-pii', 'contains-financial', 'unknown'] as const) ? raw.dataSensitivity : undefined,
      multiItem: typeof raw.multiItem === 'boolean' ? raw.multiItem : undefined,
    }
    return { ok: true, value: result }
  }

  // enough path
  if (!isString(raw.title) || !raw.title.trim())
    return { ok: false, error: 'Missing or invalid title', raw }
  if (!isIssueType(raw.issueType))
    return { ok: false, error: 'Unknown issueType', raw }
  if (!isString(raw.scope) || !raw.scope.trim())
    return { ok: false, error: 'Missing or invalid scope', raw }
  if (!isString(raw.description) || !raw.description.trim())
    return { ok: false, error: 'Missing or invalid description', raw }

  const result: IssueGenerationResultEnough = {
    status: 'enough',
    title: raw.title,
    issueType: raw.issueType,
    scope: raw.scope,
    priority: isOneOf(raw.priority, ['highest', 'high', 'medium', 'low'] as const) ? raw.priority : null,
    severity: isOneOf(raw.severity, ['critical', 'major', 'minor', 'trivial'] as const) ? raw.severity : null,
    labels: isStringArray(raw.labels) ? raw.labels : [],
    components: isStringArray(raw.components) ? raw.components : [],
    epicLink: isString(raw.epicLink) ? raw.epicLink : null,
    parent: isString(raw.parent) ? raw.parent : null,
    dependencies: isStringArray(raw.dependencies) ? raw.dependencies : [],
    estimate: isString(raw.estimate) ? raw.estimate : null,
    riskAreas: isStringArray(raw.riskAreas) ? raw.riskAreas : [],
    dataSensitivity: isOneOf(raw.dataSensitivity, ['none', 'contains-pii', 'contains-financial', 'unknown'] as const) ? raw.dataSensitivity : 'unknown',
    acceptanceCriteria: isStringArray(raw.acceptanceCriteria) ? raw.acceptanceCriteria : [],
    multiItem: typeof raw.multiItem === 'boolean' ? raw.multiItem : false,
    description: raw.description,
  }
  return { ok: true, value: result }
}
