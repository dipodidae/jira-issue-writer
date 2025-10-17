import type { IssueType } from '#shared/types/api'

type BadgeColor = 'error' | 'success' | 'warning' | 'primary' | 'secondary' | 'info' | 'neutral'

interface IssueTypeSection {
  title: string
  bullets?: string[]
  checklist?: string[]
}

export interface IssueTypeMeta {
  key: IssueType
  label: string
  color: BadgeColor
  aliases: string[]
  sections: IssueTypeSection[]
}

const ISSUE_TYPES_DEFINITION: Record<IssueType, IssueTypeMeta> = {
  bug: {
    key: 'bug',
    label: 'Bug',
    color: 'error',
    aliases: ['defect'],
    sections: [
      { title: 'Summary' },
      { title: 'Context / Background' },
      { title: 'Steps to Reproduce' },
      { title: 'Expected Behavior' },
      { title: 'Actual Behavior' },
      { title: 'Impact / Severity' },
      {
        title: 'Acceptance Criteria',
        checklist: [
          'Issue can be reproduced and confirmed fixed',
          'Behavior matches expectations',
        ],
      },
    ],
  },
  story: {
    key: 'story',
    label: 'Story / Feature',
    color: 'primary',
    aliases: ['feature', 'user story', 'story_feature', 'story-feature', 'story_feature_story'],
    sections: [
      { title: 'Summary' },
      {
        title: 'User Story',
        bullets: [
          'As a [type of user],',
          'I want [goal or need],',
          'So that [benefit or value].',
        ],
      },
      { title: 'Context' },
      {
        title: 'Functional Requirements',
        bullets: [
          'Key features or functional expectations',
          'Dependencies or API changes',
        ],
      },
      {
        title: 'Acceptance Criteria',
        checklist: [
          'Clear, testable outcomes',
          'UX and design requirements met',
          'Accessible and localized (if applicable)',
        ],
      },
    ],
  },
  task: {
    key: 'task',
    label: 'Task',
    color: 'neutral',
    aliases: ['internal task'],
    sections: [
      { title: 'Objective' },
      { title: 'Context' },
      { title: 'Scope' },
      {
        title: 'Acceptance Criteria',
        checklist: [
          'Task completed successfully',
          'No user-facing regressions',
        ],
      },
    ],
  },
  spike: {
    key: 'spike',
    label: 'Spike / Research',
    color: 'info',
    aliases: ['research', 'investigation', 'spike_research'],
    sections: [
      { title: 'Goal' },
      { title: 'Context' },
      {
        title: 'Research Questions / Hypotheses',
        bullets: [
          'What are we exploring?',
          'What must we confirm?',
        ],
      },
      {
        title: 'Deliverables',
        bullets: [
          'Summary of findings',
          'Recommended next steps or implementation approach',
        ],
      },
      { title: 'Timebox' },
    ],
  },
  technical_debt: {
    key: 'technical_debt',
    label: 'Technical Debt / Refactor',
    color: 'warning',
    aliases: ['technical debt', 'refactor', 'technical_debt_refactor', 'technicaldebt'],
    sections: [
      { title: 'Summary' },
      { title: 'Context' },
      {
        title: 'Proposed Changes',
        bullets: [
          'Describe the intended cleanup or restructuring',
          'List affected modules/components',
        ],
      },
      {
        title: 'Benefits',
        bullets: [
          'Explain how it improves maintainability, performance, or reliability',
        ],
      },
      {
        title: 'Acceptance Criteria',
        checklist: [
          'Code simplified or reorganized as intended',
          'Tests still pass',
          'No functional regressions',
        ],
      },
    ],
  },
  epic: {
    key: 'epic',
    label: 'Epic',
    color: 'success',
    aliases: ['initiative'],
    sections: [
      { title: 'Summary' },
      { title: 'Objective' },
      { title: 'Context' },
      {
        title: 'Scope',
        bullets: [
          'What\'s included',
          'What\'s explicitly out of scope',
        ],
      },
      { title: 'Success Criteria / KPIs' },
      { title: 'Child Issues' },
    ],
  },
  improvement: {
    key: 'improvement',
    label: 'Improvement / Enhancement',
    color: 'info',
    aliases: ['enhancement', 'improvement_enhancement'],
    sections: [
      { title: 'Summary' },
      { title: 'Context' },
      { title: 'Current vs Desired Behavior' },
      {
        title: 'Acceptance Criteria',
        checklist: [
          'Improved behavior matches new spec',
          'Regression-tested',
        ],
      },
    ],
  },
  chore: {
    key: 'chore',
    label: 'Chore / Maintenance',
    color: 'neutral',
    aliases: ['maintenance', 'chore_maintenance'],
    sections: [
      { title: 'Summary' },
      { title: 'Context' },
      {
        title: 'Tasks',
        checklist: [
          'Itemized list of updates or checks',
        ],
      },
      {
        title: 'Acceptance Criteria',
        checklist: [
          'Maintenance completed and verified',
          'No production issues introduced',
        ],
      },
    ],
  },
  qa: {
    key: 'qa',
    label: 'QA / Test Case',
    color: 'primary',
    aliases: ['test_case', 'qa test case', 'qa_test_case', 'testcase'],
    sections: [
      { title: 'Test Objective' },
      { title: 'Preconditions' },
      { title: 'Test Steps' },
      {
        title: 'Acceptance Criteria',
        checklist: [
          'All test cases pass',
          'Regression tests executed successfully',
        ],
      },
    ],
  },
  documentation: {
    key: 'documentation',
    label: 'Documentation',
    color: 'success',
    aliases: ['docs'],
    sections: [
      { title: 'Goal' },
      { title: 'Context' },
      { title: 'Scope' },
      {
        title: 'Acceptance Criteria',
        checklist: [
          'Documentation written and reviewed',
          'Linked from relevant code or UI',
          'Accessible to intended audience',
        ],
      },
    ],
  },
}

