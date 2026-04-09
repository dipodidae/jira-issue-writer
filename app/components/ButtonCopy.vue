<script setup lang="ts">
interface RichSourceElement {
  $el?: HTMLElement | null
}

const props = defineProps<{
  value: string
  richSource?: HTMLElement | RichSourceElement | null
}>()

const copied = shallowRef(false)

async function copyContent() {
  try {
    const el = props.richSource instanceof HTMLElement
      ? props.richSource
      : props.richSource?.$el ?? null
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
