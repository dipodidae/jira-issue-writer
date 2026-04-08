<script setup lang="ts">
import type { PromptDraftData } from '#shared/types/api'

defineProps<{
  draft: PromptDraftData
  isCurrent?: boolean
}>()
</script>

<template>
  <div class="w-full rounded-lg border border-(--border-default) bg-(--surface-panel) p-4">
    <div class="flex flex-wrap items-center gap-2">
      <IssueTypeBadge :issue-type="draft.issueType" />
      <span v-if="isCurrent" class="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
        Latest
      </span>
      <span v-else class="inline-flex items-center rounded-full bg-(--surface-elevated) px-2 py-0.5 text-[11px] font-medium text-(--text-muted)">
        Previous
      </span>
    </div>

    <div class="mt-3 space-y-3">
      <div class="flex items-center gap-2">
        <span class="flex-1 text-sm font-semibold text-(--text-primary)">{{ draft.title }}</span>
        <ButtonCopy :value="draft.title" />
      </div>

      <div v-if="draft.priority || draft.severity || draft.estimate || (draft.dataSensitivity && draft.dataSensitivity !== 'none')" class="flex flex-wrap gap-1.5">
        <span v-if="draft.priority" class="bg-primary-500/10 text-primary-600 dark:text-primary-400 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium">
          <UIcon name="i-lucide-signal" class="size-3" />
          {{ draft.priority }}
        </span>
        <span v-if="draft.severity" class="inline-flex items-center gap-1 rounded bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:text-red-400">
          <UIcon name="i-lucide-alert-triangle" class="size-3" />
          {{ draft.severity }}
        </span>
        <span v-if="draft.estimate" class="inline-flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
          <UIcon name="i-lucide-clock" class="size-3" />
          {{ draft.estimate }}
        </span>
        <span v-if="draft.multiItem" class="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
          <UIcon name="i-lucide-layers" class="size-3" />
          Multi-item
        </span>
        <span v-if="draft.dataSensitivity && draft.dataSensitivity !== 'none'" class="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
          <UIcon name="i-lucide-shield" class="size-3" />
          {{ draft.dataSensitivity }}
        </span>
      </div>

      <div v-if="draft.labels?.length || draft.components?.length || draft.riskAreas?.length" class="flex flex-wrap gap-3">
        <div v-if="draft.labels?.length" class="flex flex-wrap items-center gap-1">
          <span class="text-[11px] font-medium text-(--text-muted)">Labels</span>
          <span v-for="label in draft.labels" :key="label" class="rounded bg-(--surface-elevated) px-1.5 py-0.5 text-[11px] text-(--text-secondary)">{{ label }}</span>
        </div>
        <div v-if="draft.components?.length" class="flex flex-wrap items-center gap-1">
          <span class="text-[11px] font-medium text-(--text-muted)">Components</span>
          <span v-for="component in draft.components" :key="component" class="rounded bg-violet-500/10 px-1.5 py-0.5 text-[11px] text-violet-600 dark:text-violet-400">{{ component }}</span>
        </div>
        <div v-if="draft.riskAreas?.length" class="flex flex-wrap items-center gap-1">
          <span class="text-[11px] font-medium text-(--text-muted)">Risks</span>
          <span v-for="riskArea in draft.riskAreas" :key="riskArea" class="rounded bg-red-500/10 px-1.5 py-0.5 text-[11px] text-red-600 dark:text-red-400">{{ riskArea }}</span>
        </div>
      </div>

      <MarkdownContentPreview :markdown="draft.description" />

      <div v-if="draft.acceptanceCriteria?.length">
        <span class="mb-1 block text-[11px] font-medium text-(--text-muted)">Acceptance criteria</span>
        <ul class="space-y-1 text-xs text-(--text-secondary)">
          <li v-for="criterion in draft.acceptanceCriteria" :key="criterion" class="flex items-start gap-1.5">
            <UIcon name="i-lucide-check-circle-2" class="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
            <span>{{ criterion }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
