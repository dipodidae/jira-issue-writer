<script setup lang="ts">
import type { PromptDraftData } from '#shared/types/api'

defineProps<{
  drafts: PromptDraftData[]
}>()
</script>

<template>
  <div v-if="drafts.length > 1">
    <span class="mb-1.5 block text-[11px] font-medium tracking-wider text-(--text-muted) uppercase">Draft history</span>
    <div class="space-y-1">
      <div
        v-for="(draft, i) in drafts"
        :key="`draft-${i}-${draft.title}`"
        class="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs"
        :class="i === drafts.length - 1 ? 'bg-(--surface-elevated) text-(--text-primary)' : 'text-(--text-muted)'"
      >
        <span class="shrink-0 text-[10px] tabular-nums">v{{ i + 1 }}</span>
        <IssueTypeBadge :issue-type="draft.issueType" />
        <span class="truncate">{{ draft.title }}</span>
      </div>
    </div>
  </div>
</template>
