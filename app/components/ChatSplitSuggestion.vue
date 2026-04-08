<script setup lang="ts">
import type { SplitTaskSummary } from '#shared/types/api'

defineProps<{
  reason: string
  tasks: SplitTaskSummary[]
}>()

const emit = defineEmits<{
  accept: []
  decline: []
}>()
</script>

<template>
  <div class="w-full max-w-2xl rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
    <div class="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
      <UIcon name="i-lucide-split" class="size-4" />
      Split into {{ tasks.length }} tickets?
    </div>
    <p class="mt-1 text-xs text-(--text-secondary)">
      {{ reason }}
    </p>

    <div class="mt-3 space-y-1.5">
      <div
        v-for="(task, i) in tasks"
        :key="i"
        class="flex items-start gap-2 rounded-md bg-(--surface-elevated) px-3 py-2"
      >
        <IssueTypeBadge :issue-type="task.issueType" />
        <div class="min-w-0 flex-1">
          <p class="text-xs font-medium text-(--text-primary)">
            {{ task.title }}
          </p>
          <p class="text-[11px] text-(--text-muted)">
            {{ task.reason }}
          </p>
        </div>
      </div>
    </div>

    <div class="mt-3 flex gap-2">
      <UButton size="xs" color="primary" @click="emit('accept')">
        Split them
      </UButton>
      <UButton size="xs" color="neutral" variant="ghost" @click="emit('decline')">
        Keep as one
      </UButton>
    </div>
  </div>
</template>
