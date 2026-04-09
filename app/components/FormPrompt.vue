<script setup lang="ts">
const {
  composerHint,
  composerPlaceholder,
  draftInput,
  errorMessage,
  hasMessages,
  isPending,
  pendingImage,
  messages,
  submitCurrentMessage,
} = useConversation()
</script>

<template>
  <section class="grid grid-rows-[1fr_auto] overflow-hidden">
    <ChatThread :messages="messages" :pending="isPending" class="min-h-0 overflow-y-auto" />

    <div class="mx-auto w-full max-w-3xl shrink-0">
      <div v-if="errorMessage && hasMessages" class="px-5 pb-2">
        <div class="flex items-center gap-2.5 rounded-xl border border-red-500/15 bg-red-500/5 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">
          <UIcon name="i-lucide-alert-circle" class="size-4 shrink-0" />
          <span class="flex-1">{{ errorMessage }}</span>
        </div>
      </div>

      <ChatInputBar
        v-model="draftInput"
        v-model:image="pendingImage"
        :pending="isPending"
        :placeholder="composerPlaceholder"
        :hint="composerHint"
        @submit="submitCurrentMessage"
      />
    </div>
  </section>
</template>
