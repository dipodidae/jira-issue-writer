<script setup lang="ts">
const model = defineModel<string>({ default: '' })
const isExpanded = shallowRef(false)

const hasContent = computed(() => model.value.trim().length > 0)
const previewText = computed(() => {
  const text = model.value.trim()
  return text.length > 60 ? `${text.slice(0, 60)}...` : text
})
</script>

<template>
  <div>
    <button
      class="mb-1.5 flex w-full items-center gap-1 text-[11px] font-medium tracking-wider text-(--text-muted) uppercase"
      @click="isExpanded = !isExpanded"
    >
      <UIcon :name="isExpanded ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'" class="size-3" />
      Context
      <span v-if="hasContent && !isExpanded" class="ml-auto truncate text-[10px] font-normal tracking-normal text-(--text-muted) normal-case">{{ previewText }}</span>
    </button>

    <div v-if="isExpanded">
      <textarea
        v-model="model"
        rows="4"
        placeholder="Paste error logs, specs, or reference material..."
        class="w-full resize-none rounded-md border border-(--border-default) bg-(--surface-elevated) px-2.5 py-2 text-xs leading-relaxed text-(--text-primary) placeholder:text-(--text-muted) focus:border-(--border-default) focus:outline-none"
      />
      <span class="mt-0.5 block text-[10px] text-(--text-muted)">Sent as background context with every message.</span>
    </div>
  </div>
</template>
