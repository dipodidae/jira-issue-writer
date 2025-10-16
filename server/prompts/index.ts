import clarificationSystemTemplate from './clarification-system'
import clarificationUserTemplate from './clarification-user'
import issueTemplate from './issue'
import systemTemplate from './system'

interface TemplateValues {
  [key: string]: string | number | undefined
}

function renderTemplate(template: string, values: TemplateValues, options?: { trim?: boolean }) {
  const rendered = template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
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

export function buildClarificationSystemPrompt() {
  return renderTemplate(clarificationSystemTemplate, {})
}

export function buildClarificationUserPrompt(values: { text: string, clarifications: string }) {
  return renderTemplate(clarificationUserTemplate, {
    TEXT: values.text,
    CLARIFICATIONS: values.clarifications,
  })
}
