<script setup lang="ts">
const props = defineProps<{
  markdown: string
}>()
</script>

<template>
  <div class="relative">
    <ButtonCopy :value="props.markdown" class="absolute top-4 right-4 z-10" />
    <MDC :value="props.markdown" tag="article" class="relative z-0 rounded-md border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-600 dark:bg-neutral-800" />
  </div>
</template>
