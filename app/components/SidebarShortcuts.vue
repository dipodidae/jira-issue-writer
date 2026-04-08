<script setup lang="ts">
const shortcuts = [
  { keys: ['Enter'], action: 'Send' },
  { keys: ['Shift', 'Enter'], action: 'New line' },
]
</script>

<template>
  <div>
    <span class="mb-1.5 block text-[11px] font-medium tracking-wider text-(--text-muted) uppercase">Keys</span>
    <div class="space-y-1.5">
      <div v-for="s in shortcuts" :key="s.action" class="flex items-center justify-between">
        <span class="text-[11px] text-(--text-muted)">{{ s.action }}</span>
        <div class="flex items-center gap-0.5">
          <kbd
            v-for="key in s.keys"
            :key="key"
            class="inline-flex items-center justify-center rounded border border-(--border-default) bg-(--surface-elevated) px-1.5 py-0.5 font-mono text-[10px] text-(--text-muted) shadow-[0_1px_0_0_rgba(0,0,0,0.05),inset_0_-1px_0_0_rgba(0,0,0,0.05)]"
          >{{ key }}</kbd>
        </div>
      </div>
    </div>
  </div>
</template>
