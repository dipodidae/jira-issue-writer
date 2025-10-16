<script setup lang="ts">
const props = defineProps<{
  prompt: string
  loading?: boolean
}>()

const emit = defineEmits<{ submit: [clarification: string] }>()

const open = defineModel<boolean>('open', { default: false })

const userClarification = ref('')

watch(() => open.value, (isOpen) => {
  if (isOpen)
    userClarification.value = ''
})

const trimmedClarification = computed(() => userClarification.value.trim())
const submitDisabled = computed(() => props.loading || trimmedClarification.value.length === 0)

function handleSubmit() {
  if (submitDisabled.value)
    return

  emit('submit', trimmedClarification.value)
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="More Details Needed"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <div class="space-y-4">
        <p class="text-muted text-sm">
          {{ props.prompt }}
        </p>
        <UTextarea
          v-model="userClarification"
          placeholder="Add clarifying details here..."
          :rows="5"
          autofocus
          class="w-full"
        />
      </div>
    </template>

    <template #footer="{ close }">
      <div class="flex items-center gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          :disabled="props.loading"
          @click="close"
        />
        <UButton
          label="Send Clarification"
          :loading="props.loading"
          :disabled="submitDisabled"
          @click="handleSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
