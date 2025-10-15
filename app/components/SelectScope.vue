<script setup lang="ts">
const items = ['proactive-frame', 'ui', 'api', 'ux']
const value = defineModel<string[]>({ default: () => ['ui'] })
</script>

<template>
  <USelect v-model="value" multiple :items="items" class="w-48" />
</template>