export const ISSUE_TYPES = ISSUE_TYPES_DEFINITION

export const ISSUE_TYPE_LIST = Object.values(ISSUE_TYPES)

export const ISSUE_TYPE_KEYS = ISSUE_TYPE_LIST.map(meta => meta.key)

export const ISSUE_TYPE_PROMPT_VALUES = ISSUE_TYPE_KEYS.join(', ')

function normalizeToken(raw: string) {
  return raw
    .toLowerCase()
    .replace(/[^a-z]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

const ISSUE_TYPE_ALIAS_MAP = new Map<string, IssueType>()
for (const meta of ISSUE_TYPE_LIST) {
  const aliases = new Set<string>([meta.key, meta.label, ...meta.aliases])
  for (const alias of aliases) {
    const token = normalizeToken(alias)
    if (token)
      ISSUE_TYPE_ALIAS_MAP.set(token, meta.key)
  }
}

export function normalizeIssueType(value: unknown): IssueType | null {
  if (typeof value !== 'string')
    return null

  const token = normalizeToken(value)
  return ISSUE_TYPE_ALIAS_MAP.get(token) ?? null
}

function buildIssueTypeGuide() {
  const lines: string[] = []
  lines.push('Issue types (set "issueType" to the lowercase key in parentheses and follow the exact section template):')

  for (const meta of ISSUE_TYPE_LIST) {
    lines.push(`- ${meta.label} (${meta.key})`)
    for (const section of meta.sections) {
      lines.push(`  ### ${section.title}`)
      if (section.bullets) {
        for (const bullet of section.bullets)
          lines.push(`  - ${bullet}`)
      }
      if (section.checklist) {
        for (const item of section.checklist)
          lines.push(`  - [ ] ${item}`)
      }
    }
    lines.push('')
  }

  lines.push('For sections that include checklists, render list items as Markdown checkboxes in the description (e.g., - [ ] ...).')
  return lines.join('\n').trim()
}

export const ISSUE_TYPE_GUIDE = buildIssueTypeGuide()
