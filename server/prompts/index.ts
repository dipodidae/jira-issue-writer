import clarificationSystemTemplate from './clarification-system'
import clarificationUserTemplate from './clarification-user'
import issueTemplate from './issue'
import refineTemplate from './refine'
import systemTemplate from './system'

interface TemplateValues {
  [key: string]: string | number | undefined
}

const RE_TEMPLATE_VAR = /\{\{(\w+)\}\}/g

function renderTemplate(template: string, values: TemplateValues, options?: { trim?: boolean }) {
  const rendered = template.replace(RE_TEMPLATE_VAR, (_match, key) => {
    const value = values[key]
    return typeof value === 'number' ? String(value) : value ?? ''
  })

  if (options?.trim === false)
    return rendered

  return rendered.trim()
}

export function buildSystemPrompt(values: { issueGuide: string, issueTypeValues: string }) {
  return renderTemplate(systemTemplate, {
    ISSUE_TYPE_GUIDE: values.issueGuide,
    ISSUE_TYPE_PROMPT_VALUES: values.issueTypeValues,
  })
}

export function buildIssuePrompt(values: { context: string, scopeDetails: string, prefix: string }) {
  return renderTemplate(issueTemplate, {
    CONTEXT: values.context,
    SCOPE_DETAILS: values.scopeDetails,
    PREFIX: values.prefix,
  })
}

export function buildRefinementPrompt(values: {
  currentDraft: string
  request: string
  scopeDetails: string
  prefix: string
  originalContext?: string
  conversationHistory?: string
}) {
  return renderTemplate(refineTemplate, {
    CURRENT_DRAFT: values.currentDraft,
    REQUEST: values.request,
    SCOPE_DETAILS: values.scopeDetails,
    PREFIX: values.prefix,
    ORIGINAL_CONTEXT: values.originalContext
      ? `\nOriginal user input (for background context only):\n${values.originalContext}\n`
      : '',
    CONVERSATION_HISTORY: values.conversationHistory
      ? `\nPrevious conversation:\n${values.conversationHistory}\n`
      : '',
  })
}

export function buildClarificationSystemPrompt() {
  return renderTemplate(clarificationSystemTemplate, {})
}

export function buildClarificationUserPrompt(values: { text: string, clarifications: string }) {
  return renderTemplate(clarificationUserTemplate, {
    TEXT: values.text,
    CLARIFICATIONS: values.clarifications,
  })
}
