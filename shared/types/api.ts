/**
 * API request and response types for the prompt endpoint
 */

export type PromptStage = 'initial' | 'clarify' | 'refine'

export type IssueType
  = | 'bug'
    | 'story'
    | 'task'
    | 'spike'
    | 'technical_debt'
    | 'epic'
    | 'improvement'
    | 'chore'
    | 'qa'
    | 'documentation'

export interface PromptDraftData {
  title: string
  description: string
  issueType: IssueType
  scope?: string
  priority?: 'highest' | 'high' | 'medium' | 'low' | null
  severity?: 'critical' | 'major' | 'minor' | 'trivial' | null
  labels?: string[]
  components?: string[]
  epicLink?: string | null
  parent?: string | null
  dependencies?: string[]
  estimate?: string | null
  riskAreas?: string[]
  dataSensitivity?: 'none' | 'contains-pii' | 'contains-financial' | 'unknown'
  acceptanceCriteria?: string[]
  multiItem?: boolean
}

export interface PromptRequest {
  text: string
  agent?: string
  scope?: string[]
  previousClarifications?: string[]
  stage?: PromptStage
  currentDraft?: PromptDraftData | null
  originalPrompt?: string
}

export type PromptStatus = 'done' | 'needs_info' | 'suggest_split' | 'error'

export interface PromptResponseDone extends PromptDraftData {
  status: 'done'
}

export interface PromptResponseNeedsInfo {
  status: 'needs_info'
  reason?: string
  missingInfoPrompt?: string
}

export interface SplitTaskSummary {
  title: string
  issueType: IssueType
  scope: string
  reason: string
}

export interface PromptResponseSuggestSplit {
  status: 'suggest_split'
  reason: string
  proposedTasks: SplitTaskSummary[]
}

export interface PromptResponseError {
  status: 'error'
  reason?: string
}

export type PromptResponse = PromptResponseDone | PromptResponseNeedsInfo | PromptResponseSuggestSplit | PromptResponseError

export type ConversationMessageRole = 'user' | 'assistant'

export type ConversationMessageKind = 'prompt' | 'clarification' | 'draft' | 'error' | 'suggest_split'

export interface ConversationMessage {
  id: string
  role: ConversationMessageRole
  kind: ConversationMessageKind
  content: string
  createdAt: number
  reason?: string
  draft?: PromptDraftData
  isCurrentDraft?: boolean
  proposedTasks?: SplitTaskSummary[]
}

/**
 * Enhanced issue generation output schema produced by system prompt.
 * This is separate from PromptResponse (legacy) to allow gradual migration.
 */
export interface IssueGenerationResultBase {
  status: 'enough' | 'not_enough'
  title: string
  issueType: IssueType
  scope: string
  priority: 'highest' | 'high' | 'medium' | 'low' | null
  severity: 'critical' | 'major' | 'minor' | 'trivial' | null
  labels: string[]
  components: string[]
  epicLink: string | null
  parent: string | null
  dependencies: string[]
  estimate: string | null
  riskAreas: string[]
  dataSensitivity: 'none' | 'contains-pii' | 'contains-financial' | 'unknown'
  acceptanceCriteria: string[]
  multiItem: boolean
  description: string
}

export interface IssueGenerationResultEnough extends IssueGenerationResultBase {
  status: 'enough'
  clarificationRequest?: undefined
  reason?: undefined
  suggestedIssueType?: undefined
  missingSections?: undefined
}

export interface IssueGenerationResultNotEnough {
  status: 'not_enough'
  reason: string
  clarificationRequest: string
  suggestedIssueType: IssueType | null
  missingSections: string[]
  // Provide minimal scaffolding; other fields not guaranteed.
  title?: string
  issueType?: IssueType
  scope?: string
  description?: string
  acceptanceCriteria?: string[]
  // Keep placeholders for structural parity; may be omitted.
  priority?: 'highest' | 'high' | 'medium' | 'low' | null
  severity?: 'critical' | 'major' | 'minor' | 'trivial' | null
  labels?: string[]
  components?: string[]
  epicLink?: string | null
  parent?: string | null
  dependencies?: string[]
  estimate?: string | null
  riskAreas?: string[]
  dataSensitivity?: 'none' | 'contains-pii' | 'contains-financial' | 'unknown'
  multiItem?: boolean
}

export type IssueGenerationResult = IssueGenerationResultEnough | IssueGenerationResultNotEnough

/**
 * Agent types
 */
export interface AgentItem {
  label: string
  value: string
  icon: string
}

export interface AgentsResponse {
  tier: string
  agents: AgentItem[]
}

/**
 * Error responses are handled via createError() and thrown as HTTP errors
 * with proper status codes (400, 500, 502) instead of being returned in the response body.
 * Errors are caught on the client side as FetchError instances.
 */
