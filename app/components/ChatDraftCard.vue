<script setup lang="ts">
import type { PromptDraftData } from '#shared/types/api'

defineProps<{
  draft: PromptDraftData
  isCurrent?: boolean
}>()
</script>

<template>
  <div class="w-full rounded-3xl border border-(--border-default) bg-(--surface-panel) p-5 shadow-sm sm:p-6">
    <div class="flex flex-wrap items-center gap-3">
      <IssueTypeBadge :issue-type="draft.issueType" />
      <span v-if="isCurrent" class="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        Current draft
      </span>
      <span v-else class="inline-flex items-center rounded-full bg-(--surface-elevated) px-2.5 py-1 text-xs font-medium text-(--text-secondary)">
        Previous version
      </span>
    </div>

    <div class="mt-5 space-y-5">
      <div>
        <label class="mb-1.5 block text-xs font-medium tracking-wider text-(--text-muted) uppercase">Title</label>
        <div class="flex items-center gap-2 rounded-xl border border-(--border-subtle) bg-(--surface-elevated) px-3 py-2.5">
          <span class="flex-1 text-sm font-medium text-(--text-primary)">{{ draft.title }}</span>
          <ButtonCopy :value="draft.title" />
        </div>
      </div>

      <div v-if="draft.priority || draft.severity || draft.estimate || (draft.dataSensitivity && draft.dataSensitivity !== 'none')" class="flex flex-wrap gap-2">
        <span v-if="draft.priority" class="bg-primary-500/10 text-primary-600 dark:text-primary-400 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
          <UIcon name="i-lucide-signal" class="size-3" />
          {{ draft.priority }}
        </span>
        <span v-if="draft.severity" class="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400">
          <UIcon name="i-lucide-alert-triangle" class="size-3" />
          {{ draft.severity }}
        </span>
        <span v-if="draft.estimate" class="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400">
          <UIcon name="i-lucide-clock" class="size-3" />
          {{ draft.estimate }}
        </span>
        <span v-if="draft.multiItem" class="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
          <UIcon name="i-lucide-layers" class="size-3" />
          Multi-item
        </span>
        <span v-if="draft.dataSensitivity && draft.dataSensitivity !== 'none'" class="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
          <UIcon name="i-lucide-shield" class="size-3" />
          {{ draft.dataSensitivity }}
        </span>
      </div>

      <div v-if="draft.labels?.length || draft.components?.length || draft.riskAreas?.length" class="space-y-3">
        <div v-if="draft.labels?.length">
          <label class="mb-1.5 block text-xs font-medium tracking-wider text-(--text-muted) uppercase">Labels</label>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="label in draft.labels" :key="label" class="rounded-md bg-(--surface-elevated) px-2 py-0.5 text-xs text-(--text-secondary)">{{ label }}</span>
          </div>
        </div>

        <div v-if="draft.components?.length">
          <label class="mb-1.5 block text-xs font-medium tracking-wider text-(--text-muted) uppercase">Components</label>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="component in draft.components" :key="component" class="rounded-md bg-violet-500/10 px-2 py-0.5 text-xs text-violet-600 dark:text-violet-400">{{ component }}</span>
          </div>
        </div>

        <div v-if="draft.riskAreas?.length">
          <label class="mb-1.5 block text-xs font-medium tracking-wider text-(--text-muted) uppercase">Risk Areas</label>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="riskArea in draft.riskAreas" :key="riskArea" class="rounded-md bg-red-500/10 px-2 py-0.5 text-xs text-red-600 dark:text-red-400">{{ riskArea }}</span>
          </div>
        </div>
      </div>

      <div>
        <label class="mb-1.5 block text-xs font-medium tracking-wider text-(--text-muted) uppercase">Description</label>
        <MarkdownContentPreview :markdown="draft.description" />
      </div>

      <div v-if="draft.acceptanceCriteria?.length">
        <label class="mb-1.5 block text-xs font-medium tracking-wider text-(--text-muted) uppercase">Acceptance Criteria</label>
        <ul class="space-y-1.5 text-sm text-(--text-secondary)">
          <li v-for="criterion in draft.acceptanceCriteria" :key="criterion" class="flex items-start gap-2">
            <UIcon name="i-lucide-check-circle-2" class="mt-0.5 size-4 shrink-0 text-emerald-500" />
            <span>{{ criterion }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
