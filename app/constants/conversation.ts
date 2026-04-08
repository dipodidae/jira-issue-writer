import type { ConversationMessageKind, PromptStage } from '#shared/types/api'

/** Prompt workflow stages */
export const STAGE = {
  INITIAL: 'initial',
  CLARIFY: 'clarify',
  REFINE: 'refine',
} as const satisfies Record<string, PromptStage>

/** Conversation message kinds */
export const MESSAGE_KIND = {
  PROMPT: 'prompt',
  CLARIFICATION: 'clarification',
  DRAFT: 'draft',
  ERROR: 'error',
  SUGGEST_SPLIT: 'suggest_split',
} as const satisfies Record<string, ConversationMessageKind>

/** Session title truncation length */
export const SESSION_TITLE_MAX_LENGTH = 50
