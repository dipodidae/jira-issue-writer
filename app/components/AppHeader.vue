<script setup lang="ts">
import { appName } from '~/constants'
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-(--border-subtle) bg-(--surface-panel)/80 backdrop-blur-xl">
    <div class="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
      <div class="flex items-center gap-2.5">
        <div class="bg-primary-500/10 flex size-7 items-center justify-center rounded-lg">
          <UIcon name="i-lucide-sparkles" class="text-primary-500 size-4" />
        </div>
        <span class="text-sm font-semibold tracking-tight text-(--text-primary)">{{ appName }}</span>
      </div>
      <UColorModeButton variant="ghost" size="sm" />
    </div>
  </header>
</template>
