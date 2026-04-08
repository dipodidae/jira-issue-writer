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
  <div ref="threadRef" class="flex flex-col gap-3 overflow-y-auto px-4 py-4">
    <template v-if="messages.length">
      <ChatMessage v-for="message in messages" :key="message.id" :message="message" />

      <div v-if="pending" class="flex items-start gap-3">
        <div class="rounded-xl border border-(--border-subtle) bg-(--surface-elevated) px-3 py-2 text-sm text-(--text-secondary) shadow-sm">
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-loader-circle" class="text-primary-500 size-3.5 animate-spin" />
            Thinking...
          </div>
        </div>
      </div>
    </template>

    <div v-else class="grid flex-1 place-items-center">
      <div class="text-center">
        <div class="bg-primary-500/10 text-primary-500 mx-auto flex size-10 items-center justify-center rounded-xl">
          <UIcon name="i-lucide-messages-square" class="size-5" />
        </div>
        <p class="mt-3 text-sm font-medium text-(--text-primary)">
          Describe your issue below
        </p>
        <p class="mt-1 text-xs text-(--text-muted)">
          Paste notes, answer follow-ups, refine until it's right.
        </p>
      </div>
    </div>
  </div>
</template>
