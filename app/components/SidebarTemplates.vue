<script setup lang="ts">
const emit = defineEmits<{
  select: [text: string]
}>()

const templates = [
  { label: 'Bug', icon: 'i-lucide-bug', text: 'Bug: \nExpected behavior: \nActual behavior: \nSteps to reproduce:\n1. ', sub: 'Something broke' },
  { label: 'Feature', icon: 'i-lucide-lightbulb', text: 'Feature request: \nAs a user, I want to ', sub: 'Something new' },
  { label: 'Tech debt', icon: 'i-lucide-wrench', text: 'Tech debt: \nCurrent state: \nDesired state: ', sub: 'Something ugly' },
  { label: 'Spike', icon: 'i-lucide-search', text: 'Spike: \nQuestion: \nContext: ', sub: 'Something unknown' },
]
</script>

<template>
  <div>
    <span class="mb-1.5 block text-[11px] font-medium tracking-wider text-(--text-muted) uppercase">Quick start</span>
    <div class="grid grid-cols-2 gap-1.5">
      <button
        v-for="t in templates"
        :key="t.label"
        class="group flex flex-col items-start gap-1 rounded-lg border border-(--border-subtle) bg-(--surface-translucent) px-2.5 py-2 text-left transition-all duration-150 hover:border-(--border-default) hover:bg-(--surface-elevated)"
        @click="emit('select', t.text)"
      >
        <div class="flex items-center gap-1.5">
          <UIcon :name="t.icon" class="group-hover:text-primary-500 size-3 shrink-0 text-(--text-muted) transition-colors" />
          <span class="text-xs font-medium text-(--text-secondary) group-hover:text-(--text-primary)">{{ t.label }}</span>
        </div>
        <span class="text-[10px] leading-snug text-(--text-quaternary)">{{ t.sub }}</span>
      </button>
    </div>
  </div>
</template>
