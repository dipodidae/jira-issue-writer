<script setup lang="ts">
import type { PromptDraftData } from '#shared/types/api'

const props = defineProps<{
  draft: PromptDraftData
}>()

const { copy } = useClipboard()

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
      <IssueTypeBadge :issue-type="draft.issueType" />
      <p class="mt-1.5 text-xs leading-snug font-medium text-(--text-primary)">
        {{ draft.title }}
      </p>

      <div class="mt-3 grid grid-cols-2 gap-x-2 gap-y-0.5">
        <div v-for="field in fields" :key="field.label" class="flex items-center gap-1 text-[11px]">
          <UIcon
            :name="field.filled ? 'i-lucide-check-circle-2' : 'i-lucide-circle'"
            class="size-3 shrink-0"
            :class="field.filled ? 'text-emerald-500' : 'text-(--text-muted)'"
          />
          <span :class="field.filled ? 'text-(--text-secondary)' : 'text-(--text-muted)'">{{ field.label }}</span>
        </div>
      </div>

      <div class="mt-2 flex items-center justify-between">
        <span class="text-[10px] text-(--text-muted)">{{ filledCount }}/{{ fields.length }}</span>
        <div class="flex gap-0.5">
          <UTooltip text="Copy title">
            <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-heading" @click="copy(draft.title)" />
          </UTooltip>
          <UTooltip text="Copy description">
            <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-file-text" @click="copy(draft.description)" />
          </UTooltip>
          <UTooltip text="Copy full ticket">
            <UButton color="neutral" variant="ghost" size="xs" icon="i-lucide-copy" @click="copy(fullTicketText)" />
          </UTooltip>
        </div>
      </div>
    </div>
  </div>
</template>
