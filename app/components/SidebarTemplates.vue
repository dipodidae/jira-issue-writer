<script setup lang="ts">
const emit = defineEmits<{
  select: [text: string]
}>()

const templates = [
  { label: 'Bug', icon: 'i-lucide-bug', text: 'Bug: \nExpected behavior: \nActual behavior: \nSteps to reproduce:\n1. ' },
  { label: 'Feature', icon: 'i-lucide-lightbulb', text: 'Feature request: \nAs a user, I want to ' },
  { label: 'Tech debt', icon: 'i-lucide-wrench', text: 'Tech debt: \nCurrent state: \nDesired state: ' },
  { label: 'Spike', icon: 'i-lucide-search', text: 'Spike: \nQuestion: \nContext: ' },
]
</script>

<template>
  <div>
    <span class="mb-1.5 block text-[11px] font-medium tracking-wider text-(--text-muted) uppercase">Templates</span>
    <div class="grid grid-cols-2 gap-1.5">
      <button
        v-for="t in templates"
        :key="t.label"
        class="flex items-center gap-1.5 rounded-md border border-(--border-default) bg-(--surface-elevated) px-2 py-1.5 text-left text-xs text-(--text-secondary) transition-colors hover:text-(--text-primary)"
        @click="emit('select', t.text)"
      >
        <UIcon :name="t.icon" class="size-3 shrink-0" />
        {{ t.label }}
      </button>
    </div>
  </div>
</template>
