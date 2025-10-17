<script setup lang="ts">
import { appName } from '~/constants'
</script>

<template>
  <UHeader>
    <template #left>
      <UButton icon="fa6-solid:wand-magic" variant="link" size="xl">
        {{ appName }}
      </UButton>
    </template>
    <template #right>
      <div class="flex items-center gap-3">
        <UColorModeButton />
      </div>
    </template>
  </UHeader>
</template>
