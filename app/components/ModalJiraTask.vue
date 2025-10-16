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
  <UModal v-model:open="open" title="Jira Task Generated" :ui="{ footer: 'justify-end' }">
    <template #body>
      <div class="space-y-4">
        <div>
          <h3 class="text-highlighted mb-2 text-sm font-semibold">
            Issue Type
          </h3>
          <IssueTypeBadge :issue-type="data.issueType" />
        </div>
        <div>
          <h3 class="text-highlighted mb-2 text-sm font-semibold">
            Title
          </h3>
          <UInput :model-value="data.title" readonly :ui="{ trailing: 'pr-0.5' }" class="w-full">
            <template #trailing>
              <ButtonCopy :value="data.title" />
            </template>
          </UInput>
        </div>
        <div v-if="data.priority || data.severity || data.estimate || (data.dataSensitivity && data.dataSensitivity !== 'none')">
          <h3 class="text-highlighted mb-2 text-sm font-semibold">
            Meta
          </h3>
          <div class="flex flex-wrap gap-2 text-xs">
            <span v-if="data.priority" class="bg-primary/10 rounded px-2 py-1">Priority: {{ data.priority }}</span>
            <span v-if="data.severity" class="bg-error/10 rounded px-2 py-1">Severity: {{ data.severity }}</span>
            <span v-if="data.estimate" class="bg-info/10 rounded px-2 py-1">Estimate: {{ data.estimate }}</span>
            <span v-if="data.multiItem" class="bg-warning/10 rounded px-2 py-1">Multi-item</span>
            <span v-if="data.dataSensitivity && data.dataSensitivity !== 'none'" class="bg-warning/20 rounded px-2 py-1">Data: {{ data.dataSensitivity }}</span>
          </div>
        </div>
        <div v-if="data.labels?.length">
          <h3 class="text-highlighted mb-2 text-sm font-semibold">
            Labels
          </h3>
          <div class="flex flex-wrap gap-1">
            <span v-for="l in data.labels" :key="l" class="bg-neutral/10 rounded px-2 py-0.5 text-xs">{{ l }}</span>
          </div>
        </div>
        <div v-if="data.components?.length">
          <h3 class="text-highlighted mb-2 text-sm font-semibold">
            Components
          </h3>
          <div class="flex flex-wrap gap-1">
            <span v-for="c in data.components" :key="c" class="bg-secondary/10 rounded px-2 py-0.5 text-xs">{{ c }}</span>
          </div>
        </div>
        <div v-if="data.riskAreas?.length">
          <h3 class="text-highlighted mb-2 text-sm font-semibold">
            Risk Areas
          </h3>
          <div class="flex flex-wrap gap-1">
            <span v-for="r in data.riskAreas" :key="r" class="bg-error/10 rounded px-2 py-0.5 text-xs">{{ r }}</span>
          </div>
        </div>
        <div>
          <h3 class="text-highlighted mb-2 text-sm font-semibold">
            Description
          </h3>
          <MarkdownContentPreview :markdown="data.description" />
        </div>
        <div v-if="data.acceptanceCriteria?.length" class="mt-2">
          <h3 class="text-highlighted mb-2 text-sm font-semibold">
            Acceptance Criteria (Structured)
          </h3>
          <ul class="list-disc space-y-1 pl-5 text-xs">
            <li v-for="ac in data.acceptanceCriteria" :key="ac">
              {{ ac }}
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
