<script setup lang="ts">
const props = defineProps<{
  markdown: string
}>()

const articleRef = useTemplateRef('articleRef')
</script>

<template>
  <div class="relative">
    <ButtonCopy :value="props.markdown" :rich-source="articleRef" class="absolute top-3 right-3 z-10" />
    <MDC
      ref="articleRef"
      :value="props.markdown"
      tag="article"
      class="prose prose-sm dark:prose-invert relative z-0 max-w-none rounded-lg border border-(--border-subtle) bg-(--surface-elevated) p-4"
      style="box-shadow: var(--shadow-card)"
    />
  </div>
</template>
