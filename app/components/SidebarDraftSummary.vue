<script setup lang="ts">
import type { PromptDraftData } from '#shared/types/api'

const props = defineProps<{
  draft: PromptDraftData
}>()

const fields = computed(() => [
  { label: 'Title', filled: !!props.draft.title },
  { label: 'Description', filled: !!props.draft.description },
  { label: 'Priority', filled: !!props.draft.priority },
  { label: 'Labels', filled: !!props.draft.labels?.length },
  { label: 'Acceptance criteria', filled: !!props.draft.acceptanceCriteria?.length },
  { label: 'Estimate', filled: !!props.draft.estimate },
])

const filledCount = computed(() => fields.value.filter(f => f.filled).length)

const fullTicketText = computed(() => {
  const d = props.draft
  const lines = [`# ${d.title}`, '']
  if (d.priority)
    lines.push(`**Priority:** ${d.priority}`)
  if (d.severity)
    lines.push(`**Severity:** ${d.severity}`)
  if (d.estimate)
    lines.push(`**Estimate:** ${d.estimate}`)
  if (d.labels?.length)
    lines.push(`**Labels:** ${d.labels.join(', ')}`)
  if (d.components?.length)
    lines.push(`**Components:** ${d.components.join(', ')}`)
  if (lines.length > 2)
    lines.push('')
  lines.push(d.description)
  if (d.acceptanceCriteria?.length) {
    lines.push('', '## Acceptance Criteria')
    d.acceptanceCriteria.forEach(ac => lines.push(`- ${ac}`))
  }
  return lines.join('\n')
})
</script>

<template>
  <div>
    <span class="mb-1.5 block text-[11px] font-medium tracking-wider text-(--text-muted) uppercase">Current draft</span>

    <div class="rounded-md border border-(--border-default) bg-(--surface-elevated) p-2.5">
      <div class="flex items-start gap-2">
        <IssueTypeBadge :issue-type="draft.issueType" />
        <span class="flex-1 text-xs leading-snug font-medium text-(--text-primary)">{{ draft.title }}</span>
      </div>

      <div class="mt-2.5 space-y-1">
        <div v-for="field in fields" :key="field.label" class="flex items-center gap-1.5 text-[11px]">
          <UIcon
            :name="field.filled ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
            class="size-3 shrink-0"
            :class="field.filled ? 'text-emerald-500' : 'text-(--text-muted)'"
          />
          <span :class="field.filled ? 'text-(--text-secondary)' : 'text-(--text-muted)'">{{ field.label }}</span>
        </div>
      </div>

      <div class="mt-2.5 text-[11px] text-(--text-muted)">
        {{ filledCount }}/{{ fields.length }} fields
      </div>
    </div>

    <div class="mt-2 flex flex-wrap gap-1">
      <UTooltip text="Copy title">
        <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-heading" @click="navigator.clipboard.writeText(draft.title)" />
      </UTooltip>
      <UTooltip text="Copy description">
        <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-file-text" @click="navigator.clipboard.writeText(draft.description)" />
      </UTooltip>
      <UTooltip text="Copy full ticket">
        <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-copy" @click="navigator.clipboard.writeText(fullTicketText)" />
      </UTooltip>
    </div>
  </div>
</template>
