<script setup lang="ts">
const props = defineProps<{
  value: string
  richSource?: HTMLElement | null
}>()

const copied = ref(false)

async function copyContent() {
  try {
    const el = props.richSource?.$el ?? props.richSource
    if (el instanceof HTMLElement) {
      const html = el.innerHTML
      const plain = el.textContent || ''
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' }),
        }),
      ])
    }
    else {
      await navigator.clipboard.writeText(props.value)
    }
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
  catch {
    await navigator.clipboard.writeText(props.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  }
}
</script>

<template>
  <UTooltip text="Copy to clipboard" :content="{ side: 'right' }">
    <UButton
      :color="copied ? 'success' : 'neutral'"
      variant="link"
      size="sm"
      :icon="copied ? 'i-lucide-copy-check' : 'i-lucide-copy'"
      aria-label="Copy to clipboard"
      @click="copyContent"
    />
  </UTooltip>
</template>
