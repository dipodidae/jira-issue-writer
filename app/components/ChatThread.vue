<script setup lang="ts">
import type { ConversationMessage } from '#shared/types/api'

const props = defineProps<{
  messages: ConversationMessage[]
  pending?: boolean
}>()

const threadRef = ref<HTMLDivElement | null>(null)

watch(
  () => [props.messages.length, props.pending],
  async () => {
    await nextTick()
    threadRef.value?.scrollTo({
      top: threadRef.value.scrollHeight,
      behavior: 'smooth',
    })
  },
  { flush: 'post' },
)
</script>

<template>
  <div ref="threadRef" class="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-6">
    <template v-if="messages.length">
      <ChatMessage v-for="message in messages" :key="message.id" :message="message" />

      <div v-if="pending" class="flex items-start gap-3">
        <div class="rounded-2xl border border-(--border-subtle) bg-(--surface-elevated) px-4 py-3 text-sm text-(--text-secondary) shadow-sm">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-loader-circle" class="text-primary-500 size-4 animate-spin" />
            Drafting the next response...
          </div>
        </div>
      </div>
    </template>

    <div v-else class="grid flex-1 place-items-center py-6">
      <div class="to-primary-500/5 max-w-2xl rounded-3xl border border-dashed border-(--border-default) bg-linear-to-br from-(--surface-panel) via-(--surface-panel) p-8 text-center shadow-sm">
        <div class="bg-primary-500/10 text-primary-500 mx-auto flex size-12 items-center justify-center rounded-2xl">
          <UIcon name="i-lucide-messages-square" class="size-6" />
        </div>
        <h2 class="mt-4 text-2xl font-semibold text-(--text-primary)">
          Draft tickets as a conversation
        </h2>
        <p class="mt-3 text-sm leading-relaxed text-(--text-secondary)">
          Start with raw context. The assistant will ask for clarification when needed, then keep the latest Jira draft inline so you can refine it with follow-up messages.
        </p>
        <div class="mt-6 flex flex-wrap justify-center gap-2 text-xs text-(--text-secondary)">
          <span class="rounded-full bg-(--surface-elevated) px-3 py-1">Paste rough notes</span>
          <span class="rounded-full bg-(--surface-elevated) px-3 py-1">Answer clarifications</span>
          <span class="rounded-full bg-(--surface-elevated) px-3 py-1">Refine the ticket</span>
        </div>
      </div>
    </div>
  </div>
</template>
