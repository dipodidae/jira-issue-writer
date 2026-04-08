<script setup lang="ts">
import type { IssueType } from '#shared/types/api'

interface EnrichedFields {
  priority?: string | null
  severity?: string | null
  labels?: string[]
  components?: string[]
  riskAreas?: string[]
  dataSensitivity?: string
  acceptanceCriteria?: string[]
  estimate?: string | null
  multiItem?: boolean
}

interface GeneratedTask extends EnrichedFields {
  title: string
  description: string
  issueType: IssueType
}

defineProps<{ data: GeneratedTask }>()

const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <UModal v-model:open="open" :ui="{ footer: 'justify-end', content: 'sm:max-w-2xl' }">
    <template #header>
      <div class="flex items-center gap-3">
        <IssueTypeBadge :issue-type="data.issueType" />
        <span class="text-sm font-medium text-(--text-primary)">Generated Ticket</span>
      </div>
    </template>

    <template #body>
      <div class="space-y-5">
        <!-- Title -->
        <div>
          <label class="mb-1.5 block text-xs font-medium tracking-wider text-(--text-muted) uppercase">Title</label>
          <div class="flex items-center gap-2 rounded-lg border border-(--border-subtle) bg-(--surface-elevated) px-3 py-2.5">
            <span class="flex-1 text-sm font-medium text-(--text-primary)">{{ data.title }}</span>
            <ButtonCopy :value="data.title" />
          </div>
        </div>

        <!-- Meta pills -->
        <div v-if="data.priority || data.severity || data.estimate || (data.dataSensitivity && data.dataSensitivity !== 'none')" class="flex flex-wrap gap-2">
          <span v-if="data.priority" class="bg-primary-500/10 text-primary-600 dark:text-primary-400 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium">
            <UIcon name="i-lucide-signal" class="size-3" />
            {{ data.priority }}
          </span>
          <span v-if="data.severity" class="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400">
            <UIcon name="i-lucide-alert-triangle" class="size-3" />
            {{ data.severity }}
          </span>
          <span v-if="data.estimate" class="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400">
            <UIcon name="i-lucide-clock" class="size-3" />
            {{ data.estimate }}
          </span>
          <span v-if="data.multiItem" class="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
            <UIcon name="i-lucide-layers" class="size-3" />
            Multi-item
          </span>
          <span v-if="data.dataSensitivity && data.dataSensitivity !== 'none'" class="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
            <UIcon name="i-lucide-shield" class="size-3" />
            {{ data.dataSensitivity }}
          </span>
        </div>

        <!-- Tags row: labels, components, risk areas -->
        <div v-if="data.labels?.length || data.components?.length || data.riskAreas?.length" class="space-y-3">
          <div v-if="data.labels?.length">
            <label class="mb-1.5 block text-xs font-medium tracking-wider text-(--text-muted) uppercase">Labels</label>
            <div class="flex flex-wrap gap-1.5">
              <span v-for="l in data.labels" :key="l" class="rounded-md bg-(--surface-elevated) px-2 py-0.5 text-xs text-(--text-secondary)">{{ l }}</span>
            </div>
          </div>
          <div v-if="data.components?.length">
            <label class="mb-1.5 block text-xs font-medium tracking-wider text-(--text-muted) uppercase">Components</label>
            <div class="flex flex-wrap gap-1.5">
              <span v-for="c in data.components" :key="c" class="rounded-md bg-violet-500/10 px-2 py-0.5 text-xs text-violet-600 dark:text-violet-400">{{ c }}</span>
            </div>
          </div>
          <div v-if="data.riskAreas?.length">
            <label class="mb-1.5 block text-xs font-medium tracking-wider text-(--text-muted) uppercase">Risk Areas</label>
            <div class="flex flex-wrap gap-1.5">
              <span v-for="r in data.riskAreas" :key="r" class="rounded-md bg-red-500/10 px-2 py-0.5 text-xs text-red-600 dark:text-red-400">{{ r }}</span>
            </div>
          </div>
        </div>

        <!-- Description -->
        <div>
          <label class="mb-1.5 block text-xs font-medium tracking-wider text-(--text-muted) uppercase">Description</label>
          <MarkdownContentPreview :markdown="data.description" />
        </div>

        <!-- Acceptance Criteria -->
        <div v-if="data.acceptanceCriteria?.length">
          <label class="mb-1.5 block text-xs font-medium tracking-wider text-(--text-muted) uppercase">Acceptance Criteria</label>
          <ul class="space-y-1.5 text-sm text-(--text-secondary)">
            <li v-for="ac in data.acceptanceCriteria" :key="ac" class="flex items-start gap-2">
              <UIcon name="i-lucide-check-circle-2" class="mt-0.5 size-4 shrink-0 text-emerald-500" />
              <span>{{ ac }}</span>
            </li>
          </ul>
        </div>
      </div>
    </template>

    <template #footer="{ close }">
      <UButton label="Close" color="neutral" variant="outline" @click="close" />
    </template>
  </UModal>
</template>
