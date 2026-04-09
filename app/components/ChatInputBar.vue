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
const image = defineModel<string | null>('image', { default: null })

const submitDisabled = computed(() => props.pending || props.disabled || (model.value.trim().length === 0 && !image.value))

function handleSubmit() {
  if (submitDisabled.value)
    return

  emit('submit')
}

const handleKeydown = useSubmitOnEnter(() => handleSubmit())

function handlePaste(event: ClipboardEvent) {
  const items = event.clipboardData?.items
  if (!items)
    return

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      event.preventDefault()
      const file = item.getAsFile()
      if (!file)
        return

      const reader = new FileReader()
      reader.onload = () => {
        image.value = reader.result as string
      }
      reader.readAsDataURL(file)
      return
    }
  }
}
</script>

<template>
  <div class="compose-glow px-5 py-3">
    <div v-if="image" class="mb-2.5 inline-flex items-start gap-1.5 rounded-xl border border-(--border-default) bg-(--surface-translucent) p-2" style="box-shadow: var(--shadow-card)">
      <img :src="image" alt="Pasted image" class="max-h-28 rounded-lg object-contain">
      <button
        class="rounded-md p-1 text-(--text-muted) transition-colors hover:bg-(--surface-elevated) hover:text-(--text-primary)"
        @click="image = null"
      >
        <UIcon name="i-lucide-x" class="size-3.5" />
      </button>
    </div>

    <div class="flex items-end gap-2.5">
      <UTextarea
        v-model="model"
        :rows="1"
        autoresize
        :placeholder="placeholder"
        class="min-h-0 flex-1"
        :ui="{
          base: 'max-h-32 rounded-xl border border-(--border-default) bg-(--surface-translucent) px-3.5 py-2.5 text-sm leading-relaxed text-(--text-primary) placeholder:text-(--text-muted) focus:border-primary-500/30 focus:ring-1 focus:ring-primary-500/20 transition-all',
        }"
        @keydown="handleKeydown"
        @paste="handlePaste"
      />
      <UButton
        icon="i-lucide-arrow-up"
        size="xs"
        :loading="pending"
        :disabled="submitDisabled"
        class="shrink-0 rounded-lg"
        @click="handleSubmit"
      />
    </div>
    <span class="mt-1.5 block text-[11px] text-(--text-quaternary)">{{ hint }}</span>
  </div>
</template>
