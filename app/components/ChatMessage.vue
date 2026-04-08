<script setup lang="ts">
import type { ConversationMessage } from '#shared/types/api'

const props = defineProps<{
  message: ConversationMessage
}>()

const isUser = computed(() => props.message.role === 'user')

const timestamp = computed(() => {
  return new Date(props.message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
})

const speakerLabel = computed(() => (isUser.value ? 'You' : 'Assistant'))
</script>

<template>
  <div class="flex flex-col gap-2" :class="[isUser ? 'items-end' : 'items-start']">
    <div
      v-if="message.kind !== 'draft'"
      class="max-w-[90%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[80%]" :class="[
        isUser
          ? 'bg-primary-500 text-white'
          : message.kind === 'error'
            ? 'border border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300'
            : 'border border-(--border-subtle) bg-(--surface-elevated) text-(--text-primary)',
      ]"
    >
      <p class="text-sm leading-relaxed whitespace-pre-wrap">
        {{ message.content }}
      </p>
    </div>

    <div v-if="message.kind === 'clarification' && message.reason" class="max-w-[90%] rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs leading-relaxed text-amber-700 sm:max-w-[80%] dark:text-amber-300">
      {{ message.reason }}
    </div>

    <ChatDraftCard v-if="message.kind === 'draft' && message.draft" :draft="message.draft" :is-current="message.isCurrentDraft" class="max-w-4xl" />

    <span class="px-1 text-[11px] text-(--text-muted)">{{ speakerLabel }} • {{ timestamp }}</span>
  </div>
</template>
