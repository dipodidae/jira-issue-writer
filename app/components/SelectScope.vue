<script setup lang="ts">
import { SCOPE_DESCRIPTIONS } from '~/constants'

const items = [...SCOPE_DESCRIPTIONS.keys()]
const value = defineModel<string[]>({ default: () => ['ui'] })
</script>

<template>
  <USelect v-model="value" multiple :items="items" class="w-48" />
</template>
