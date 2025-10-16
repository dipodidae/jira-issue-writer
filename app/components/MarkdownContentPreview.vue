<script setup lang="ts">
import { parseMarkdown } from '@nuxtjs/mdc/runtime'
import MDCRenderer from '@nuxtjs/mdc/runtime/components/MDCRenderer.vue'
import { renderToString } from 'vue/server-renderer'

const props = defineProps<{
  markdown: string
}>()

const convertedMarkup = computedAsync(async () => {
  const ast = await parseMarkdown(props.markdown)
  const html = await renderToString(
    h(MDCRenderer, { body: ast.body, data: ast.data }),
  )
  return html
}, '')
</script>

<template>
  <div>
    <ButtonCopy :value="convertedMarkup" />
    <MDC :value="props.markdown" tag="article" class="rounded-md border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-600 dark:bg-neutral-800" />
  </div>
</template>
