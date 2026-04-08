<script setup lang="ts">
const props = defineProps<{
  pending?: boolean
  disabled?: boolean
  placeholder?: string
  hint?: string
}>()

const emit = defineEmits<{
  submit: []
}>()

const model = defineModel<string>({ default: '' })

const submitDisabled = computed(() => props.pending || props.disabled || model.value.trim().length === 0)

function handleSubmit() {
  if (submitDisabled.value)
    return

  emit('submit')
}

const handleKeydown = useSubmitOnEnter(() => handleSubmit())
</script>

<template>
  <div class="border-t border-(--border-subtle) bg-(--surface-panel)/90 p-4 backdrop-blur-xl sm:p-5">
    <div class="rounded-3xl border border-(--border-default) bg-(--surface-page) p-3 shadow-sm">
      <UTextarea
        v-model="model"
        :rows="2"
        autoresize
        :placeholder="placeholder"
        class="w-full"
        :ui="{
          base: 'min-h-18 rounded-2xl border-transparent bg-transparent text-(--text-primary) placeholder:text-(--text-muted) focus:ring-0',
        }"
        @keydown="handleKeydown"
      />

      <div class="mt-3 flex items-center justify-between gap-3">
        <span class="text-xs text-(--text-muted)">{{ hint }}</span>
        <UButton
          icon="i-lucide-send"
          size="md"
          :loading="pending"
          :disabled="submitDisabled"
          @click="handleSubmit"
        >
          Send
        </UButton>
      </div>
    </div>
  </div>
</template>
