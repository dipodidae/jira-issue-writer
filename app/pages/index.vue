<script setup lang="ts">
const {
  canReset,
  draftHistory,
  draftInput,
  hasMessages,
  isPending,
  latestDraft,
  pinnedContext,
  resetConversation,
  selectedAgent,
  selectedScope,
  statusLabel,
} = useConversation()

function applyTemplate(text: string) {
  draftInput.value = text
}
</script>

<template>
  <div class="contents">
    <aside class="flex min-h-0 flex-col gap-4 overflow-y-auto border-r border-(--border-subtle) bg-(--surface-panel) px-3 py-4">
      <div class="flex items-center gap-1.5 text-xs text-(--text-muted)">
        <span
          class="inline-flex size-1.5 rounded-full"
          :class="isPending ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'"
        />
        {{ statusLabel }}
      </div>

      <div class="space-y-2.5">
        <div>
          <label class="mb-1 block text-[11px] font-medium tracking-wider text-(--text-muted) uppercase">Scope</label>
          <SelectScope v-model="selectedScope" class="w-full" />
        </div>
        <div>
          <label class="mb-1 block text-[11px] font-medium tracking-wider text-(--text-muted) uppercase">Model</label>
          <DropdownAgents v-model="selectedAgent" class="w-full" />
        </div>
      </div>

      <SidebarTemplates v-if="!hasMessages" @select="applyTemplate" />

      <SidebarPinnedContext v-model="pinnedContext" />

      <SidebarDraftSummary v-if="latestDraft" :draft="latestDraft" />

      <SidebarRecentDrafts :drafts="draftHistory" />

      <div class="mt-auto space-y-3">
        <SidebarShortcuts />
        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-rotate-ccw"
          size="sm"
          block
          :disabled="!canReset || isPending"
          @click="resetConversation"
        >
          New draft
        </UButton>
      </div>
    </aside>

    <FormPrompt class="min-h-0" />
  </div>
</template>
