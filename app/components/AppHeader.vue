<script setup lang="ts">
import { appName } from '~/constants'
</script>

<template>
  <header class="z-50 border-b border-(--border-subtle) bg-(--surface-panel)">
    <div class="flex h-11 items-center justify-between px-4">
      <div class="flex items-center gap-2">
        <div class="bg-primary-500/10 relative flex size-6 items-center justify-center rounded-md">
          <div class="bg-primary-500/20 absolute inset-0 animate-pulse rounded-md blur-sm" />
          <UIcon name="i-lucide-sparkles" class="text-primary-500 relative size-3.5" />
        </div>
        <span class="text-sm font-semibold tracking-[-0.03em] text-(--text-primary)">{{ appName }}</span>
      </div>
      <UColorModeButton variant="ghost" size="xs" />
    </div>
  </header>
</template>
