<script setup lang="ts">
const props = defineProps<{
  markdown: string
}>()
</script>

<template>
  <div class="relative">
    <ButtonCopy :value="props.markdown" class="absolute top-3 right-3 z-10" />
    <MDC
      :value="props.markdown"
      tag="article"
      class="prose prose-sm dark:prose-invert relative z-0 max-w-none rounded-lg border border-(--border-subtle) bg-(--surface-elevated) p-4"
    />
  </div>
</template>
