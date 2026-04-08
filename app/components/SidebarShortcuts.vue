<script setup lang="ts">
const shortcuts = [
  { keys: 'Enter', action: 'Send message' },
  { keys: 'Shift + Enter', action: 'New line' },
]
</script>

<template>
  <div>
    <span class="mb-1.5 block text-[11px] font-medium tracking-wider text-(--text-muted) uppercase">Shortcuts</span>
    <div class="space-y-1">
      <div v-for="s in shortcuts" :key="s.keys" class="flex items-center justify-between text-[11px]">
        <span class="text-(--text-muted)">{{ s.action }}</span>
        <kbd class="rounded border border-(--border-default) bg-(--surface-elevated) px-1.5 py-0.5 font-mono text-[10px] text-(--text-muted)">{{ s.keys }}</kbd>
      </div>
    </div>
  </div>
</template>
