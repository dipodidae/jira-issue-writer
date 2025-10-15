/**
 * API request and response types for the prompt endpoint
 */

export interface PromptRequest {
  text: string
  agent: string
  scope: string[]
}

export interface JiraTask {
  title: string
  description: string
}

export interface PromptResponse {
  title: string
  description: string
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
