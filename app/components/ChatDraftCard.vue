<script setup lang="ts">
import type { PromptDraftData } from '#shared/types/api'

defineProps<{
  draft: PromptDraftData
  isCurrent?: boolean
}>()
</script>

<template>
  <div class="w-full rounded-xl border border-(--border-default) bg-(--surface-translucent) p-5" style="box-shadow: var(--shadow-elevated)">
    <div class="flex flex-wrap items-center gap-2">
      <IssueTypeBadge :issue-type="draft.issueType" />
      <span v-if="isCurrent" class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400">
        <span class="size-1.5 rounded-full bg-emerald-500" />
        Latest
      </span>
      <span v-else class="inline-flex items-center rounded-full bg-(--surface-elevated) px-2.5 py-0.5 text-[11px] font-medium text-(--text-quaternary) ring-1 ring-(--border-subtle)">
        Previous
      </span>
    </div>

    <div class="mt-4 space-y-4">
      <div class="flex items-start gap-2">
        <span class="flex-1 text-[15px] leading-snug font-semibold tracking-[-0.01em] text-(--text-primary)">{{ draft.title }}</span>
        <ButtonCopy :value="draft.title" />
      </div>

      <div v-if="draft.priority || draft.severity || draft.estimate || (draft.dataSensitivity && draft.dataSensitivity !== 'none')" class="flex flex-wrap gap-1.5">
        <span v-if="draft.priority" class="bg-primary-500/8 text-primary-600 dark:text-primary-400 ring-primary-500/15 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1">
          <UIcon name="i-lucide-signal" class="size-3" />
          {{ draft.priority }}
        </span>
        <span v-if="draft.severity" class="inline-flex items-center gap-1.5 rounded-md bg-red-500/8 px-2 py-0.5 text-[11px] font-medium text-red-600 ring-1 ring-red-500/15 dark:text-red-400">
          <UIcon name="i-lucide-alert-triangle" class="size-3" />
          {{ draft.severity }}
        </span>
        <span v-if="draft.estimate" class="inline-flex items-center gap-1.5 rounded-md bg-blue-500/8 px-2 py-0.5 text-[11px] font-medium text-blue-600 ring-1 ring-blue-500/15 dark:text-blue-400">
          <UIcon name="i-lucide-clock" class="size-3" />
          {{ draft.estimate }}
        </span>
        <span v-if="draft.multiItem" class="inline-flex items-center gap-1.5 rounded-md bg-amber-500/8 px-2 py-0.5 text-[11px] font-medium text-amber-600 ring-1 ring-amber-500/15 dark:text-amber-400">
          <UIcon name="i-lucide-layers" class="size-3" />
          Multi-item
        </span>
        <span v-if="draft.dataSensitivity && draft.dataSensitivity !== 'none'" class="inline-flex items-center gap-1.5 rounded-md bg-amber-500/8 px-2 py-0.5 text-[11px] font-medium text-amber-600 ring-1 ring-amber-500/15 dark:text-amber-400">
          <UIcon name="i-lucide-shield" class="size-3" />
          {{ draft.dataSensitivity }}
        </span>
      </div>

      <div v-if="draft.labels?.length || draft.components?.length || draft.riskAreas?.length" class="flex flex-wrap gap-4">
        <div v-if="draft.labels?.length" class="flex flex-wrap items-center gap-1.5">
          <span class="text-[11px] font-medium text-(--text-muted)">Labels</span>
          <span v-for="label in draft.labels" :key="label" class="rounded-md bg-(--surface-elevated) px-2 py-0.5 text-[11px] text-(--text-secondary) ring-1 ring-(--border-subtle)">{{ label }}</span>
        </div>
        <div v-if="draft.components?.length" class="flex flex-wrap items-center gap-1.5">
          <span class="text-[11px] font-medium text-(--text-muted)">Components</span>
          <span v-for="component in draft.components" :key="component" class="rounded-md bg-violet-500/8 px-2 py-0.5 text-[11px] text-violet-600 ring-1 ring-violet-500/15 dark:text-violet-400">{{ component }}</span>
        </div>
        <div v-if="draft.riskAreas?.length" class="flex flex-wrap items-center gap-1.5">
          <span class="text-[11px] font-medium text-(--text-muted)">Risks</span>
          <span v-for="riskArea in draft.riskAreas" :key="riskArea" class="rounded-md bg-red-500/8 px-2 py-0.5 text-[11px] text-red-600 ring-1 ring-red-500/15 dark:text-red-400">{{ riskArea }}</span>
        </div>
      </div>

      <div class="border-t border-(--border-subtle) pt-4">
        <MarkdownContentPreview :markdown="draft.description" />
      </div>

      <div v-if="draft.acceptanceCriteria?.length" class="border-t border-(--border-subtle) pt-4">
        <span class="mb-2 block text-[11px] font-medium tracking-wider text-(--text-muted) uppercase">Acceptance criteria</span>
        <ul class="space-y-1.5 text-xs leading-relaxed text-(--text-secondary)">
          <li v-for="criterion in draft.acceptanceCriteria" :key="criterion" class="flex items-start gap-2">
            <UIcon name="i-lucide-check-circle-2" class="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
            <span>{{ criterion }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
