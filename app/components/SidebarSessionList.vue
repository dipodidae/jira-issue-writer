<script setup lang="ts">
import type { ConversationSession } from '~/stores/conversation'

defineProps<{
  sessions: ConversationSession[]
  activeId: string
}>()

const emit = defineEmits<{
  switch: [id: string]
  delete: [id: string]
}>()

function formatTime(ts: number) {
  const d = new Date(ts)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}
</script>

<template>
  <div v-if="sessions.length > 1">
    <span class="mb-1.5 block text-[11px] font-medium tracking-wider text-(--text-muted) uppercase">Conversations</span>
    <div class="space-y-0.5">
      <div
        v-for="session in sessions"
        :key="session.id"
        class="group flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs transition-all duration-150"
        :class="session.id === activeId
          ? 'bg-(--surface-elevated) text-(--text-primary) ring-1 ring-(--border-subtle)'
          : 'text-(--text-muted) hover:bg-(--surface-translucent) hover:text-(--text-secondary)'"
        @click="emit('switch', session.id)"
      >
        <span class="flex-1 truncate">{{ session.title }}</span>
        <span class="shrink-0 text-[10px] text-(--text-quaternary) tabular-nums">{{ formatTime(session.updatedAt) }}</span>
        <button
          v-if="sessions.length > 1"
          class="shrink-0 rounded p-0.5 opacity-0 transition-all group-hover:opacity-100 hover:bg-(--surface-elevated)"
          @click.stop="emit('delete', session.id)"
        >
          <UIcon name="i-lucide-x" class="size-3 text-(--text-muted) hover:text-(--text-primary)" />
        </button>
      </div>
    </div>
  </div>
</template>
