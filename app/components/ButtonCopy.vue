<script setup lang="ts">
import { useClipboard } from '@vueuse/core'

defineProps<{
  value: string
}>()

const { copy, copied } = useClipboard()
</script>

<template>
  <UTooltip text="Copy to clipboard" :content="{ side: 'right' }">
    <UButton
      :color="copied ? 'success' : 'neutral'"
      variant="link"
      size="sm"
      :icon="copied ? 'i-lucide-copy-check' : 'i-lucide-copy'"
      aria-label="Copy to clipboard"
      @click="copy(value)"
    />
  </UTooltip>
</template>
