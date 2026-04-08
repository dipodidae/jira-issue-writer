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
        class="group hover:border-primary-500/30 flex flex-col items-start gap-0.5 rounded-md border border-(--border-default) bg-(--surface-elevated) px-2.5 py-2 text-left transition-all duration-150 hover:translate-y-[-1px] hover:shadow-[0_2px_8px_rgba(94,106,210,0.1)]"
        @click="emit('select', t.text)"
      >
        <div class="flex items-center gap-1.5">
          <UIcon :name="t.icon" class="text-primary-500/60 group-hover:text-primary-500 size-3 shrink-0 transition-colors" />
          <span class="text-xs font-medium text-(--text-secondary) group-hover:text-(--text-primary)">{{ t.label }}</span>
        </div>
        <span class="text-[10px] text-(--text-muted)">{{ t.sub }}</span>
      </button>
    </div>
  </div>
</template>
