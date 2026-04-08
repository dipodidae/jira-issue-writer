<script setup lang="ts">
import type { ConversationMessage } from '#shared/types/api'

const props = defineProps<{
  message: ConversationMessage
}>()

defineEmits<{
  acceptSplit: [tasks: any[]]
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
      class="max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm" :class="[
        isUser
          ? 'bg-primary-500 text-white'
          : message.kind === 'error'
            ? 'border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300'
            : 'border border-(--border-default) bg-(--surface-elevated) text-(--text-primary)',
      ]"
    >
      <p class="leading-relaxed whitespace-pre-wrap">
        {{ message.content }}
      </p>
    </div>

    <div v-if="message.kind === 'clarification' && message.reason" class="max-w-[85%] rounded-lg border border-amber-500/20 bg-amber-500/10 px-3.5 py-2 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
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

    <span class="px-1 text-[10px] text-(--text-muted)">{{ timestamp }}</span>
  </div>
</template>
