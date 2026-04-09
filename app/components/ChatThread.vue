<script setup lang="ts">
import type { ConversationMessage } from '#shared/types/api'

const props = defineProps<{
  messages: ConversationMessage[]
  pending?: boolean
}>()

const threadRef = useTemplateRef<HTMLDivElement>('threadRef')

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

const emptyStateMessages = [
  { heading: 'What broke this time?', sub: 'Paste the chaos, we\'ll shape the ticket.' },
  { heading: 'Ticket-shaped thoughts go here', sub: 'Raw notes in, structured Jira out.' },
  { heading: 'Tell me about the problem', sub: 'Be as vague as you want. I\'ll ask questions.' },
  { heading: 'No ticket template needed', sub: 'Just describe it. We\'ll figure out the fields.' },
  { heading: 'Ready when you are', sub: 'Bug, feature, existential crisis — all welcome.' },
]

const loadingPhrases = [
  'Thinking really hard...',
  'Consulting the ticket oracle...',
  'Brewing your Jira issue...',
  'Turning vibes into acceptance criteria...',
  'Extracting signal from noise...',
  'Almost there, probably...',
]

const emptyState = computed(() => emptyStateMessages[Math.floor(Date.now() / 60000) % emptyStateMessages.length]!)
const loadingPhrase = computed(() => loadingPhrases[Math.floor(Date.now() / 4000) % loadingPhrases.length]!)
</script>

<template>
  <div ref="threadRef" class="overflow-y-auto">
    <div class="mx-auto flex w-full max-w-3xl flex-col gap-3 px-5 py-4">
      <template v-if="messages.length">
        <ChatMessage v-for="message in messages" :key="message.id" :message="message" />

        <div v-if="pending" class="flex items-start">
          <div class="rounded-md border border-(--border-default) bg-(--surface-elevated) px-3 py-2 text-sm text-(--text-secondary)">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-loader-circle" class="text-primary-500 size-3.5 animate-spin" />
              {{ loadingPhrase }}
            </div>
          </div>
        </div>
      </template>

      <div v-else class="grid flex-1 place-items-center">
        <div class="text-center">
          <div class="bg-primary-500/8 text-primary-500 mx-auto flex size-12 items-center justify-center rounded-2xl">
            <UIcon name="i-lucide-messages-square" class="size-6" />
          </div>
          <p class="mt-3 text-base font-semibold tracking-tight text-(--text-primary)">
            {{ emptyState.heading }}
          </p>
          <p class="mt-1 text-xs text-(--text-muted)">
            {{ emptyState.sub }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
