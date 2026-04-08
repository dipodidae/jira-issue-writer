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
const isFocused = ref(false)

const submitDisabled = computed(() => props.pending || props.disabled || model.value.trim().length === 0)

function handleSubmit() {
  if (submitDisabled.value)
    return

  emit('submit')
}

const handleKeydown = useSubmitOnEnter(() => handleSubmit())
</script>

<template>
  <div class="border-t border-(--border-subtle) bg-(--surface-panel) px-5 py-2.5">
    <div
      class="flex items-center gap-2 rounded-md border bg-(--surface-page) py-1 pr-1 pl-3 transition-all duration-200"
      :class="isFocused ? 'border-primary-500/40 shadow-[0_0_12px_rgba(94,106,210,0.12)]' : 'border-(--border-default)'"
    >
      <UTextarea
        v-model="model"
        :rows="1"
        autoresize
        :placeholder="placeholder"
        class="min-h-0 flex-1"
        :ui="{
          base: 'max-h-32 border-transparent bg-transparent text-sm leading-snug text-(--text-primary) placeholder:text-(--text-muted) focus:ring-0',
        }"
        @focus="isFocused = true"
        @blur="isFocused = false"
        @keydown="handleKeydown"
      />
      <UButton
        icon="i-lucide-arrow-up"
        size="xs"
        :loading="pending"
        :disabled="submitDisabled"
        class="shrink-0 self-end"
        @click="handleSubmit"
      />
    </div>
    <span class="mt-1 block text-[11px] text-(--text-muted)">{{ hint }}</span>
  </div>
</template>
