<script setup lang="ts">
const {
  canReset,
  isPending,
  resetConversation,
  selectedAgent,
  selectedScope,
  statusLabel,
} = useConversation()
</script>

<template>
  <div class="contents">
    <aside class="flex min-h-0 flex-col gap-6 overflow-y-auto border-r border-(--border-subtle) bg-(--surface-panel) px-4 py-5">
      <div>
        <div class="flex items-center gap-1.5 text-xs text-(--text-muted)">
          <span
            class="inline-flex size-1.5 rounded-full"
            :class="isPending ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'"
          />
          {{ statusLabel }}
        </div>
      </div>

      <div class="space-y-3">
        <div>
          <label class="mb-1 block text-[11px] font-medium tracking-wider text-(--text-muted) uppercase">Scope</label>
          <SelectScope v-model="selectedScope" class="w-full" />
        </div>
        <div>
          <label class="mb-1 block text-[11px] font-medium tracking-wider text-(--text-muted) uppercase">Model</label>
          <DropdownAgents v-model="selectedAgent" class="w-full" />
        </div>
      </div>

      <div class="mt-auto">
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
