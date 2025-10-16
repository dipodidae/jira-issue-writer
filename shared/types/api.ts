/**
 * API request and response types for the prompt endpoint
 */

export type PromptStage = 'initial' | 'clarify'

export interface PromptRequest {
  text: string
  agent?: string
  scope?: string[]
  previousClarifications?: string[]
  stage?: PromptStage
}

export type PromptStatus = 'done' | 'needs_info' | 'error'

export interface PromptResponse {
  status: PromptStatus
  title?: string
  description?: string
  reason?: string
  missingInfoPrompt?: string
}

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
