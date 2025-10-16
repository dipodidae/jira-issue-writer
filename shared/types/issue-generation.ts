import type { IssueGenerationResult, IssueGenerationResultEnough, IssueGenerationResultNotEnough, IssueType } from './api'

// Lightweight runtime validation without external deps.

function isString(v: any): v is string {
  return typeof v === 'string'
}
function isArray(v: any): v is any[] {
  return Array.isArray(v)
}
function isStringArray(v: any): v is string[] {
  return isArray(v) && v.every(isString)
}

const ISSUE_TYPES: IssueType[] = ['bug', 'story', 'task', 'spike', 'technical_debt', 'epic', 'improvement', 'chore', 'qa', 'documentation']

export interface ParseResult<T> {
  ok: boolean
  value?: T
  error?: string
  raw?: any
}

export function parseIssueGenerationResult(raw: any): ParseResult<IssueGenerationResult> {
  if (!raw || typeof raw !== 'object')
    return { ok: false, error: 'Not an object', raw }

  const status = raw.status
  if (status !== 'enough' && status !== 'not_enough')
    return { ok: false, error: 'Invalid status', raw }

  if (status === 'not_enough') {
    if (!isString(raw.reason) || !isString(raw.clarificationRequest))
      return { ok: false, error: 'Missing reason or clarificationRequest', raw }
    const missingSections = isStringArray(raw.missingSections) ? raw.missingSections : []
    const suggestedIssueType = ISSUE_TYPES.includes(raw.suggestedIssueType) ? raw.suggestedIssueType : null
    const result: IssueGenerationResultNotEnough = {
      status: 'not_enough',
      reason: raw.reason,
      clarificationRequest: raw.clarificationRequest,
      suggestedIssueType,
      missingSections,
      title: isString(raw.title) ? raw.title : undefined,
      issueType: ISSUE_TYPES.includes(raw.issueType) ? raw.issueType : undefined,
      scope: isString(raw.scope) ? raw.scope : undefined,
      description: isString(raw.description) ? raw.description : undefined,
      acceptanceCriteria: isStringArray(raw.acceptanceCriteria) ? raw.acceptanceCriteria : undefined,
      priority: raw.priority ?? undefined,
      severity: raw.severity ?? undefined,
      labels: isStringArray(raw.labels) ? raw.labels : undefined,
      components: isStringArray(raw.components) ? raw.components : undefined,
      epicLink: raw.epicLink ?? undefined,
      parent: raw.parent ?? undefined,
      dependencies: isStringArray(raw.dependencies) ? raw.dependencies : undefined,
      estimate: raw.estimate ?? undefined,
      riskAreas: isStringArray(raw.riskAreas) ? raw.riskAreas : undefined,
      dataSensitivity: raw.dataSensitivity ?? undefined,
      multiItem: typeof raw.multiItem === 'boolean' ? raw.multiItem : undefined,
    }
    return { ok: true, value: result }
  }

  // enough path
  const requiredStrings: Array<[string, any]> = [
    ['title', raw.title],
    ['issueType', raw.issueType],
    ['scope', raw.scope],
    ['description', raw.description],
  ]
  for (const [key, val] of requiredStrings) {
    if (!isString(val) || !val.trim())
      return { ok: false, error: `Missing or invalid ${key}`, raw }
  }
  if (!ISSUE_TYPES.includes(raw.issueType))
    return { ok: false, error: 'Unknown issueType', raw }

  const acceptanceCriteria = isStringArray(raw.acceptanceCriteria) ? raw.acceptanceCriteria : []
  const result: IssueGenerationResultEnough = {
    status: 'enough',
    title: raw.title,
    issueType: raw.issueType,
    scope: raw.scope,
    priority: ['highest', 'high', 'medium', 'low'].includes(raw.priority) ? raw.priority : null,
    severity: ['critical', 'major', 'minor', 'trivial'].includes(raw.severity) ? raw.severity : null,
    labels: isStringArray(raw.labels) ? raw.labels : [],
    components: isStringArray(raw.components) ? raw.components : [],
    epicLink: isString(raw.epicLink) ? raw.epicLink : null,
    parent: isString(raw.parent) ? raw.parent : null,
    dependencies: isStringArray(raw.dependencies) ? raw.dependencies : [],
    estimate: isString(raw.estimate) ? raw.estimate : null,
    riskAreas: isStringArray(raw.riskAreas) ? raw.riskAreas : [],
    dataSensitivity: ['none', 'contains-pii', 'contains-financial', 'unknown'].includes(raw.dataSensitivity) ? raw.dataSensitivity : 'unknown',
    acceptanceCriteria,
    multiItem: typeof raw.multiItem === 'boolean' ? raw.multiItem : false,
    description: raw.description,
  }
  return { ok: true, value: result }
}
