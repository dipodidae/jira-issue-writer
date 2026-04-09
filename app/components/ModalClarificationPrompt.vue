<script setup lang="ts">
const props = defineProps<{
  prompt: string
  loading?: boolean
}>()

const emit = defineEmits<{ submit: [clarification: string] }>()

const open = defineModel<boolean>('open', { default: false })

const userClarification = shallowRef('')

watch(() => open.value, (isOpen) => {
  if (isOpen)
    userClarification.value = ''
})

const trimmedClarification = computed(() => userClarification.value.trim())
const submitDisabled = computed(() => props.loading || trimmedClarification.value.length === 0)

function submitUnknown() {
  if (props.loading)
    return

  emit('submit', 'I don\'t know / can\'t reproduce reliably')
}

function handleSubmit() {
  if (submitDisabled.value)
    return

  emit('submit', trimmedClarification.value)
}

const handleClarificationKeydown = useSubmitOnEnter(() => handleSubmit())
</script>

<template>
  <UModal
    v-model:open="open"
    :ui="{ footer: 'justify-end' }"
  >
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-message-circle-question" class="text-primary-500 size-5" />
        <span class="text-sm font-medium">More Details Needed</span>
      </div>
    </template>

    <template #body>
      <div class="space-y-4">
        <p class="text-sm leading-relaxed text-(--text-secondary)">
          {{ props.prompt }}
        </p>
        <UTextarea
          v-model="userClarification"
          placeholder="Add clarifying details here..."
          :rows="5"
          autofocus
          class="w-full"
          @keydown="handleClarificationKeydown"
        />
      </div>
    </template>

    <template #footer="{ close }">
      <div class="flex items-center gap-2">
        <UButton
          label="I don't know"
          color="neutral"
          variant="soft"
          :disabled="props.loading"
          @click="submitUnknown"
        />
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          :disabled="props.loading"
          @click="close"
        />
        <UButton
          label="Send"
          icon="i-lucide-send"
          :loading="props.loading"
          :disabled="submitDisabled"
          @click="handleSubmit"
        />
      </div>
    </template>
  </UModal>
</template>
