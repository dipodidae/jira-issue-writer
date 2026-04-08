<script setup lang="ts">
const {
  activeSessionId,
  canReset,
  createSession,
  deleteSession,
  draftHistory,
  hasMessages,
  isPending,
  latestDraft,
  pinnedContext,
  selectedAgent,
  selectedScope,
  sessions,
  setInput,
  statusLabel,
  switchSession,
} = useConversation()

const isHydrated = ref(false)
onMounted(() => {
  isHydrated.value = true
})
</script>

<template>
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

    <SidebarTemplates v-if="isHydrated && !hasMessages" @select="setInput" />

    <SidebarPinnedContext v-model="pinnedContext" />

    <SidebarDraftSummary v-if="isHydrated && latestDraft" :draft="latestDraft" />

    <SidebarRecentDrafts v-if="isHydrated" :drafts="draftHistory" />

    <SidebarSessionList
      v-if="isHydrated"
      :sessions="sessions"
      :active-id="activeSessionId"
      @switch="switchSession"
      @delete="deleteSession"
    />

    <div class="mt-auto space-y-3">
      <SidebarShortcuts />
      <UButton
        color="neutral"
        variant="soft"
        icon="i-lucide-plus"
        size="sm"
        block
        :disabled="!canReset || isPending"
        @click="createSession"
      >
        New draft
      </UButton>
    </div>
  </aside>
</template>
