<script setup lang="ts">
const {
  composerHint,
  composerPlaceholder,
  draftInput,
  errorMessage,
  hasMessages,
  isPending,
  messages,
  submitCurrentMessage,
} = useConversation()
</script>

<template>
  <section class="grid grid-rows-[1fr_auto] overflow-hidden">
    <ChatThread :messages="messages" :pending="isPending" class="min-h-0 overflow-y-auto" />

    <div class="mx-auto w-full max-w-3xl shrink-0">
      <div v-if="errorMessage && hasMessages" class="px-5 pb-2">
        <UAlert color="error" variant="subtle" :title="errorMessage" icon="i-lucide-alert-circle" />
      </div>

      <ChatInputBar
        v-model="draftInput"
        :pending="isPending"
        :placeholder="composerPlaceholder"
        :hint="composerHint"
        @submit="submitCurrentMessage"
      />
    </div>
  </section>
</template>
