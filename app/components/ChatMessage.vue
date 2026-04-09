<script setup lang="ts">
import type { ConversationMessage, SplitTaskSummary } from '#shared/types/api'

const props = defineProps<{
  message: ConversationMessage
}>()

defineEmits<{
  acceptSplit: [tasks: SplitTaskSummary[]]
  declineSplit: []
}>()

const isUser = computed(() => props.message.role === 'user')

const timestamp = computed(() => {
  return new Date(props.message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
})
</script>

<template>
  <div class="flex flex-col gap-1" :class="[isUser ? 'items-end' : 'items-start']">
    <div
      v-if="message.kind !== 'draft' && message.kind !== 'suggest_split'"
      class="max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed" :class="[
        isUser
          ? 'bg-primary-500 text-white shadow-[0_1px_3px_rgba(94,106,210,0.3)]'
          : message.kind === 'error'
            ? 'border border-red-500/15 bg-red-500/5 text-red-700 dark:text-red-300'
            : 'border border-(--border-default) bg-(--surface-translucent) text-(--text-primary)',
      ]"
      :style="!isUser && message.kind !== 'error' ? { boxShadow: 'var(--shadow-card)' } : undefined"
    >
      <img v-if="message.imageUrl" :src="message.imageUrl" alt="Attached image" class="mb-2 max-h-48 rounded-lg object-contain">
      <p class="whitespace-pre-wrap">
        {{ message.content }}
      </p>
    </div>

    <div v-if="message.kind === 'clarification' && message.reason" class="max-w-[85%] rounded-xl border border-amber-500/15 bg-amber-500/5 px-3.5 py-2 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
      {{ message.reason }}
    </div>

    <ChatSplitSuggestion
      v-if="message.kind === 'suggest_split' && message.proposedTasks?.length"
      :reason="message.content"
      :tasks="message.proposedTasks"
      @accept="$emit('acceptSplit', message.proposedTasks)"
      @decline="$emit('declineSplit')"
    />

    <ChatDraftCard v-if="message.kind === 'draft' && message.draft" :draft="message.draft" :is-current="message.isCurrentDraft" class="max-w-3xl" />

    <span class="px-1 text-[10px] text-(--text-quaternary) tabular-nums">{{ timestamp }}</span>
  </div>
</template>
