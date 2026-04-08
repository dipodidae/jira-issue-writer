<script setup lang="ts">
const {
  canReset,
  composerHint,
  composerPlaceholder,
  draftInput,
  errorMessage,
  hasMessages,
  isPending,
  messages,
  resetConversation,
  selectedAgent,
  selectedScope,
  statusLabel,
  submitCurrentMessage,
} = useConversation()
</script>

<template>
  <section class="flex min-h-[calc(100vh-14rem)] flex-col overflow-hidden rounded-[2rem] border border-(--border-default) bg-(--surface-panel) shadow-[0_20px_80px_rgba(0,0,0,0.08)]">
    <div class="from-primary-500/5 border-b border-(--border-subtle) bg-linear-to-r via-transparent to-violet-500/5 px-4 py-4 sm:px-6">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div class="flex items-center gap-2 text-xs font-medium tracking-[0.18em] text-(--text-muted) uppercase">
            <span class="bg-primary-500 inline-flex size-2 rounded-full" />
            {{ statusLabel }}
          </div>
          <h2 class="mt-2 text-xl font-semibold text-(--text-primary) sm:text-2xl">
            Ticket drafting conversation
          </h2>
          <p class="mt-1 max-w-2xl text-sm leading-relaxed text-(--text-secondary)">
            Start with rough context, answer clarifications inline, then keep refining the current Jira draft without losing the thread.
          </p>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SelectScope v-model="selectedScope" />
          <DropdownAgents v-model="selectedAgent" />
          <UButton
            color="neutral"
            variant="soft"
            icon="i-lucide-rotate-ccw"
            :disabled="!canReset || isPending"
            @click="resetConversation"
          >
            New draft
          </UButton>
        </div>
      </div>
    </div>

    <ChatThread :messages="messages" :pending="isPending" />

    <div v-if="errorMessage && hasMessages" class="px-4 pb-4 sm:px-6">
      <UAlert color="error" variant="subtle" :title="errorMessage" icon="i-lucide-alert-circle" />
    </div>

    <ChatInputBar
      v-model="draftInput"
      :pending="isPending"
      :placeholder="composerPlaceholder"
      :hint="composerHint"
      @submit="submitCurrentMessage"
    />
  </section>
</template>
