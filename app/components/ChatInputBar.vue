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
  <div class="px-5 py-3">
    <div class="flex items-end gap-2">
      <UTextarea
        v-model="model"
        :rows="1"
        autoresize
        :placeholder="placeholder"
        class="min-h-0 flex-1"
        :ui="{
          base: 'max-h-32 rounded-lg border border-(--border-default) bg-(--surface-elevated) px-3 py-2 text-sm leading-snug text-(--text-primary) placeholder:text-(--text-muted) focus:border-primary-500/40 focus:ring-0 transition-colors',
        }"
        @keydown="handleKeydown"
      />
      <UButton
        icon="i-lucide-arrow-up"
        size="xs"
        :loading="pending"
        :disabled="submitDisabled"
        class="shrink-0"
        @click="handleSubmit"
      />
    </div>
    <span class="mt-1 block text-[11px] text-(--text-muted)">{{ hint }}</span>
  </div>
</template>
